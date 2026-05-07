import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateOrderNo } from "@/lib/utils";

interface PayloadItem {
  product_id: string;
  option_id: string | null;
  supplier_id: string | null;
  product_name: string;
  option_name: string;
  origin: string | null;
  unit_price: number;
  quantity: number;
}

interface Payload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  shipping_address: string;
  shipping_zipcode?: string;
  shipping_memo?: string;
  items: PayloadItem[];
  total_amount: number;
}

export async function POST(req: Request) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.customer_name || !body.customer_phone || !body.shipping_address) {
    return NextResponse.json(
      { error: "필수 정보가 누락되었습니다." },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "주문할 상품이 없습니다." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const order_no = generateOrderNo();

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      order_no,
      customer_name: body.customer_name,
      customer_phone: body.customer_phone,
      customer_email: body.customer_email || null,
      shipping_address: body.shipping_address,
      shipping_zipcode: body.shipping_zipcode || null,
      shipping_memo: body.shipping_memo || null,
      total_amount: body.total_amount,
      status: "pending",
    })
    .select("id, order_no")
    .single();

  if (orderErr || !order) {
    return NextResponse.json(
      { error: orderErr?.message ?? "주문 생성 실패" },
      { status: 500 },
    );
  }

  const itemRows = body.items.map((i) => ({
    order_id: order.id,
    product_id: i.product_id,
    option_id: i.option_id,
    supplier_id: i.supplier_id,
    product_name: i.product_name,
    option_name: i.option_name,
    origin: i.origin,
    unit_price: i.unit_price,
    quantity: i.quantity,
    subtotal: i.unit_price * i.quantity,
  }));

  const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
  if (itemsErr) {
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({ order_no: order.order_no, id: order.id });
}
