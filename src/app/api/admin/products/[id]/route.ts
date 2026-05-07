import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/mock-data";

interface PatchBody {
  name?: string;
  origin?: string;
  origin_detail?: string;
  description?: string;
  shipping_info?: string;
  action?: "publish" | "unpublish";
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
  const { data, error } = await supabase
    .from("products")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
