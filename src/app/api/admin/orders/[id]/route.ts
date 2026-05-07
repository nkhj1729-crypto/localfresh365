import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/supabase/types";

interface PatchBody {
  status?: OrderStatus;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  admin_memo?: string | null;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as PatchBody;

  const update: Record<string, unknown> = {};
  if (body.status) update.status = body.status;
  if (body.tracking_carrier !== undefined)
    update.tracking_carrier = body.tracking_carrier || null;
  if (body.tracking_number !== undefined)
    update.tracking_number = body.tracking_number || null;
  if (body.admin_memo !== undefined) update.admin_memo = body.admin_memo || null;

  // 송장이 등록되면 status 를 자동으로 shipped 로
  if (
    body.tracking_number &&
    body.tracking_number.trim() &&
    !body.status
  ) {
    update.status = "shipped";
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
