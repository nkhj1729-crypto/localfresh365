import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { MOCK_PRODUCTS, isSupabaseConfigured } from "@/lib/mock-data";

export const revalidate = 60;

export default async function HomePage() {
  let products: Product[] = MOCK_PRODUCTS;
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("*, suppliers(id,name), categories(id,name,slug)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (data?.length) products = data as Product[];
    } catch {
      /* keep mock */
    }
  }

  return (
    <div>
      {/* Hero */}
      <section className="border-b bg-white">
        <div className="container grid gap-10 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Farm to Table · Since 2024
            </p>
            <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
              산지의 신선함을, <br />
              가장 가까운 식탁으로.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              두울손은 검증된 산지 생산자와 직접 계약하여 신선한 농수산물을
              소비자에게 전달합니다. 계절의 가장 좋은 것을 가장 정직한
              가격으로.
            </p>
            <div className="mt-8 flex gap-3">
              <Button asChild size="lg">
                <Link href="/products">
                  전체 상품 보기 <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="aspect-[5/4] rounded-lg bg-gradient-to-br from-neutral-100 via-neutral-50 to-white ring-1 ring-border" />
        </div>
      </section>

      {/* New arrivals */}
      <section className="bg-neutral-50">
        <div className="container py-16">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                New Arrivals
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                새로 들어온 상품
              </h2>
            </div>
            <Link
              href="/products"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              전체보기 →
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(products ?? []).map((p) => (
              <ProductCard key={p.id} product={p as Product} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
