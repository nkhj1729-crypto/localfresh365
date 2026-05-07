"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ORDER_STATUS_LABEL, type Order, type OrderStatus } from "@/lib/supabase/types";
import { formatDate, formatKRW } from "@/lib/utils";

const STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "ordered",
  "shipped",
  "cancelled",
];

const STATUS_VARIANT: Record<
  OrderStatus,
  "muted" | "warning" | "info" | "success" | "secondary"
> = {
  pending: "warning",
  confirmed: "info",
  ordered: "info",
  shipped: "success",
  cancelled: "muted",
};

const CARRIERS = ["CJ대한통운", "한진택배", "롯데택배", "우체국택배", "로젠택배"];

interface Props {
  order: Order;
  /** 행에 표시할 아이템들(특정 도매처만 보고 있을 땐 필터링됨) */
  visibleItems?: Order["order_items"];
}

export function OrderRow({ order, visibleItems }: Props) {
  const router = useRouter();
  const items = visibleItems ?? order.order_items ?? [];
  const supplierSubtotal = items.reduce((s, i) => s + i.subtotal, 0);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    status: order.status,
    tracking_carrier: order.tracking_carrier ?? "",
    tracking_number: order.tracking_number ?? "",
    admin_memo: order.admin_memo ?? "",
  });

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <TableRow>
      <TableCell className="align-top font-mono text-xs">
        <div>{order.order_no}</div>
        <div className="mt-0.5 text-muted-foreground">{formatDate(order.created_at)}</div>
      </TableCell>

      <TableCell className="align-top">
        <div className="font-medium">{order.customer_name}</div>
        <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {order.shipping_address}
        </div>
      </TableCell>

      <TableCell className="align-top">
        <ul className="space-y-1.5 text-sm">
          {items.map((i) => (
            <li key={i.id} className="leading-tight">
              <span className="font-medium">{i.product_name}</span>
              <span className="ml-1 text-xs text-muted-foreground">
                × {i.quantity}
              </span>
              <div className="text-xs text-muted-foreground">
                {i.option_name}
              </div>
            </li>
          ))}
        </ul>
      </TableCell>

      <TableCell className="align-top tabular-nums">
        {formatKRW(supplierSubtotal)}
      </TableCell>

      <TableCell className="align-top">
        <Badge variant={STATUS_VARIANT[order.status]}>
          {ORDER_STATUS_LABEL[order.status]}
        </Badge>
      </TableCell>

      <TableCell className="align-top">
        {order.tracking_number ? (
          <div className="text-xs">
            <div>{order.tracking_carrier}</div>
            <div className="font-mono">{order.tracking_number}</div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">미등록</span>
        )}
      </TableCell>

      <TableCell className="align-top">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              관리
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>주문 #{order.order_no}</DialogTitle>
              <DialogDescription>
                상태를 변경하거나 송장 번호를 입력합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block">상태</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as OrderStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ORDER_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-[160px_1fr] gap-3">
                <div>
                  <Label className="mb-1.5 block">택배사</Label>
                  <Select
                    value={form.tracking_carrier}
                    onValueChange={(v) =>
                      setForm({ ...form, tracking_carrier: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARRIERS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">송장 번호</Label>
                  <Input
                    placeholder="123456789012"
                    value={form.tracking_number}
                    onChange={(e) =>
                      setForm({ ...form, tracking_number: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block">관리자 메모</Label>
                <Textarea
                  rows={3}
                  value={form.admin_memo}
                  onChange={(e) =>
                    setForm({ ...form, admin_memo: e.target.value })
                  }
                />
              </div>

              <p className="text-xs text-muted-foreground">
                * 송장 번호를 입력하고 저장하면 상태가 자동으로 “배송중”으로
                변경됩니다.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                취소
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}
