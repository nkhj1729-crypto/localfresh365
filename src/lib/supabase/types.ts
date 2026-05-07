export type OrderStatus =
  | "pending"
  | "confirmed"
  | "ordered"
  | "shipped"
  | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "접수 대기",
  confirmed: "확인 완료",
  ordered: "발주 완료",
  shipped: "배송중",
  cancelled: "취소",
};

export interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  memo: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  sort: number;
}

export interface ProductOption {
  id: string;
  product_id: string;
  external_id: string | null;
  name: string;
  cost_price: number;
  price: number;
  carrier: string | null;
  shipping_note: string | null;
  cutoff_time: string | null;
  is_taxable: boolean;
  is_active: boolean;
}

export interface Product {
  id: string;
  supplier_id: string | null;
  category_id: string | null;
  name: string;
  slug: string;
  origin: string | null;
  origin_detail: string | null;
  shipping_info: string;
  description: string | null;
  thumbnail_url: string | null;
  images: string[];
  external_group_key: string | null;
  is_draft: boolean;
  is_active: boolean;
  suppliers?: Pick<Supplier, "id" | "name"> | null;
  categories?: Pick<Category, "id" | "name" | "slug"> | null;
  product_options?: ProductOption[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  option_id: string | null;
  supplier_id: string | null;
  product_name: string;
  option_name: string;
  origin: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
  suppliers?: Pick<Supplier, "id" | "name"> | null;
}

export interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  shipping_address: string;
  shipping_zipcode: string | null;
  shipping_memo: string | null;
  total_amount: number;
  status: OrderStatus;
  tracking_carrier: string | null;
  tracking_number: string | null;
  admin_memo: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}
