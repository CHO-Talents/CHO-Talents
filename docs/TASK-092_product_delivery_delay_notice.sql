-- TASK-092: 상품 배송 지연 안내 표시 여부
-- 상품 관리에서 선택한 안내 문구를 상품 구매 카드와 상세 모달에 표시합니다.

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS show_delivery_delay_notice boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.show_delivery_delay_notice IS
  '상품 구매 화면에 배송 지연 안내를 표시할지 여부';

COMMIT;
