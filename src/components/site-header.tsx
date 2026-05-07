"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/store/cart";

const NAV = [
  { href: "/products", label: "전체상품" },
  { href: "/products?category=vegetable", label: "채소" },
  { href: "/products?category=fruit", label: "과일" },
  { href: "/products?category=seafood", label: "수산물" },
  { href: "/products?category=grain", label: "곡물" },
];

export function SiteHeader() {
  const count = useCart((s) => s.items.reduce((a, b) => a + b.quantity, 0));

  return (
    <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-semibold tracking-tight">두울손</span>
          <span className="text-xs text-muted-foreground">DUULSON</span>
        </Link>

        <nav className="hidden gap-6 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/cart"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
            aria-label="장바구니"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
