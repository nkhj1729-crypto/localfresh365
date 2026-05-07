"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, FileSpreadsheet, Layers, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatKRW } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface PreviewOption {
  external_id: string;
  name: string;
  cost_price: number;
  price: number;
  carrier: string | null;
  cutoff_time: string | null;
  is_taxable: boolean;
  image_url: string | null;
}

interface PreviewProduct {
  group_key: string;
  name: string;
  slug: string;
  origin: string | null;
  supplier: string | null;
  thumbnail_url: string | null;
  options: PreviewOption[];
}

interface PreviewResult {
  summary: {
    total_rows: number;
    total_products: number;
    total_options: number;
    multi_option_groups: number;
    images_uploaded: number;
  };
  products: PreviewProduct[];
}

export default function AdminImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "multi" | "single">("all");

  async function upload() {
    if (!file) return;
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      // 1) 서버에서 signed upload URL 발급
      const signRes = await fetch("/api/admin/import/sign-upload", {
        method: "POST",
      });
      if (!signRes.ok) {
        const j = await signRes.json().catch(() => ({}));
        throw new Error(j.error ?? "업로드 URL 발급 실패");
      }
      const { path, token } = (await signRes.json()) as {
        path: string;
        token: string;
      };

      // 2) Supabase Storage 에 직접 업로드 (Vercel 함수 본문 한도 우회)
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("imports")
        .uploadToSignedUrl(path, token, file);
      if (upErr) throw new Error(`업로드 실패: ${upErr.message}`);

      // 3) 서버에 path 만 전달해 미리보기 트리거
      const previewRes = await fetch("/api/admin/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await previewRes.json();
      if (!previewRes.ok) throw new Error(data.error || "미리보기 실패");
      setResult(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  async function commit() {
    if (!result) return;
    setCommitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: result.products.map((p) => ({
            group_key: p.group_key,
            name: p.name,
            slug: p.slug,
            origin: p.origin,
            supplier: p.supplier,
            thumbnail_url: p.thumbnail_url,
            options: p.options.map((o) => ({
              external_id: o.external_id,
              name: o.name,
              cost_price: o.cost_price,
              price: o.price,
              carrier: o.carrier,
              cutoff_time: o.cutoff_time,
              is_taxable: o.is_taxable,
            })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "임포트 실패");
      alert(
        `임포트 완료\n신규 상품: ${data.created}\n갱신: ${data.updated}\n비공개 처리: ${data.deactivated}`,
      );
      setResult(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setCommitting(false);
    }
  }

  const filtered = result
    ? result.products.filter((p) =>
        filter === "all"
          ? true
          : filter === "multi"
            ? p.options.length > 1
            : p.options.length === 1,
      )
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">상품 엑셀 임포트</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          산지이음에서 받은 "전체제품 엑셀"을 업로드하면 자동으로 그룹핑되어 미리보기로
          나타납니다. 확인 후 "임포트 확정"을 누르면 검수 대기(draft) 상태로 저장됩니다.
        </p>
      </div>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            엑셀 업로드
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
            className="block w-full max-w-sm rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm hover:bg-accent"
          />
          <Button onClick={upload} disabled={!file || loading}>
            {loading ? "분석 중..." : "미리보기 생성"}
          </Button>
          {file && (
            <span className="text-xs text-muted-foreground">
              <FileSpreadsheet className="inline h-3 w-3 mr-1" />
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </span>
          )}
        </CardContent>
      </Card>

      {err && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {err}
        </div>
      )}

      {result && (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="엑셀 행 수" value={result.summary.total_rows} />
            <SummaryCard
              label="추정 상품 수"
              value={result.summary.total_products}
            />
            <SummaryCard
              label="옵션(규격) 합계"
              value={result.summary.total_options}
            />
            <SummaryCard
              label="다중 옵션 그룹"
              value={result.summary.multi_option_groups}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 rounded-md border bg-white p-1 text-xs">
              {(["all", "multi", "single"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={
                    "rounded px-3 py-1 " +
                    (filter === k
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {k === "all"
                    ? "전체"
                    : k === "multi"
                      ? "옵션 ≥ 2"
                      : "단일 옵션"}
                </button>
              ))}
            </div>
            <Button
              onClick={commit}
              disabled={committing}
              className="ml-auto"
              size="lg"
            >
              {committing ? "저장 중..." : "임포트 확정"}
            </Button>
          </div>

          {/* Products preview */}
          <div className="space-y-3">
            {filtered.slice(0, 200).map((p) => (
              <ProductPreviewRow key={p.group_key} p={p} />
            ))}
            {filtered.length > 200 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                + {filtered.length - 200}개 더 있음 (스크롤 단순화로 처음 200개만 표시)
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

function ProductPreviewRow({ p }: { p: PreviewProduct }) {
  const [open, setOpen] = useState(false);
  const minPrice = Math.min(...p.options.map((o) => o.price));
  const maxPrice = Math.max(...p.options.map((o) => o.price));
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/30"
      >
        <div className="relative aspect-square h-14 shrink-0 overflow-hidden rounded-md bg-muted">
          {p.thumbnail_url ? (
            <Image
              src={p.thumbnail_url}
              alt={p.name}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-tight">{p.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {p.origin && <span className="mr-2">산지: {p.origin}</span>}
            {p.supplier && <span className="mr-2">출고: {p.supplier}</span>}
            <span>옵션 {p.options.length}개</span>
          </p>
        </div>
        <div className="text-right text-sm tabular-nums">
          {minPrice === maxPrice ? (
            formatKRW(minPrice)
          ) : (
            <>
              {formatKRW(minPrice)}{" "}
              <span className="text-xs text-muted-foreground">~</span>{" "}
              {formatKRW(maxPrice)}
            </>
          )}
        </div>
        <Badge variant={p.options.length > 1 ? "info" : "muted"}>
          {p.options.length > 1 ? "그룹" : "단독"}
        </Badge>
      </button>
      {open && (
        <div className="border-t bg-muted/20">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium">관리코드</th>
                <th className="px-4 py-2 text-left font-medium">옵션명</th>
                <th className="px-4 py-2 text-right font-medium">공급가</th>
                <th className="px-4 py-2 text-right font-medium">매장가</th>
                <th className="px-4 py-2 text-left font-medium">택배사</th>
                <th className="px-4 py-2 text-left font-medium">발주마감</th>
                <th className="px-4 py-2 text-center font-medium">이미지</th>
              </tr>
            </thead>
            <tbody>
              {p.options.map((o) => (
                <tr key={o.external_id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-mono">{o.external_id}</td>
                  <td className="px-4 py-2">{o.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {o.cost_price.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">
                    {o.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{o.carrier ?? "-"}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {o.cutoff_time ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {o.image_url ? (
                      <Layers className="mx-auto h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
