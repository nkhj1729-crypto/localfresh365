import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderRow } from "@/components/admin/order-row";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABEL,
  type Order,
  type OrderItem,
  type OrderStatus,
  type Supplier,
} from "@/lib/supabase/types";
import {
  MOCK_ORDERS,
  MOCK_SUPPLIERS,
  isSupabaseConfigured,
} from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const STATUS_FILTERS: (OrderStatus | "all")[] = [
  "all",
  "pending",
  "confirmed",
  "ordered",
  "shipped",
  "cancelled",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; supplier?: string };
}) {
  let suppliers: Supplier[] = MOCK_SUPPLIERS;
  let allOrders: Order[] = MOCK_ORDERS;

  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createServiceClient();
      const [supRes, ordRes] = await Promise.all([
        supabase.from("suppliers").select("id,name,contact,phone,memo").order("name"),
        supabase
          .from("orders")
          .select("*, order_items(*, suppliers(id,name))")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (supRes.data?.length) suppliers = supRes.data as Supplier[];
      if (ordRes.data) allOrders = ordRes.data as Order[];
    } catch {
      /* keep mocks */
    }
  }

  // 상태 필터
  const statusFilter = (searchParams.status as OrderStatus | undefined) ?? null;
  const filteredByStatus = statusFilter
    ? allOrders.filter((o) => o.status === statusFilter)
    : allOrders;

  // 도매처 필터(특정 도매처 선택 시 그 도매처 아이템만 보이도록)
  const supplierFilter = searchParams.supplier ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">주문 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          주문을 도매처별·상태별로 확인하고 송장 번호를 입력합니다.
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs font-semibold text-muted-foreground">
            상태
          </span>
          {STATUS_FILTERS.map((s) => {
            const href =
              s === "all"
                ? buildHref({ ...searchParams, status: undefined })
                : buildHref({ ...searchParams, status: s });
            const active =
              s === "all" ? !statusFilter : statusFilter === s;
            return (
              <Link
                key={s}
                href={href}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-white text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "all" ? "전체" : ORDER_STATUS_LABEL[s]}
              </Link>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs font-semibold text-muted-foreground">
            도매처
          </span>
          <Link
            href={buildHref({ ...searchParams, supplier: undefined })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              !supplierFilter
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-white text-muted-foreground hover:text-foreground",
            )}
          >
            전체
          </Link>
          {(suppliers as Supplier[] | null)?.map((sp) => (
            <Link
              key={sp.id}
              href={buildHref({ ...searchParams, supplier: sp.id })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                supplierFilter === sp.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-white text-muted-foreground hover:text-foreground",
              )}
            >
              {sp.name}
            </Link>
          ))}
        </div>
      </Card>

      {/* Tables grouped by supplier */}
      {supplierFilter ? (
        <SupplierBlock
          suppliers={(suppliers ?? []) as Supplier[]}
          supplierId={supplierFilter}
          orders={filteredByStatus}
        />
      ) : (
        <div className="space-y-10">
          {(suppliers as Supplier[] | null)?.map((sp) => (
            <SupplierBlock
              key={sp.id}
              suppliers={(suppliers ?? []) as Supplier[]}
              supplierId={sp.id}
              orders={filteredByStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierBlock({
  suppliers,
  supplierId,
  orders,
}: {
  suppliers: Supplier[];
  supplierId: string;
  orders: Order[];
}) {
  const supplier = suppliers.find((s) => s.id === supplierId);

  // 이 도매처 상품을 1개라도 포함하는 주문만 추리고, 보이는 아이템은 그 도매처 것만
  const rows = orders
    .map((o) => {
      const supplierItems = (o.order_items ?? []).filter(
        (i) => i.supplier_id === supplierId,
      );
      return supplierItems.length > 0
        ? { order: o, items: supplierItems as OrderItem[] }
        : null;
    })
    .filter(Boolean) as { order: Order; items: OrderItem[] }[];

  return (
    <Card className="overflow-hidden">
      <header className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
        <div>
          <p className="text-xs text-muted-foreground">도매처</p>
          <p className="text-base font-semibold">{supplier?.name ?? "—"}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          관련 주문 <span className="font-semibold text-foreground">{rows.length}</span>건
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          해당 조건의 주문이 없습니다.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">주문번호 / 일시</TableHead>
              <TableHead>고객 / 배송지</TableHead>
              <TableHead>상품</TableHead>
              <TableHead className="w-[120px]">소계</TableHead>
              <TableHead className="w-[100px]">상태</TableHead>
              <TableHead className="w-[150px]">송장</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ order, items }) => (
              <OrderRow
                key={order.id}
                order={order}
                visibleItems={items}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function buildHref(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}
