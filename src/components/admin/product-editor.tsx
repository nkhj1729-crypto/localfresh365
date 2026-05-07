"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, ImageIcon, Save } from "lucide-react";
import type { Product } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatKRW } from "@/lib/utils";

interface Props {
  product: Product;
}

export function ProductEditor({ product }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: product.name,
    origin: product.origin ?? "",
    origin_detail: product.origin_detail ?? "",
    description: product.description ?? "",
    shipping_info: product.shipping_info,
  });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const opts = product.product_options ?? [];
  const active = opts.filter((o) => o.is_active);
  const prices = active.map((o) => o.price);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;

  async function save(action?: "publish" | "unpublish") {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장 실패");
      setStatusMsg(action === "publish" ? "공개되었습니다." : action === "unpublish" ? "비공개로 전환했습니다." : "저장되었습니다.");
      router.refresh();
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "오류");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 상품 목록
        </Link>
        <div className="flex items-center gap-2">
          {product.is_draft ? (
            <Badge variant="warning">검수 대기</Badge>
          ) : product.is_active ? (
            <Badge variant="success">공개됨</Badge>
          ) : (
            <Badge variant="muted">비공개</Badge>
          )}
          {!product.is_draft && product.is_active ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => save("unpublish")}
              disabled={saving}
            >
              <EyeOff className="mr-1.5 h-3.5 w-3.5" />
              비공개로
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => save("publish")}
              disabled={saving || active.length === 0}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              공개하기
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Thumbnail */}
        <div className="space-y-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-md border bg-muted">
            {product.thumbnail_url ? (
              <Image
                src={product.thumbnail_url}
                alt={product.name}
                fill
                sizes="280px"
                className="object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            썸네일은 임포트 시 엑셀에서 자동 추출됩니다.
          </p>
          <div className="rounded-md border p-3 text-xs text-muted-foreground">
            <div>옵션 {active.length}개 활성</div>
            {prices.length > 0 && (
              <div className="mt-1 font-semibold text-foreground">
                {min === max ? formatKRW(min) : `${formatKRW(min)} ~ ${formatKRW(max)}`}
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="상품명">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="산지">
                <Input
                  placeholder="예) 전남 해남군 / 국내산"
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
                />
              </Field>
              <Field label="산지 상세">
                <Textarea
                  rows={3}
                  placeholder="산지의 특징, 재배 방식 등 (매장 상세 페이지에 노출됨)"
                  value={form.origin_detail}
                  onChange={(e) =>
                    setForm({ ...form, origin_detail: e.target.value })
                  }
                />
              </Field>
              <Field label="배송 안내">
                <Textarea
                  rows={2}
                  value={form.shipping_info}
                  onChange={(e) =>
                    setForm({ ...form, shipping_info: e.target.value })
                  }
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">상세 설명</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={10}
                placeholder="상품 상세 페이지에 노출될 설명. 마크다운/줄바꿈 가능."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </CardContent>
          </Card>

          {/* Options table (read-only) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">옵션(규격)</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium">관리코드</th>
                    <th className="pb-2 text-left font-medium">옵션명</th>
                    <th className="pb-2 text-right font-medium">공급가</th>
                    <th className="pb-2 text-right font-medium">매장가</th>
                    <th className="pb-2 text-center font-medium">활성</th>
                  </tr>
                </thead>
                <tbody>
                  {opts.map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-2 font-mono">{o.external_id}</td>
                      <td className="py-2">{o.name}</td>
                      <td className="py-2 text-right tabular-nums">
                        {o.cost_price.toLocaleString()}
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums">
                        {o.price.toLocaleString()}
                      </td>
                      <td className="py-2 text-center">
                        {o.is_active ? (
                          <Badge variant="success">활성</Badge>
                        ) : (
                          <Badge variant="muted">품절</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">
                * 옵션·가격은 엑셀 임포트로만 갱신됩니다. 매장가는 공급가 × 1.5.
              </p>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{statusMsg}</span>
            <Button onClick={() => save()} disabled={saving} size="lg">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
