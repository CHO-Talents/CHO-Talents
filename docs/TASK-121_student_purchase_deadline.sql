-- 한국시간 2026-11-25 00:00:00부터 학생 명의의 신규 주문을 차단한다.
BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_student_purchase_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF clock_timestamp() >= TIMESTAMPTZ '2026-11-25 00:00:00+09:00'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.user_id AND user_type = 'student'
    ) THEN
    RAISE EXCEPTION '학생 달란트 구매 신청이 마감되었습니다.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_student_purchase_deadline() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_student_purchase_deadline ON public.product_orders;
CREATE TRIGGER enforce_student_purchase_deadline
  BEFORE INSERT ON public.product_orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_purchase_deadline();

COMMIT;
