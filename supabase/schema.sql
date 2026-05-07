-- 두울손 농수산물 위탁판매 — 데이터베이스 스키마
-- Supabase 프로젝트 SQL Editor 에서 실행하세요.

-- 도매처(공급사) — 산지이음 엑셀 출고지(물류출고/산지출고/오렌지씨물류 등) 정규화 후 적재
create table if not exists suppliers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  contact     text,
  phone       text,
  memo        text,
  created_at  timestamptz not null default now()
);

-- 카테고리
create table if not exists categories (
  id    uuid primary key default gen_random_uuid(),
  slug  text unique not null,
  name  text not null,
  sort  int  not null default 0
);

-- 상품 (재고 미관리, 주문 → 발주 흐름)
-- 한 상품에 여러 옵션(규격)이 붙는 구조. 가격은 product_options 에서 옵션별로 결정.
create table if not exists products (
  id                  uuid primary key default gen_random_uuid(),
  supplier_id         uuid references suppliers(id) on delete restrict,
  category_id         uuid references categories(id) on delete set null,
  name                text not null,                  -- 그룹핑된 상품명(공통 부분)
  slug                text unique not null,
  origin              text,                           -- 산지 (관리자 입력 / 자동추출)
  origin_detail       text,
  shipping_info       text not null default '일반택배 / 평일 14시 이전 주문 시 당일 발송',
  description         text,                           -- 관리자 작성 상세설명
  thumbnail_url       text,                           -- 임포트 시 엑셀에서 추출한 썸네일
  images              jsonb not null default '[]'::jsonb,
  external_group_key  text,                           -- 그룹핑 결과 키 (관리코드 묶음 해시)
  is_draft            boolean not null default true,  -- true: 검수 대기, false: 공개됨
  is_active           boolean not null default false, -- 매장 노출 여부 (draft=false 이면서 active=true 일 때만 노출)
  external_synced_at  timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists products_supplier_idx on products(supplier_id);
create index if not exists products_category_idx on products(category_id);
create index if not exists products_visible_idx on products(is_draft, is_active);

-- 옵션(규격) — 산지이음 엑셀의 한 행 = 한 옵션
create table if not exists product_options (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products(id) on delete cascade,
  external_id     text unique,                  -- 산지이음 관리코드 (1:1)
  name            text not null,                -- 엑셀 상품명 그대로 (옵션 표시용)
  cost_price      int  not null check (cost_price >= 0),  -- 산지이음 공급가
  price           int  not null check (price >= 0),       -- 매장가 (cost_price * 1.5)
  carrier         text,                         -- 택배사
  shipping_note   text,                         -- 택배비 안내(자유 텍스트)
  cutoff_time     text,                         -- 발주마감시간
  is_taxable      boolean not null default false,
  is_active       boolean not null default true, -- 엑셀 재임포트 시 사라지면 false
  external_synced_at timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists product_options_product_idx on product_options(product_id);
create index if not exists product_options_active_idx on product_options(is_active);

-- 주문
create type order_status as enum (
  'pending', 'confirmed', 'ordered', 'shipped', 'cancelled'
);

create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  order_no          text unique not null,
  customer_name     text not null,
  customer_phone    text not null,
  customer_email    text,
  shipping_address  text not null,
  shipping_zipcode  text,
  shipping_memo     text,
  total_amount      int  not null,
  status            order_status not null default 'pending',
  tracking_carrier  text,
  tracking_number   text,
  admin_memo        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists orders_status_idx on orders(status);
create index if not exists orders_created_idx on orders(created_at desc);

-- 주문 상품 (option_id + name + price 스냅샷 — 옵션이 사라져도 주문 이력 보존)
create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  option_id     uuid references product_options(id) on delete set null,
  supplier_id   uuid references suppliers(id) on delete set null,
  product_name  text not null,                  -- 그룹 상품명 스냅샷
  option_name   text not null,                  -- 선택된 옵션명 스냅샷 (= 산지이음 상품명)
  origin        text,
  unit_price    int  not null,
  quantity      int  not null check (quantity > 0),
  subtotal      int  not null,
  created_at    timestamptz not null default now()
);

create index if not exists order_items_order_idx on order_items(order_id);
create index if not exists order_items_supplier_idx on order_items(supplier_id);

-- updated_at 자동 갱신
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated
before update on orders
for each row execute function set_updated_at();

-- RLS
alter table suppliers       enable row level security;
alter table categories      enable row level security;
alter table products        enable row level security;
alter table product_options enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;

drop policy if exists "public read suppliers"     on suppliers;
drop policy if exists "public read categories"    on categories;
drop policy if exists "public read products"      on products;
drop policy if exists "public read options"       on product_options;
drop policy if exists "anon insert orders"        on orders;
drop policy if exists "anon insert order_items"   on order_items;

create policy "public read suppliers"   on suppliers       for select using (true);
create policy "public read categories"  on categories      for select using (true);
create policy "public read products"    on products        for select using (is_draft = false and is_active = true);
create policy "public read options"     on product_options for select using (is_active = true);
create policy "anon insert orders"      on orders          for insert with check (true);
create policy "anon insert order_items" on order_items     for insert with check (true);

-- 시드 데이터
insert into categories (slug, name, sort) values
  ('vegetable', '채소',  10),
  ('fruit',     '과일',  20),
  ('seafood',   '수산물', 30),
  ('grain',     '곡물',  40)
on conflict (slug) do nothing;
