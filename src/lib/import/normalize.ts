/**
 * 산지이음 엑셀의 표기 변형들을 정규화한다.
 * 같은 의미의 다른 표기가 7가지 출고지/10가지 시간 등으로 들어옴.
 */

const SUPPLIER_MAP: Record<string, string> = {
  "물류출고": "물류 출고",
  "물류 출고": "물류 출고",
  "산지출고": "산지 출고",
  "산지 출고": "산지 출고",
  "오렌지씨물류": "오렌지씨 물류",
  "오렌지씨 물류": "오렌지씨 물류",
  "오렌지씨물류출고": "오렌지씨 물류",
  "오렌지씨 물류 출고": "오렌지씨 물류",
};

export function normalizeSupplier(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim();
  return SUPPLIER_MAP[key] ?? SUPPLIER_MAP[key.replace(/\s+/g, "")] ?? key;
}

/**
 * 발주마감시간 정규화. 'AM 8:30', 'AM 08:30', '08시 30분', '8:30' 등 → 'HH:MM'
 */
export function normalizeCutoff(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, "");
  const ampm = s.startsWith("PM") ? "PM" : "AM";
  const stripped = s.replace(/^(AM|PM)/, "");

  // "08시30분" / "8시30분"
  const m1 = stripped.match(/^(\d{1,2})시(\d{1,2})분?$/);
  // "08:30" / "8:30"
  const m2 = stripped.match(/^(\d{1,2}):(\d{1,2})$/);
  const m = m1 ?? m2;
  if (!m) return raw.trim();

  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * 상품명에서 산지 키워드를 추출.
 * 우선순위: 광역지명("전남 해남" 같은 패턴은 일단 미지원) > "국내산"/"국산" > "중국산" > 기타 외국산
 */
export function extractOrigin(name: string): string | null {
  if (!name) return null;
  if (/국내산|국산/.test(name)) return "국내산";
  if (/중국산/.test(name)) return "중국산";
  const m = name.match(/(미국산|호주산|일본산|뉴질랜드산|칠레산|페루산|베트남산|태국산|필리핀산|인도네시아산)/);
  if (m) return m[1];
  return null;
}
