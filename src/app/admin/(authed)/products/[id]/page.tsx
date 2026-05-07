import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, MOCK_PRODUCTS } from "@/lib/mock-data";
import { ProductEditor } from "@/components/admin/product-editor";
import type { Product } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminProductEditPage({
  params,
}: {
  params: { id: string };
}) {
  let product: Product | null =
    MOCK_PRODUCTS.find((p) => p.id === params.id) ?? null;

  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("products")
        .select(
          "*, suppliers(id,name), categories(id,name,slug), product_options(*)",
        )
        .eq("id", params.id)
        .maybeSingle();
      if (data) product = data as Product;
    } catch {
      /* keep mock */
    }
  }

  if (!product) notFound();
  return <ProductEditor product={product} />;
}
