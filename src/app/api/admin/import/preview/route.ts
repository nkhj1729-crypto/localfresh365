import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/admin";
import { parseSanjiieumXlsx } from "@/lib/import/parse";
import { buildPreview } from "@/lib/import/transform";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 엑셀 업로드 → 파싱 → 그룹핑 결과를 미리보기 JSON 으로 반환.
 * 임베드 이미지는 서버 디스크의 임시 디렉토리(`public/uploads/preview/<token>/`) 에 풀어두고,
 * 미리보기에서 `image_url` 로 노출. commit 시 같은 토큰의 폴더에서 옮겨서 영구 저장.
 */
export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);

  let rows;
  try {
    rows = await parseSanjiieumXlsx(buf);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "엑셀 파싱 실패" },
      { status: 400 },
    );
  }

  // 토큰별 임시 디렉토리에 이미지 풀기
  const token = makeToken();
  const dir = path.join(process.cwd(), "public", "uploads", "preview", token);
  await mkdir(dir, { recursive: true });
  for (const r of rows) {
    if (r.image) {
      await writeFile(path.join(dir, r.image.filename), r.image.bytes);
    }
  }

  // image_url 채워서 미리보기 빌드
  const preview = buildPreview(rows);
  const productsWithImg = preview.products.map((p) => ({
    ...p,
    thumbnail_url: p.thumbnail_filename
      ? `/uploads/preview/${token}/${p.thumbnail_filename}`
      : null,
    options: p.options.map((o) => ({
      ...o,
      image_url: o.image_filename
        ? `/uploads/preview/${token}/${o.image_filename}`
        : null,
    })),
  }));

  return NextResponse.json({
    token,
    summary: {
      total_rows: preview.total_rows,
      total_products: preview.total_products,
      total_options: preview.total_options,
      multi_option_groups: productsWithImg.filter((p) => p.options.length > 1).length,
    },
    products: productsWithImg,
  });
}

function makeToken() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
