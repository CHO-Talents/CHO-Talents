-- TASK-112: 구매 목록 프로필 표시 범위 보정
-- 실행 위치: Supabase Dashboard > SQL Editor
--
-- 목적
--   구매 목록 자체의 기존 권한 범위는 유지하면서, 목록에 표시된 주문의
--   신청자·부서·이전 처리자 정보를 담당 부서와 관계없이 표시한다.
--
-- 목록 범위(프런트엔드)는 변경하지 않는다.
--   * 부서 담당 교사: 기존 담당 부서 주문만 표시
--   * 부장 교사: 기존 전체 주문 목록 표시, 담당 부서 밖 주문은 처리 권한 없음
--   * 구매 담당 교사/전도사님 이상: 기존 전체 주문 목록 표시

BEGIN;

CREATE OR REPLACE FUNCTION public.get_purchase_order_profiles(
  p_user_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  user_type text,
  department_id uuid,
  class_number integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_permission text;
  v_caller_rank integer;
  v_caller_managed_dept_id uuid;
BEGIN
  IF auth.uid() IS NULL OR COALESCE(array_length(p_user_ids, 1), 0) = 0 THEN
    RETURN;
  END IF;

  -- RETURNS TABLE의 department_id 출력 변수와 충돌하지 않도록 호출자 프로필의
  -- 컬럼은 모두 테이블 별칭으로 명시한다.
  SELECT caller.permission_level,
         public.get_permission_rank(caller.permission_level),
         COALESCE(caller.managed_dept_id, caller.department_id)
  INTO v_caller_permission,
       v_caller_rank,
       v_caller_managed_dept_id
  FROM public.profiles AS caller
  WHERE caller.id = auth.uid();

  IF v_caller_permission IS NULL OR v_caller_rank < 60 THEN
    RAISE EXCEPTION 'Unauthorized purchase profile access';
  END IF;

  -- 부장 교사는 기존처럼 모든 주문을 목록에서 볼 수 있으므로, 해당 주문에 연결된
  -- 신청자와 처리자의 최소 프로필 정보를 모두 표시한다. 구매 담당 교사와 90+도 같다.
  IF v_caller_rank >= 80 OR v_caller_permission = 'purchase_teacher' THEN
    RETURN QUERY
      SELECT p.id,
             p.display_name,
             CASE WHEN v_caller_rank >= 100 THEN p.username ELSE NULL END,
             p.user_type,
             p.department_id,
             p.class_number
      FROM public.profiles p
      WHERE p.id = ANY(p_user_ids)
        AND EXISTS (
          SELECT 1
          FROM public.product_orders o
          WHERE p.id = o.user_id
             OR p.id = o.prepared_by
             OR p.id = o.purchased_by
             OR p.id = o.delivered_by
        );
    RETURN;
  END IF;

  -- 부서 담당 교사는 기존 주문 목록 범위(신청자 소속이 관리 부서인 주문)를 유지한다.
  -- 단, 그 주문을 다른 부서 계정이 이전 처리한 경우에도 처리자 이름은 표시한다.
  IF v_caller_permission = 'dept_teacher'
    AND v_caller_managed_dept_id IS NOT NULL THEN
    RETURN QUERY
      SELECT p.id,
             p.display_name,
             CASE WHEN v_caller_rank >= 100 THEN p.username ELSE NULL END,
             p.user_type,
             p.department_id,
             p.class_number
      FROM public.profiles p
      WHERE p.id = ANY(p_user_ids)
        AND EXISTS (
          SELECT 1
          FROM public.product_orders o
          JOIN public.profiles requester ON requester.id = o.user_id
          WHERE requester.department_id = v_caller_managed_dept_id
            AND (
              p.id = o.user_id
              OR p.id = o.prepared_by
              OR p.id = o.purchased_by
              OR p.id = o.delivered_by
            )
        );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_purchase_order_profiles(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_purchase_order_profiles(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_purchase_order_profiles(uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verification
-- 1. 부서 담당 교사: 주문 목록 건수는 기존과 같고, 이전 처리자가 다른 부서여도 이름이 표시된다.
-- 2. 부장 교사: 모든 주문 행에서 신청자·부서·이전 처리자 정보가 표시된다.
-- 3. 구매 담당 교사/전도사님 이상: 기존 전체 목록 및 프로필 표시가 유지된다.
