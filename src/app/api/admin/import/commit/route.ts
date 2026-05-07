import { NextResponse } from "next/server";
import { rename, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
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
  thumbnail_filename: string | null;
  options: CommitOption[];
}

interface CommitBody {
  token: string;
  products: CommitProduct[];
}

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error:
          "Supabase 가 연결되어 있지 않아 임포트를 저장할 수 없습니다. .env.local 에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY 를 설정한 뒤 다시 시도해주세요.",
      },
      { status: 503 },
    );
  }

  let body: CommitBody;
  try {
    body = (await req.json()) as CommitBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  if (!body.token || !Array.isArray(body.products)) {
    return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
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

  // 2) 임포트 전 모든 활성 옵션 external_id 조회 — 이번 엑셀에 없는 건 비활성화
  const { data: priorOpts } = await supabase
    .from("product_options")
    .select("id, external_id");
  const priorIds = new Set(
    (priorOpts ?? []).map((o) => o.external_id).filter(Boolean) as string[],
  );

  const incomingIds = new Set<string>();
  for (const p of body.products) {
    for (const o of p.options) incomingIds.add(o.external_id);
  }

  let created = 0;
  let updated = 0;

  // 3) 그룹 단위로 product / options upsert
  for (const p of body.products) {
    const supplier_id = p.supplier ? supplierIdByName.get(p.supplier) ?? null : null;

    // 같은 group_key 또는 옵션 external_id 일치하는 기존 product 찾기
    let existingProductId: string | null = null;
    {
      const { data } = await supabase
        .from("products")
        .select("id")
        .eq("external_group_key", p.group_key)
        .maybeSingle();
      if (data) existingProductId = data.id;
    }
    if (!existingProductId) {
      // 옵션의 external_id 로도 시도
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
      // 기존 상품 — 가격/옵션만 갱신, 관리자 수동 작성 필드(description, origin_detail, images, is_draft 의 명시적 publish 상태)는 보존
      const { error } = await supabase
        .from("products")
        .update({
          supplier_id,
          name: p.name,
          external_group_key: p.group_key,
          external_synced_at: now,
          // origin 은 비어있을 때만 자동값 채워주기
          ...(p.origin ? {} : {}),
          // thumbnail_url 은 처음 채워졌을 때만 갱신
        })
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

    // 썸네일 처리 — preview 폴더에서 영구 폴더로 이동 (Supabase 연결 시 추후 Storage 로 마이그레이션)
    if (p.thumbnail_filename) {
      try {
        const fromDir = path.join(
          process.cwd(),
          "public",
          "uploads",
          "preview",
          body.token,
        );
        const toDir = path.join(process.cwd(), "public", "uploads", "products", productId);
        await mkdir(toDir, { recursive: true });
        const fromPath = path.join(fromDir, p.thumbnail_filename);
        const toPath = path.join(toDir, p.thumbnail_filename);
        await rename(fromPath, toPath).catch(async () => {
          // 이미 옮겨졌거나 없으면 폴더 내 첫 파일 사용
          const files = await readdir(fromDir).catch(() => []);
          if (files.length > 0) {
            await rename(
              path.join(fromDir, files[0]),
              path.join(toDir, files[0]),
            );
          }
        });
        const publicUrl = `/uploads/products/${productId}/${p.thumbnail_filename}`;
        await supabase
          .from("products")
          .update({ thumbnail_url: publicUrl })
          .eq("id", productId);
      } catch (e) {
        console.warn("썸네일 이동 실패:", e);
      }
    }
  }

  // 4) 이번 엑셀에 없던 기존 옵션은 비활성화
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
