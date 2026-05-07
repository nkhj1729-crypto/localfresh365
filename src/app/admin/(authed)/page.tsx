import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { MOCK_ORDERS, isSupabaseConfigured } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let orders: { status: OrderStatus; total_amount: number }[] = MOCK_ORDERS.map(
    (o) => ({ status: o.status, total_amount: o.total_amount }),
  );
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("orders")
        .select("id, status, total_amount, created_at");
      if (data) orders = data as typeof orders;
    } catch {
      /* keep mock */
    }
  }

  const counts: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    ordered: 0,
    shipped: 0,
    cancelled: 0,
  };
  let revenue = 0;
  for (const o of orders ?? []) {
    counts[o.status as OrderStatus]++;
    if (o.status !== "cancelled") revenue += o.total_amount;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 주문 현황을 한눈에 확인합니다.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {(Object.keys(counts) as OrderStatus[]).map((s) => (
          <Card key={s}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {ORDER_STATUS_LABEL[s]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{counts[s]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">총 매출 (취소 제외)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums">
            {new Intl.NumberFormat("ko-KR").format(revenue)}원
          </p>
        </CardContent>
      </Card>

      <Button asChild>
        <Link href="/admin/orders">주문 관리로 이동 →</Link>
      </Button>
    </div>
  );
}
