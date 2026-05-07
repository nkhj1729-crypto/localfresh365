import type { ExcelRow } from "./parse";

/**
 * 그룹핑 알고리즘.
 *
 * 핵심 아이디어:
 *  - 상품명을 토큰화(공백/괄호/대시 분리)하고 숫자+단위 토큰을 제거한 "skeleton" 을 만든다.
 *  - skeleton 토큰들이 ≥ MIN_COMMON 개 이상 공통이면서 차이 토큰이 ≤ MAX_DIFF 인 행끼리 묶는다.
 *  - 단독 상품도 그룹 1개짜리로 만든다.
 *  - 이름은 그룹 내 모든 행의 토큰 교집합(원래 순서 보존)으로 정한다.
 *
 * 100% 정확한 알고리즘은 아니므로 관리자 미리보기에서 분리/병합을 보정한다.
 */

const MIN_COMMON = 1;     // 공통 토큰 최소
const MAX_DIFF_RATIO = 0.6; // 차이 토큰이 전체 토큰의 60%를 넘으면 다른 그룹

const UNIT_REGEX = /^(\d+(\.\d+)?)(kg|g|ml|l|개|입|미|팩|박스|봉|cm|호|구|매|개입|포기|마리|조각|장|병)?$/i;
const RANGE_REGEX = /^\d+~\d+/;
const SIZE_REGEX = /^\d+cm/;

export interface ClusterGroup {
  name: string;             // 추론된 상품명
  rows: ExcelRow[];
  /** 안정적인 그룹 식별자 (관리코드 정렬해서 join) */
  groupKey: string;
}

export function clusterRows(rows: ExcelRow[]): ClusterGroup[] {
  // 각 행의 (orderedTokens, skeletonSet)
  type Tagged = {
    row: ExcelRow;
    tokens: string[];        // 순서 보존 토큰
    skeleton: Set<string>;   // 정량 제거 후
  };

  const tagged: Tagged[] = rows.map((row) => {
    const tokens = tokenize(row.name);
    const skeleton = new Set(
      tokens.filter((t) => !isQuantityToken(t)),
    );
    return { row, tokens, skeleton };
  });

  // 동일한 skeleton 키를 가진 것들을 묶는 1차 패스
  // skeleton 정렬해서 join → 정확히 같은 skeleton 인 그룹
  const exactBuckets = new Map<string, Tagged[]>();
  for (const t of tagged) {
    const key = [...t.skeleton].sort().join("");
    const arr = exactBuckets.get(key) ?? [];
    arr.push(t);
    exactBuckets.set(key, arr);
  }

  // 2차 패스: 작은 그룹을 더 큰 그룹과 합칠지 보기 — 토큰 차이 ≤ MAX_DIFF_RATIO 면 같이
  // (현재는 단순화: 정확 매칭만 사용. 휴리스틱 한계는 admin UI 에서 수동 병합으로 보정)
  void MIN_COMMON;
  void MAX_DIFF_RATIO;

  const groups: ClusterGroup[] = [];
  for (const list of exactBuckets.values()) {
    if (!list.length) continue;
    // 그룹의 공통 토큰 = 모든 행의 토큰 교집합 (원래 순서 보존)
    const commonName = computeCommonName(list.map((t) => t.tokens));
    const sortedRows = list
      .map((t) => t.row)
      .sort((a, b) => a.cost_price - b.cost_price);
    const groupKey = sortedRows
      .map((r) => r.external_id)
      .sort()
      .join("|");
    groups.push({
      name: commonName || sortedRows[0].name,
      rows: sortedRows,
      groupKey,
    });
  }

  // 큰 그룹 먼저
  return groups.sort((a, b) => b.rows.length - a.rows.length);
}

function tokenize(s: string): string[] {
  return s
    .replace(/[(),]/g, " ")  // 괄호/쉼표를 공백으로
    .split(/\s+/)
    .filter(Boolean);
}

function isQuantityToken(t: string): boolean {
  return UNIT_REGEX.test(t) || RANGE_REGEX.test(t) || SIZE_REGEX.test(t);
}

/**
 * 그룹의 공통 이름:
 * - 모든 행의 토큰 시퀀스에서 공통으로 등장하는 토큰을 첫 행의 순서대로 골라낸다.
 * - 정량 토큰은 포함하되 모든 행에 공통이어야 한다.
 */
function computeCommonName(tokenSeqs: string[][]): string {
  if (tokenSeqs.length === 0) return "";
  if (tokenSeqs.length === 1) {
    // 단독 상품: 정량까지 포함한 이름 그대로
    return tokenSeqs[0].join(" ");
  }
  const sets = tokenSeqs.map((s) => new Set(s));
  const result: string[] = [];
  const used = new Set<string>();
  for (const tok of tokenSeqs[0]) {
    if (used.has(tok)) continue;
    if (sets.every((s) => s.has(tok))) {
      result.push(tok);
      used.add(tok);
    }
  }
  return result.join(" ");
}

/**
 * 슬러그 생성 — 한글 그대로 두고 공백/특수문자만 정리.
 */
export function makeSlug(name: string, fallback: string): string {
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug.length >= 2 ? slug : `item-${fallback}`;
}
