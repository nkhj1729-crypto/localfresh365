"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/cart";
import { formatKRW, cn } from "@/lib/utils";
import type { Product, ProductOption } from "@/lib/supabase/types";

interface Props {
  product: Product;
}

export function AddToCart({ product }: Props) {
  const options = (product.product_options ?? []).filter((o) => o.is_active);
  const [optionId, setOptionId] = useState<string | null>(
    options.length === 1 ? options[0].id : null,
  );
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.add);
  const router = useRouter();

  const selected = options.find((o) => o.id === optionId) ?? null;

  function pushToCart(option: ProductOption) {
    add(
      {
        product_id: product.id,
        product_name: product.name,
        product_slug: product.slug,
        option_id: option.id,
        option_name: option.name,
        origin: product.origin,
        supplier_id: product.supplier_id,
        unit_price: option.price,
        thumbnail_url: product.thumbnail_url,
      },
      qty,
    );
  }

  return (
    <div className="space-y-5">
      {/* Option selector */}
      {options.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">규격 선택</p>
          <div className="space-y-2">
            {options.map((o) => {
              const active = o.id === optionId;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOptionId(o.id)}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-md border p-3 text-left transition",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-white hover:border-foreground/40",
                  )}
                >
                  <span className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </span>
                    <span className="text-sm leading-snug">{o.name}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatKRW(o.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">수량</span>
        <div className="inline-flex items-center rounded-md border">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid h-10 w-10 place-items-center hover:bg-accent"
            aria-label="감소"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            value={qty}
            onChange={(e) => {
              const n = parseInt(e.target.value || "1", 10);
              setQty(Number.isFinite(n) && n > 0 ? n : 1);
            }}
            className="h-10 w-14 border-x bg-transparent text-center text-sm tabular-nums focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="grid h-10 w-10 place-items-center hover:bg-accent"
            aria-label="증가"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="flex items-baseline justify-between border-t border-b py-4">
        <span className="text-sm text-muted-foreground">합계 금액</span>
        <span className="text-2xl font-semibold tabular-nums">
          {selected ? formatKRW(selected.price * qty) : "—"}
        </span>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="lg"
          disabled={!selected}
          onClick={() => selected && pushToCart(selected)}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          장바구니
        </Button>
        <Button
          size="lg"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            pushToCart(selected);
            router.push("/checkout");
          }}
        >
          바로 구매
        </Button>
      </div>

      {!selected && options.length > 1 && (
        <p className="text-xs text-muted-foreground">
          * 규격을 선택해 주세요.
        </p>
      )}
    </div>
  );
}
