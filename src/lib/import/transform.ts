import { clusterRows, makeSlug, type ClusterGroup } from "./cluster";
import { extractOrigin, normalizeCutoff, normalizeSupplier } from "./normalize";
import type { ExcelRow } from "./parse";

export interface ImportPreviewOption {
  external_id: string;
  name: string;
  cost_price: number;
  price: number;          // cost_price * 1.5
  carrier: string | null;
  shipping_note: string | null;
  cutoff_time: string | null;
  is_taxable: boolean;
  has_image: boolean;
  image_filename: string | null;
}

export interface ImportPreviewProduct {
  group_key: string;
  name: string;
  slug: string;
  origin: string | null;
  supplier: string | null;
  thumbnail_filename: string | null;
  options: ImportPreviewOption[];
  total_options: number;
}

export interface ImportPreview {
  total_rows: number;
  total_products: number;
  total_options: number;
  products: ImportPreviewProduct[];
}

const MARKUP = 1.3;

export function buildPreview(rows: ExcelRow[]): ImportPreview {
  const groups = clusterRows(rows);
  const products = groups.map(toPreviewProduct);
  return {
    total_rows: rows.length,
    total_products: products.length,
    total_options: products.reduce((s, p) => s + p.options.length, 0),
    products,
  };
}

function toPreviewProduct(g: ClusterGroup): ImportPreviewProduct {
  const options: ImportPreviewOption[] = g.rows.map((r) => ({
    external_id: r.external_id,
    name: r.name,
    cost_price: r.cost_price,
    price: Math.round(r.cost_price * MARKUP),
    carrier: r.carrier,
    shipping_note: r.shipping_note,
    cutoff_time: normalizeCutoff(r.cutoff_raw),
    is_taxable: r.is_taxable,
    has_image: !!r.image,
    image_filename: r.image?.filename ?? null,
  }));

  // 그룹 대표 산지/도매처 = 첫 행 기준 (대부분 같은 그룹은 같은 출고지)
  const first = g.rows[0];
  const origin = extractOrigin(g.name) ?? extractOrigin(first.name);
  const supplier = normalizeSupplier(first.fulfillment);
  const thumbnailRow = g.rows.find((r) => r.image);
  return {
    group_key: g.groupKey,
    name: g.name,
    slug: makeSlug(g.name, g.rows[0].external_id),
    origin,
    supplier,
    thumbnail_filename: thumbnailRow?.image?.filename ?? null,
    options,
    total_options: options.length,
  };
}
