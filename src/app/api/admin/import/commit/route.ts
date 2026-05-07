import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CommitOption {
  external_id: string;
  name: string;
  cost_price: number;
  price: number;
  carrier: string | null;
  cutoff_time: string | null;
  is_taxable: boolean;
}

interface CommitProduct {
  group_key: string;
  name: string;
  slug: string;
  origin: string | null;
  supplier: string | null;
  thumbnail_url: string | null;
  options: CommitOption[];
}

interface CommitBody {
  products: CommitProduct[];
}

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 가 연결되지 않았습니다." },
      { status: 503 },
    );
  }

  let body: CommitBody;
  try {
    body = (await req.json()) as CommitBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (!Array.isArray(body.products)) {
    return NextResponse.json({ error: "products 누락" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // 1) 도매처(suppliers) upsert by name
  const supplierNames = Array.from(
    new Set(body.products.map((p) => p.supplier).filter(Boolean) as string[]),
  );
  const supplierIdByName = new Map<string, string>();
  for (const sname of supplierNames) {
    const { data: existing } = await supabase
      .from("suppliers")
      .select("id")
      .eq("name", sname)
      .maybeSingle();
    if (existing) {
      supplierIdByName.set(sname, existing.id);
    } else {
      const { data: ins } = await supabase
        .from("suppliers")
        .insert({ name: sname })
        .select("id")
        .single();
      if (ins) supplierIdByName.set(sname, ins.id);
    }
  }

  // 2) 임포트 전 모든 옵션 external_id 조회 — 이번 엑셀에 없는 건 비활성화
  const { data: priorOpts } = await supabase
    .from("product_options")
    .select("external_id");
  const priorIds = new Set(
    (priorOpts ?? []).map((o) => o.external_id).filter(Boolean) as string[],
  );

  const incomingIds = new Set<string>();
  for (const p of body.products) {
    for (const o of p.options) incomingIds.add(o.external_id);
  }

  let created = 0;
  let updated = 0;

  for (const p of body.products) {
    const supplier_id = p.supplier
      ? supplierIdByName.get(p.supplier) ?? null
      : null;

    // 기존 product 식별 — group_key 또는 옵션 external_id 일치
    let existingProductId: string | null = null;
    {
      const { data } = await supabase
        .from("products")
        .select("id")
        .eq("external_group_key", p.group_key)
        .maybeSingle();
      if (data) existingProductId = data.id;
    }
    if (!existingProductId && p.options.length > 0) {
      const ext = p.options.map((o) => o.external_id);
      const { data } = await supabase
        .from("product_options")
        .select("product_id")
        .in("external_id", ext)
        .limit(1)
        .maybeSingle();
      if (data?.product_id) existingProductId = data.product_id;
    }

    let productId: string;
    if (existingProductId) {
      // 가격·공급사·동기화시간만 갱신, 관리자 수동 작성 필드는 보존.
      // 단, 썸네일이 비어있을 때만 자동 채워줌.
      const { data: prev } = await supabase
        .from("products")
        .select("thumbnail_url")
        .eq("id", existingProductId)
        .single();

      const update: Record<string, unknown> = {
        supplier_id,
        name: p.name,
        external_group_key: p.group_key,
        external_synced_at: now,
      };
      if (!prev?.thumbnail_url && p.thumbnail_url) {
        update.thumbnail_url = p.thumbnail_url;
      }
      const { error } = await supabase
        .from("products")
        .update(update)
        .eq("id", existingProductId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      productId = existingProductId;
      updated++;
    } else {
      const { data, error } = await supabase
        .from("products")
        .insert({
          supplier_id,
          name: p.name,
          slug: await uniqueSlug(supabase, p.slug),
          origin: p.origin,
          thumbnail_url: p.thumbnail_url,
          external_group_key: p.group_key,
          external_synced_at: now,
          is_draft: true,
          is_active: false,
        })
        .select("id")
        .single();
      if (error || !data) {
        return NextResponse.json(
          { error: error?.message ?? "상품 생성 실패" },
          { status: 500 },
        );
      }
      productId = data.id;
      created++;
    }

    // 옵션 upsert (external_id 가 unique)
    for (const o of p.options) {
      const { data: existing } = await supabase
        .from("product_options")
        .select("id")
        .eq("external_id", o.external_id)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("product_options")
          .update({
            product_id: productId,
            name: o.name,
            cost_price: o.cost_price,
            price: o.price,
            carrier: o.carrier,
            cutoff_time: o.cutoff_time,
            is_taxable: o.is_taxable,
            is_active: true,
            external_synced_at: now,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("product_options").insert({
          product_id: productId,
          external_id: o.external_id,
          name: o.name,
          cost_price: o.cost_price,
          price: o.price,
          carrier: o.carrier,
          cutoff_time: o.cutoff_time,
          is_taxable: o.is_taxable,
          is_active: true,
          external_synced_at: now,
        });
      }
    }
  }

  // 3) 이번 엑셀에 없던 기존 옵션은 비활성화
  const obsolete = [...priorIds].filter((id) => !incomingIds.has(id));
  let deactivated = 0;
  if (obsolete.length > 0) {
    const { error } = await supabase
      .from("product_options")
      .update({ is_active: false })
      .in("external_id", obsolete);
    if (!error) deactivated = obsolete.length;
  }

  return NextResponse.json({ created, updated, deactivated });
}

async function uniqueSlug(
  supabase: ReturnType<typeof createServiceClient>,
  base: string,
): Promise<string> {
  let candidate = base;
  for (let i = 1; i <= 50; i++) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i + 1}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}
