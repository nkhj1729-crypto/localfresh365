import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Truck, Package, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/utils";
import { AddToCart } from "@/components/add-to-cart";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/supabase/types";
import { MOCK_PRODUCTS, isSupabaseConfigured } from "@/lib/mock-data";

export const revalidate = 60;

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  let product: Product | null =
    MOCK_PRODUCTS.find((p) => p.slug === params.slug) ?? null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select(
          "*, suppliers(id,name), categories(id,name,slug), product_options(*)",
        )
        .eq("slug", params.slug)
        .eq("is_draft", false)
        .eq("is_active", true)
        .maybeSingle();
      if (data) product = data as Product;
    } catch {
      /* keep mock */
    }
  }

  if (!product) notFound();
  const p = product;
  const opts = (p.product_options ?? []).filter((o) => o.is_active);
  const prices = opts.map((o) => o.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  return (
    <div className="container py-12">
      <div className="grid gap-12 lg:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted">
          {p.thumbnail_url ? (
            <Image
              src={p.thumbnail_url}
              alt={p.name}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              이미지 준비중
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="flex flex-col gap-6">
          <div>
            {p.categories?.name && (
              <Badge variant="muted">{p.categories.name}</Badge>
            )}
            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              {p.name}
            </h1>
            {prices.length > 0 && (
              <p className="mt-3 text-3xl font-semibold tabular-nums">
                {minPrice === maxPrice ? (
                  formatKRW(minPrice)
                ) : (
                  <>
                    {formatKRW(minPrice)}
                    <span className="ml-2 text-base font-normal text-muted-foreground">
                      ~ {formatKRW(maxPrice)}
                    </span>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Origin Highlight */}
          {p.origin && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-5">
              <div className="flex items-center gap-2 text-emerald-800">
                <MapPin className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-widest">
                  산지 정보
                </span>
              </div>
              <p className="mt-3 text-base font-semibold text-foreground">
                {p.origin}
              </p>
              {p.origin_detail && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p.origin_detail}
                </p>
              )}
              {p.suppliers?.name && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Store className="h-3.5 w-3.5" />
                  공급사 · {p.suppliers.name}
                </p>
              )}
            </div>
          )}

          {/* Shipping Highlight */}
          <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-5">
            <div className="flex items-center gap-2 text-sky-800">
              <Truck className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">
                배송 안내 · 일반택배
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              {p.shipping_info}
            </p>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              <li>· 배송비: 3,000원 (50,000원 이상 무료)</li>
              <li>· 제주·도서산간 추가 5,000원</li>
              <li>· 신선식품 특성상 단순 변심 반품은 불가합니다.</li>
            </ul>
          </div>

          <AddToCart product={p} />
        </div>
      </div>

      {/* Description */}
      {p.description && (
        <section className="mt-16 border-t pt-12">
          <div className="mb-6 flex items-center gap-2">
            <Package className="h-4 w-4" />
            <h2 className="text-lg font-semibold">상품 상세</h2>
          </div>
          <div className="prose prose-sm max-w-none whitespace-pre-line text-foreground">
            {p.description}
          </div>
        </section>
      )}
    </div>
  );
}
