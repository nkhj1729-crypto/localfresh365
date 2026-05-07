"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  /** 카트 라인 식별자 = product_id + option_id */
  line_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  option_id: string;
  option_name: string;
  origin: string | null;
  supplier_id: string | null;
  unit_price: number;
  quantity: number;
  thumbnail_url: string | null;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, "line_id" | "quantity">, qty?: number) => void;
  remove: (lineId: string) => void;
  setQuantity: (lineId: string, qty: number) => void;
  clear: () => void;
  totalCount: () => number;
  totalAmount: () => number;
}

const lineId = (productId: string, optionId: string) =>
  `${productId}::${optionId}`;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) =>
        set((state) => {
          const id = lineId(item.product_id, item.option_id);
          const existing = state.items.find((i) => i.line_id === id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.line_id === id ? { ...i, quantity: i.quantity + qty } : i,
              ),
            };
          }
          return {
            items: [...state.items, { ...item, line_id: id, quantity: qty }],
          };
        }),
      remove: (lineId) =>
        set((state) => ({
          items: state.items.filter((i) => i.line_id !== lineId),
        })),
      setQuantity: (lineId, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.line_id === lineId
              ? { ...i, quantity: Math.max(1, qty) }
              : i,
          ),
        })),
      clear: () => set({ items: [] }),
      totalCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
      totalAmount: () =>
        get().items.reduce((s, i) => s + i.unit_price * i.quantity, 0),
    }),
    { name: "duulson-cart", version: 2 },
  ),
);
