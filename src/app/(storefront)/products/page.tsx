import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product-card";
import type { Category, Product } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import {
  MOCK_CATEGORIES,
  MOCK_PRODUCTS,
  isSupabaseConfigured,
} from "@/lib/mock-data";

export const revalidate = 60;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  let categories: Category[] = MOCK_CATEGORIES;
  let products: Product[] = MOCK_PRODUCTS;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .order("sort");
      if (cats?.length) categories = cats as Category[];

      const cat = categories.find((c) => c.slug === searchParams.category);
      let query = supabase
        .from("products")
        .select("*, suppliers(id,name), categories(id,name,slug)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (cat) query = query.eq("category_id", cat.id);
      const { data } = await query;
      if (data) products = data as Product[];
    } catch {
      /* keep mocks */
    }
  } else if (searchParams.category) {
    products = MOCK_PRODUCTS.filter(
      (p) => p.categories?.slug === searchParams.category,
    );
  }

  const cat = categories.find((c) => c.slug === searchParams.category);

  return (
    <div className="container py-12">
      <header className="mb-10 flex flex-col gap-2 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Products
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {cat ? cat.name : "전체 상품"}
        </h1>
      </header>

      <nav className="mb-10 flex flex-wrap gap-2">
        <CategoryPill href="/products" active={!cat}>
          전체
        </CategoryPill>
        {(categories ?? []).map((c) => (
          <CategoryPill
            key={c.id}
            href={`/products?category=${c.slug}`}
            active={cat?.slug === c.slug}
          >
            {c.name}
          </CategoryPill>
        ))}
      </nav>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {(products ?? []).map((p) => (
          <ProductCard key={p.id} product={p as Product} />
        ))}
        {!products?.length && (
          <p className="col-span-full rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
            해당 카테고리에 등록된 상품이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

function CategoryPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center rounded-full border px-4 text-sm transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-white text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
