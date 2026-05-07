import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { parseSanjiieumXlsx } from "@/lib/import/parse";
import { buildPreview } from "@/lib/import/transform";
import { uploadImage } from "@/lib/import/storage";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 클라이언트가 imports 버킷에 직접 업로드한 엑셀의 path 를 받아
 * 파싱 → 임베드 이미지를 product-images 버킷에 업로드 → 그룹핑 미리보기 반환.
 *
 * 큰 파일을 Vercel 함수 본문(4.5MB 제한)으로 받지 않기 위해 Storage 우회 구조.
 */
export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 미연결" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as { path?: string } | null;
  const xlsxPath = body?.path;
  if (!xlsxPath) {
    return NextResponse.json({ error: "path 누락" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 1) Storage 에서 xlsx 다운로드
  const { data: file, error: dlErr } = await supabase.storage
    .from("imports")
    .download(xlsxPath);
  if (dlErr || !file) {
    return NextResponse.json(
      { error: dlErr?.message ?? "엑셀 다운로드 실패" },
      { status: 500 },
    );
  }
  const buf = Buffer.from(new Uint8Array(await file.arrayBuffer()));

  // 2) 파싱
  let rows;
  try {
    rows = await parseSanjiieumXlsx(buf);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "엑셀 파싱 실패" },
      { status: 400 },
    );
  }

  // 3) 임베드 이미지 → product-images 버킷에 병렬 업로드 (배치 8개)
  const BATCH = 8;
  const urlByExternalId = new Map<string, string>();
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async (r) => {
        if (!r.image) return null;
        const url = await uploadImage(
          r.external_id,
          r.image.filename,
          r.image.contentType,
          r.image.bytes,
        );
        return { ext: r.external_id, url };
      }),
    );
    for (const r of results) {
      if (r?.url) urlByExternalId.set(r.ext, r.url);
    }
  }

  // 4) 사용 끝난 xlsx 정리 (실패해도 무시)
  await supabase.storage.from("imports").remove([xlsxPath]).catch(() => {});

  // 5) 미리보기 빌드 + 이미지 URL 매핑
  const preview = buildPreview(rows);
  const productsWithImg = preview.products.map((p) => {
    const optionsWithUrl = p.options.map((o) => ({
      ...o,
      image_url: urlByExternalId.get(o.external_id) ?? null,
    }));
    const thumbOption = optionsWithUrl.find((o) => o.image_url);
    return {
      ...p,
      thumbnail_url: thumbOption?.image_url ?? null,
      options: optionsWithUrl,
    };
  });

  return NextResponse.json({
    summary: {
      total_rows: preview.total_rows,
      total_products: preview.total_products,
      total_options: preview.total_options,
      multi_option_groups: productsWithImg.filter((p) => p.options.length > 1)
        .length,
      images_uploaded: urlByExternalId.size,
    },
    products: productsWithImg,
  });
}
