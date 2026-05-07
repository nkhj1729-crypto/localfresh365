"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
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
  const [logoOk, setLogoOk] = useState(true);

  return (
    <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur">
      <div className="container flex h-24 items-center justify-between md:h-28">
        <Link href="/" className="flex items-center" aria-label="LOCAL FRESH 365">
          {logoOk ? (
            <Image
              src="/logo.png"
              alt="LOCAL FRESH 365"
              width={256}
              height={256}
              priority
              className="h-20 w-20 md:h-24 md:w-24 object-contain"
              onError={() => setLogoOk(false)}
            />
          ) : (
            <span className="text-xl font-bold tracking-wider text-emerald-900">
              LOCAL FRESH 365
            </span>
          )}
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
