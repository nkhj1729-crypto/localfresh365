import * as XLSX from "xlsx";
import JSZip from "jszip";

export interface ExcelRow {
  rowIndex: number;            // 시트 0-based 행 번호 (헤더 = 0, 첫 데이터 = 1)
  external_id: string;         // 관리코드
  name: string;                 // 상품명
  cost_price: number;           // 공급가
  is_taxable: boolean;          // 과세여부
  fulfillment: string | null;   // 출고지(원본)
  carrier: string | null;       // 택배사
  shipping_note: string | null; // 택배비
  cutoff_raw: string | null;    // 발주마감시간(원본)
  image: ExcelImage | null;
}

export interface ExcelImage {
  filename: string;       // ex: thumb1_xxx.jpg
  contentType: string;    // image/jpeg
  bytes: Buffer;
}

/**
 * 산지이음 엑셀(.xlsx) 한 파일을 파싱해서 행 + 임베드 이미지를 추출한다.
 */
export async function parseSanjiieumXlsx(buf: ArrayBuffer | Buffer): Promise<ExcelRow[]> {
  const u8: Buffer = buf instanceof Buffer ? buf : Buffer.from(new Uint8Array(buf));

  // 1) 행 데이터 파싱
  const wb = XLSX.read(u8, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  // 2) 임베드 이미지 매핑 추출 (행 번호 → 이미지 파일)
  const imagesByRow = await extractImagesByRow(u8);

  // 3) 한 줄로 합치기
  return rows.map((r, i) => {
    const rowIndex = i + 1; // 헤더가 row 0 — 데이터는 row 1 부터
    const external_id = String(r["관리코드"] ?? "").trim();
    return {
      rowIndex,
      external_id,
      name: String(r["상품명"] ?? "").trim(),
      cost_price: toInt(r["공급가"]),
      is_taxable: r["과세여부"] === "과세",
      fulfillment: nullable(r["출고지"]),
      carrier: nullable(r["택배사"]),
      shipping_note: nullable(r["택배비"]),
      cutoff_raw: nullable(r["발주마감시간"]),
      image: imagesByRow.get(rowIndex) ?? null,
    } satisfies ExcelRow;
  }).filter((r) => r.external_id && r.name);
}

function toInt(v: unknown): number {
  if (typeof v === "number") return Math.round(v);
  if (typeof v === "string") return parseInt(v.replace(/[^0-9]/g, ""), 10) || 0;
  return 0;
}
function nullable(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/**
 * xl/drawings/drawing1.xml + drawing1.xml.rels 파싱:
 * <xdr:oneCellAnchor> 의 <xdr:from><xdr:row>N</xdr:row> 가 데이터 행 번호 (헤더 = 0).
 * <a:blip r:embed="rIdK"/> → rels 의 rIdK → ../media/<file>.jpg
 */
async function extractImagesByRow(
  buf: Buffer,
): Promise<Map<number, ExcelImage>> {
  const map = new Map<number, ExcelImage>();
  const zip = await JSZip.loadAsync(buf);
  const drawingFile = zip.file("xl/drawings/drawing1.xml");
  const relsFile = zip.file("xl/drawings/_rels/drawing1.xml.rels");
  if (!drawingFile || !relsFile) return map;

  const drawingXml = await drawingFile.async("string");
  const relsXml = await relsFile.async("string");

  // rId → media 경로
  const ridToTarget = new Map<string, string>();
  for (const m of relsXml.matchAll(
    /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g,
  )) {
    ridToTarget.set(m[1], m[2]);
  }

  // anchor 별로 row + rId 추출
  const anchorRegex = /<xdr:(?:oneCellAnchor|twoCellAnchor)[\s\S]*?<\/xdr:(?:oneCellAnchor|twoCellAnchor)>/g;
  for (const a of drawingXml.matchAll(anchorRegex)) {
    const block = a[0];
    const rowMatch = block.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?<\/xdr:from>/);
    const ridMatch = block.match(/r:embed="([^"]+)"/);
    if (!rowMatch || !ridMatch) continue;
    const row = parseInt(rowMatch[1], 10);
    const target = ridToTarget.get(ridMatch[1]);
    if (!target) continue;

    // target 은 "../media/thumb_xxx.jpg" 형태 — 절대경로로
    const path = target.replace(/^\.\.\//, "xl/");
    const file = zip.file(path);
    if (!file) continue;
    const bytes = await file.async("nodebuffer");
    const filename = path.split("/").pop()!;
    const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
    const contentType =
      ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";

    map.set(row, { filename, contentType, bytes });
  }

  return map;
}
