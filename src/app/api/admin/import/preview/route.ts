import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { parseSanjiieumXlsx } from "@/lib/import/parse";
import { buildPreview } from "@/lib/import/transform";
import { uploadImage } from "@/lib/import/storage";
import { isSupabaseConfigured } from "@/lib/mock-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 엑셀 업로드 → 파싱 → 그룹핑 결과를 미리보기 JSON 으로 반환.
 * 임베드 이미지는 Supabase Storage('product-images') 에 외부 ID 키로 업로드.
 * 같은 키 재업로드 시 덮어쓰므로 commit 단계에서 별도 이동 불필요.
 */
export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error:
          "Supabase 가 연결되어 있지 않아 임포트를 사용할 수 없습니다. .env.local 의 Supabase 키를 확인해주세요.",
      },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(new Uint8Array(arrayBuf));

  let rows;
  try {
    rows = await parseSanjiieumXlsx(buf);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "엑셀 파싱 실패" },
      { status: 400 },
    );
  }

  // 이미지 업로드를 병렬로 (한 번에 너무 많이 띄우지 않도록 배치)
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

  const preview = buildPreview(rows);
  const productsWithImg = preview.products.map((p) => {
    const optionsWithUrl = p.options.map((o) => ({
      ...o,
      image_url: urlByExternalId.get(o.external_id) ?? null,
    }));
    // 그룹 썸네일 = 그룹의 첫 옵션 중 이미지가 있는 것
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
