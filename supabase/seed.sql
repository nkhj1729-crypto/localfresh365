-- 데모 시드 — schema.sql 실행 후 한 번 돌리면 화면 확인용 데이터가 들어갑니다.

with s as (
  insert into suppliers (name, contact, phone) values
    ('해남 청정농원',   '김영수', '010-1111-2222'),
    ('완도 수산',       '박민호', '010-3333-4444'),
    ('이천 햇살농가',   '정지원', '010-5555-6666')
  returning id, name
)
insert into products
  (supplier_id, category_id, name, slug, price, unit, origin, origin_detail, shipping_info, description, thumbnail_url, is_active)
select
  s.id,
  c.id,
  v.name, v.slug, v.price, v.unit, v.origin, v.origin_detail, v.shipping_info, v.description, v.thumb, true
from (values
  ('해남 청정농원', 'vegetable', '해남 햇 꿀고구마 5kg', 'haenam-sweet-potato',
    23000, '5kg / box', '전남 해남군',
    '해풍 맞고 자란 황토밭 꿀고구마. 산지에서 직접 선별 후 당일 발송합니다.',
    '일반택배 (CJ대한통운) / 평일 14시 이전 주문 시 당일 발송 / 제주·도서산간 +5,000원',
    '굽거나 쪄 먹기 좋은 호박고구마 계열로, 당도가 높고 식감이 부드럽습니다.',
    'https://images.unsplash.com/photo-1596097635121-14b38c5d7a55?w=800'),
  ('완도 수산',     'seafood',   '완도 활전복 1kg (10미)', 'wando-abalone',
    58000, '1kg (10미)', '전남 완도군',
    '청정해역 완도에서 자연산에 가까운 양식으로 길러낸 전복. 산소포장 후 아이스박스 발송.',
    '일반택배 (한진택배) / 평일 12시 이전 주문 시 당일 발송 / 도서산간 배송불가',
    '죽, 구이, 회 모두 잘 어울립니다. 손질 영상은 상세페이지 하단 참고.',
    'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800'),
  ('이천 햇살농가', 'grain',     '이천 임금님표 쌀 10kg', 'icheon-rice-10kg',
    42000, '10kg', '경기 이천시',
    '이천 들녘에서 수확한 추청 단일품종. 도정일자 기준 일주일 이내 발송.',
    '일반택배 (우체국택배) / 평일 15시 이전 주문 시 당일 발송',
    '갓 도정한 쌀 특유의 윤기와 찰기를 느낄 수 있습니다.',
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800'),
  ('해남 청정농원', 'fruit',     '해남 꿀배 5kg (대과)', 'haenam-pear',
    35000, '5kg / 9~11과', '전남 해남군',
    '일조량이 풍부한 해남 배밭에서 수확. 당도 13Brix 이상만 선별합니다.',
    '일반택배 (CJ대한통운) / 평일 14시 이전 주문 시 당일 발송',
    '아삭한 식감과 진한 단맛. 명절 선물용으로도 좋습니다.',
    'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800')
) as v(supplier_name, cat_slug, name, slug, price, unit, origin, origin_detail, shipping_info, description, thumb)
join s          on s.name  = v.supplier_name
join categories c on c.slug = v.cat_slug
on conflict (slug) do nothing;
