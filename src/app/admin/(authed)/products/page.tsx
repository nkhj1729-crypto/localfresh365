import Link from "next/link";
import Image from "next/image";
import { createServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatKRW } from "@/lib/utils";
import type { Product } from "@/lib/supabase/types";
import { MOCK_PRODUCTS, isSupabaseConfigured } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

type Tab = "draft" | "published" | "inactive";

const TABS: { key: Tab; label: string }[] = [
  { key: "draft", label: "검수 대기" },
  { key: "published", label: "공개됨" },
  { key: "inactive", label: "비공개(품절)" },
];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { tab?: Tab };
}) {
  const tab: Tab = (searchParams.tab as Tab) ?? "draft";

  let products: Product[] = MOCK_PRODUCTS;
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("products")
        .select(
          "*, suppliers(id,name), categories(id,name,slug), product_options(*)",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (data) products = data as Product[];
    } catch {
      /* keep mock */
    }
  }

  const filtered = products.filter((p) => {
    if (tab === "draft") return p.is_draft;
    if (tab === "published") return !p.is_draft && p.is_active;
    return !p.is_active && !p.is_draft;
  });

  const counts = {
    draft: products.filter((p) => p.is_draft).length,
    published: products.filter((p) => !p.is_draft && p.is_active).length,
    inactive: products.filter((p) => !p.is_active && !p.is_draft).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">상품 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            임포트된 상품을 검수해 매장에 공개하거나 비공개 처리합니다.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={`/admin/products?tab=${t.key}`}
              className={cn(
                "border-b-2 px-4 py-2.5 text-sm transition",
                active
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                {counts[t.key]}
              </span>
            </Link>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="grid place-items-center p-16 text-sm text-muted-foreground">
          {tab === "draft"
            ? "검수 대기 중인 상품이 없습니다."
            : tab === "published"
              ? "공개된 상품이 없습니다."
              : "비공개 상품이 없습니다."}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductRow key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductRow({ p }: { p: Product }) {
  const opts = p.product_options ?? [];
  const active = opts.filter((o) => o.is_active);
  const prices = active.map((o) => o.price);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;

  return (
    <Link href={`/admin/products/${p.id}`}>
      <Card className="overflow-hidden transition hover:shadow-md">
        <div className="flex gap-3 p-3">
          <div className="relative aspect-square h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
            {p.thumbnail_url && (
              <Image
                src={p.thumbnail_url}
                alt={p.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-sm font-medium leading-tight">
                {p.name}
              </p>
              {p.is_draft ? (
                <Badge variant="warning">draft</Badge>
              ) : p.is_active ? (
                <Badge variant="success">공개</Badge>
              ) : (
                <Badge variant="muted">비공개</Badge>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {p.origin && <span className="mr-2">산지: {p.origin}</span>}
              <span>옵션 {active.length}개</span>
            </div>
            <p className="mt-auto pt-2 text-sm font-semibold tabular-nums">
              {prices.length === 0 ? (
                "-"
              ) : min === max ? (
                formatKRW(min)
              ) : (
                <>
                  {formatKRW(min)}
                  <span className="text-xs font-normal text-muted-foreground"> ~ {formatKRW(max)}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
