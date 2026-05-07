"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { formatKRW } from "@/lib/utils";

export default function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const total = useCart((s) => s.totalAmount());

  return (
    <div className="container py-12">
      <header className="mb-10 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Cart
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          장바구니
        </h1>
      </header>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-16 text-center">
          <p className="text-sm text-muted-foreground">
            장바구니가 비어 있습니다.
          </p>
          <Button asChild className="mt-6">
            <Link href="/products">상품 둘러보기</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="divide-y rounded-md border bg-white">
            {items.map((i) => (
              <div key={i.line_id} className="flex gap-4 p-4">
                <Link
                  href={`/products/${i.product_slug}`}
                  className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-md bg-muted"
                >
                  {i.thumbnail_url && (
                    <Image
                      src={i.thumbnail_url}
                      alt={i.product_name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  )}
                </Link>
                <div className="flex flex-1 flex-col">
                  {i.origin && (
                    <p className="text-xs text-muted-foreground">{i.origin}</p>
                  )}
                  <Link
                    href={`/products/${i.product_slug}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {i.product_name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {i.option_name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatKRW(i.unit_price)}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="inline-flex items-center rounded-md border">
                      <button
                        className="h-8 w-8 hover:bg-accent"
                        onClick={() => setQty(i.line_id, i.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-sm tabular-nums">
                        {i.quantity}
                      </span>
                      <button
                        className="h-8 w-8 hover:bg-accent"
                        onClick={() => setQty(i.line_id, i.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatKRW(i.unit_price * i.quantity)}
                      </span>
                      <button
                        onClick={() => remove(i.line_id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="h-fit rounded-md border bg-white p-6">
            <h2 className="text-sm font-semibold">주문 요약</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">상품 합계</dt>
                <dd className="tabular-nums">{formatKRW(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">배송비</dt>
                <dd className="tabular-nums">
                  {total >= 50000 ? "무료" : formatKRW(3000)}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex justify-between border-t pt-4">
              <span className="text-sm font-semibold">결제 예정</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatKRW(total + (total >= 50000 || total === 0 ? 0 : 3000))}
              </span>
            </div>
            <Button asChild className="mt-6 w-full" size="lg">
              <Link href="/checkout">주문하기</Link>
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
