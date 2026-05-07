import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/mock-data";

interface OptionPriceUpdate {
  id: string;
  price: number;
}

interface PatchBody {
  name?: string;
  origin?: string;
  origin_detail?: string;
  description?: string;
  shipping_info?: string;
  action?: "publish" | "unpublish";
  option_prices?: OptionPriceUpdate[];
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 가 연결되지 않아 저장할 수 없습니다." },
      { status: 503 },
    );
  }

  const body = (await req.json()) as PatchBody;
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.origin !== undefined) update.origin = body.origin || null;
  if (body.origin_detail !== undefined)
    update.origin_detail = body.origin_detail || null;
  if (body.description !== undefined)
    update.description = body.description || null;
  if (body.shipping_info !== undefined && body.shipping_info)
    update.shipping_info = body.shipping_info;

  if (body.action === "publish") {
    update.is_draft = false;
    update.is_active = true;
  } else if (body.action === "unpublish") {
    update.is_active = false;
  }

  const supabase = createServiceClient();

  // 1) 상품 자체 업데이트
  const { data, error } = await supabase
    .from("products")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 2) 옵션별 매장가 업데이트 (있을 때만)
  if (Array.isArray(body.option_prices) && body.option_prices.length > 0) {
    for (const op of body.option_prices) {
      if (typeof op.price !== "number" || op.price < 0) continue;
      const { error: e } = await supabase
        .from("product_options")
        .update({ price: op.price })
        .eq("id", op.id)
        .eq("product_id", params.id); // 같은 상품 옵션만
      if (e)
        return NextResponse.json(
          { error: `옵션 가격 저장 실패: ${e.message}` },
          { status: 500 },
        );
    }
  }

  return NextResponse.json(data);
}
