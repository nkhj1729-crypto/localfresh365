import Image from "next/image";
import Link from "next/link";
import { formatKRW } from "@/lib/utils";
import type { Product } from "@/lib/supabase/types";

export function ProductCard({ product }: { product: Product }) {
  const opts = (product.product_options ?? []).filter((o) => o.is_active);
  const prices = opts.map((o) => o.price);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {product.thumbnail_url ? (
          <Image
            src={product.thumbnail_url}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">
            이미지 없음
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {product.origin && (
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
            산지 · {product.origin}
          </p>
        )}
        <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">
          {product.name}
        </p>
        <p className="mt-auto pt-2 text-base font-semibold tabular-nums">
          {prices.length === 0 ? (
            <span className="text-muted-foreground">옵션 준비중</span>
          ) : min === max ? (
            formatKRW(min)
          ) : (
            <>
              {formatKRW(min)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                부터
              </span>
            </>
          )}
        </p>
        {opts.length > 1 && (
          <p className="text-[11px] text-muted-foreground">
            옵션 {opts.length}개
          </p>
        )}
      </div>
    </Link>
  );
}
