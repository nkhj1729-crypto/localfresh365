import Link from "next/link";

export default function AdminAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="text-sm font-semibold">
              두울손 관리자
            </Link>
            <nav className="flex gap-5 text-sm text-muted-foreground">
              <Link href="/admin/orders" className="hover:text-foreground">
                주문 관리
              </Link>
              <Link href="/admin/products" className="hover:text-foreground">
                상품 관리
              </Link>
              <Link href="/admin/import" className="hover:text-foreground">
                상품 임포트
              </Link>
              <Link href="/" className="hover:text-foreground">
                매장 보기 →
              </Link>
            </nav>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button className="text-xs text-muted-foreground hover:text-foreground">
              로그아웃
            </button>
          </form>
        </div>
      </header>
      <div className="container py-8">{children}</div>
    </div>
  );
}
