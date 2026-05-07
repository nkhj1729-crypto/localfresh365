import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutCompletePage({
  searchParams,
}: {
  searchParams: { no?: string };
}) {
  return (
    <div className="container py-24">
      <div className="mx-auto max-w-md rounded-lg border bg-white p-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-6 text-xl font-semibold">주문이 접수되었습니다</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          주문번호 <span className="font-mono font-semibold text-foreground">{searchParams.no}</span>
          <br />
          관리자가 확인 후 산지로 발주를 진행하며,
          <br />
          입금 안내 및 송장 정보는 등록된 연락처로 안내드립니다.
        </p>
        <div className="mt-8 flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/products">계속 쇼핑하기</Link>
          </Button>
          <Button asChild>
            <Link href="/">홈으로</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
