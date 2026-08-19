-- TASK-105: 모든 달란트 지급의 지급 대상일을 해당 주 일요일로 통일
-- 실행 위치: Supabase Dashboard > SQL Editor
-- 선행 작업: TASK-099 (grant_date 컬럼), TASK-103 및 TASK-104 권장
--
-- 발생일이 일요일이면 당일을, 월~토요일이면 다음 일요일을 grant_date로 저장합니다.
-- 월별 달란트 관리에서 명시적으로 선택한 일요일은 변경하지 않습니다.

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_talent_grant_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_occurrence_date date;
BEGIN
  IF NEW.type = 'earn' THEN
    v_occurrence_date := COALESCE(
      (NEW.created_at AT TIME ZONE 'Asia/Seoul')::date,
      (now() AT TIME ZONE 'Asia/Seoul')::date
    );
    IF NEW.grant_date IS NULL OR NEW.grant_date = v_occurrence_date THEN
      NEW.grant_date := v_occurrence_date
        + ((7 - EXTRACT(DOW FROM v_occurrence_date)::integer) % 7);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_talent_grant_date_before_insert ON public.talent_transactions;
CREATE TRIGGER normalize_talent_grant_date_before_insert
  BEFORE INSERT ON public.talent_transactions
  FOR EACH ROW EXECUTE FUNCTION public.normalize_talent_grant_date();

NOTIFY pgrst, 'reload schema';

COMMIT;
