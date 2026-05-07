export function SiteFooter() {
  return (
    <footer className="border-t bg-white">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="text-sm font-semibold">두울손 DUULSON</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              산지 직거래 농수산물 위탁판매. <br />
              생산자와 소비자를 잇는 신뢰의 유통.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">고객센터</p>
            <p className="mt-2 text-xs text-muted-foreground">평일 09:00 — 18:00</p>
            <p className="text-xs text-muted-foreground">점심 12:00 — 13:00 / 주말·공휴일 휴무</p>
          </div>
          <div>
            <p className="text-sm font-semibold">배송 안내</p>
            <p className="mt-2 text-xs text-muted-foreground">일반택배 / 평일 14시 이전 주문 시 당일 발송</p>
            <p className="text-xs text-muted-foreground">제주·도서산간 추가 배송비 발생</p>
          </div>
          <div>
            <p className="text-sm font-semibold">사업자 정보</p>
            <p className="mt-2 text-xs text-muted-foreground">상호: 두울손 / 대표: ○○○</p>
            <p className="text-xs text-muted-foreground">사업자등록번호: 000-00-00000</p>
          </div>
        </div>
        <div className="mt-10 border-t pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} DUULSON. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
