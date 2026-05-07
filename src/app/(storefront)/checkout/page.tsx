"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatKRW } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.totalAmount());
  const clear = useCart((s) => s.clear);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    shipping_zipcode: "",
    shipping_address: "",
    shipping_memo: "",
  });

  const shipping = total === 0 ? 0 : total >= 50000 ? 0 : 3000;

  if (items.length === 0) {
    return (
      <div className="container py-20">
        <div className="rounded-md border border-dashed p-16 text-center">
          <p className="text-sm text-muted-foreground">
            주문할 상품이 없습니다.
          </p>
          <Button asChild className="mt-6">
            <Link href="/products">상품 둘러보기</Link>
          </Button>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({
            product_id: i.product_id,
            option_id: i.option_id,
            supplier_id: i.supplier_id,
            product_name: i.product_name,
            option_name: i.option_name,
            origin: i.origin,
            unit_price: i.unit_price,
            quantity: i.quantity,
          })),
          total_amount: total + shipping,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "주문 생성에 실패했습니다.");
      clear();
      router.push(`/checkout/complete?no=${encodeURIComponent(data.order_no)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="container py-12">
      <header className="mb-10 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Checkout
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">주문서</h1>
      </header>

      <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-sm font-semibold">주문자 정보</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="이름" required>
                <Input
                  required
                  value={form.customer_name}
                  onChange={(e) =>
                    setForm({ ...form, customer_name: e.target.value })
                  }
                />
              </Field>
              <Field label="연락처" required>
                <Input
                  required
                  placeholder="010-0000-0000"
                  value={form.customer_phone}
                  onChange={(e) =>
                    setForm({ ...form, customer_phone: e.target.value })
                  }
                />
              </Field>
              <Field label="이메일 (선택)" className="sm:col-span-2">
                <Input
                  type="email"
                  value={form.customer_email}
                  onChange={(e) =>
                    setForm({ ...form, customer_email: e.target.value })
                  }
                />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold">배송지 정보</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="우편번호" className="sm:col-span-2">
                <Input
                  className="max-w-[180px]"
                  value={form.shipping_zipcode}
                  onChange={(e) =>
                    setForm({ ...form, shipping_zipcode: e.target.value })
                  }
                />
              </Field>
              <Field label="주소" required className="sm:col-span-2">
                <Input
                  required
                  value={form.shipping_address}
                  onChange={(e) =>
                    setForm({ ...form, shipping_address: e.target.value })
                  }
                />
              </Field>
              <Field label="배송 메모 (선택)" className="sm:col-span-2">
                <Textarea
                  rows={3}
                  placeholder="예) 부재 시 경비실에 맡겨주세요."
                  value={form.shipping_memo}
                  onChange={(e) =>
                    setForm({ ...form, shipping_memo: e.target.value })
                  }
                />
              </Field>
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-4 rounded-md border bg-white p-6">
          <h2 className="text-sm font-semibold">주문 요약</h2>
          <ul className="space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.line_id} className="flex justify-between gap-4">
                <span className="line-clamp-2 text-muted-foreground">
                  {i.option_name} × {i.quantity}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatKRW(i.unit_price * i.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">상품 합계</span>
              <span className="tabular-nums">{formatKRW(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">배송비</span>
              <span className="tabular-nums">
                {shipping === 0 ? "무료" : formatKRW(shipping)}
              </span>
            </div>
          </div>
          <div className="flex justify-between border-t pt-4">
            <span className="text-sm font-semibold">결제 예정</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatKRW(total + shipping)}
            </span>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "주문 중..." : "주문 접수"}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            * 본 사이트는 위탁판매 접수처입니다. 주문 접수 후 관리자가 산지에
            발주하며, 입금/결제 안내는 별도 연락드립니다.
          </p>
        </aside>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
