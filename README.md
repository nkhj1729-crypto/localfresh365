# 두울손 (DUULSON) — 농수산물 위탁판매 쇼핑몰

산지 직거래 농수산물의 **위탁판매**에 특화된 Next.js + Supabase 쇼핑몰입니다.
재고 관리는 의도적으로 생략했고, **주문 → 관리자 확인 → 도매처 발주 → 송장 등록**의
업무 흐름에 집중합니다.

## 기술 스택

- Next.js 14 (App Router, RSC)
- TypeScript
- Tailwind CSS + Shadcn UI 스타일 컴포넌트
- Supabase (Postgres + RLS)
- Zustand (장바구니 클라이언트 상태)

## 디렉토리

```
src/
├─ app/
│  ├─ (storefront)
│  │   page.tsx                       홈
│  │   products/page.tsx               상품 리스트 (카테고리 필터)
│  │   products/[slug]/page.tsx        상품 상세 (산지·배송 강조)
│  │   cart/page.tsx                   장바구니
│  │   checkout/page.tsx               주문서
│  │   checkout/complete/page.tsx      주문 완료
│  ├─ admin/
│  │   layout.tsx, page.tsx            대시보드
│  │   login/page.tsx                  관리자 로그인
│  │   orders/page.tsx                 도매처별 주문 테이블 + 송장 입력
│  └─ api/
│      orders/route.ts                 주문 생성
│      admin/login|logout              로그인 쿠키
│      admin/orders/[id]               상태/송장 업데이트
├─ components/ui/                      Shadcn 스타일 기본 컴포넌트
├─ lib/supabase/                       browser/server/service 클라이언트, 타입
├─ store/cart.ts                       Zustand 장바구니
└─ middleware.ts                       /admin 보호
supabase/
   schema.sql                          테이블·정책·트리거
   seed.sql                            데모 데이터
```

## 시작하기

### 1. 의존성 설치

```powershell
npm install
```

### 2. Supabase 프로젝트 준비

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. **SQL Editor** 에서 `supabase/schema.sql` 실행
3. (선택) 데모 데이터를 보고 싶다면 `supabase/seed.sql` 도 실행

### 3. 환경 변수

`.env.example` 을 `.env.local` 로 복사하고 값을 채워주세요.

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # 주문 생성/관리에 사용
ADMIN_PASSWORD=원하는관리자비밀번호
```

### 4. 개발 서버 실행

```powershell
npm run dev
```

- 매장: <http://localhost:3000>
- 관리자: <http://localhost:3000/admin/login>

## 운영 흐름

1. 고객이 상품 상세 → 장바구니 → 주문서 작성
2. `/api/orders` 가 주문/주문상품을 Supabase 에 기록 (`status: pending`)
3. 관리자가 `/admin/orders` 에서 **도매처별** 그리드로 확인
   - 발주가 끝나면 상태를 `발주 완료(ordered)` 로
   - 송장 번호를 입력·저장하면 자동으로 `배송중(shipped)` 으로 전환
4. 송장은 동일 다이얼로그에서 택배사·번호·메모와 함께 관리

## 데이터 모델 요약

- `suppliers` — 도매처 (이름, 담당자, 연락처)
- `categories` — 카테고리 (slug, 이름)
- `products` — 상품 (가격, 산지, 산지 상세, 배송 안내, 도매처 FK)
- `orders` — 주문 (주문번호, 고객정보, 배송지, 총액, 상태, 송장)
- `order_items` — 주문 상품 (도매처 ID 스냅샷 → 도매처별 그루핑에 사용)

재고는 별도 테이블이나 컬럼이 없습니다. **상품을 비활성화하려면 `is_active = false`** 로
바꾸면 매장에 노출되지 않습니다.

## RLS 정책

- 익명 사용자: 활성 상품·카테고리·도매처명 **읽기**, 주문/주문상품 **삽입** 가능
- 주문 조회/수정은 `service_role` 키를 가진 서버 라우트만 수행

## 디자인 시스템

- 톤: 화이트 + 뉴트럴 그레이 + 포인트(에메랄드/스카이) — 미니멀 비즈니스
- 컴포넌트: Shadcn UI 변형(`src/components/ui/*`)
- 폰트: Pretendard 우선 (없으면 시스템 폰트)
