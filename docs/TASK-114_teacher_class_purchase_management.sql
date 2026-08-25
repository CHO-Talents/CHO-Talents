-- TASK-114: 일반 교사의 담당 부서·반 구매 관리 권한
-- 실행 위치: Supabase Dashboard > SQL Editor
--
-- 일반 교사(permission_level = teacher, rank 40)는 자신의 소속 부서·반에 속한
-- 학생의 주문만 조회하고, 구매 신청을 상품 준비로 처리할 수 있습니다.
-- 다른 학생·교사 주문은 RLS와 RPC 양쪽에서 모두 차단합니다.

BEGIN;

-- RLS와 주문 처리 RPC가 공통으로 사용할 담당 학생 판별 함수입니다.
CREATE OR REPLACE FUNCTION public.can_manage_class_purchase_order(
  p_order_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_permission text;
  v_caller_rank integer;
  v_caller_department_id uuid;
  v_caller_class_number integer;
  v_target_user_type text;
  v_target_department_id uuid;
  v_target_class_number integer;
BEGIN
  IF auth.uid() IS NULL OR p_order_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.permission_level,
         public.get_permission_rank(p.permission_level),
         p.department_id,
         p.class_number
  INTO v_caller_permission,
       v_caller_rank,
       v_caller_department_id,
       v_caller_class_number
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_caller_permission IS DISTINCT FROM 'teacher'
     OR v_caller_rank <> 40
     OR v_caller_department_id IS NULL
     OR v_caller_class_number IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.user_type,
         p.department_id,
         p.class_number
  INTO v_target_user_type,
       v_target_department_id,
       v_target_class_number
  FROM public.profiles p
  WHERE p.id = p_order_user_id;

  RETURN v_target_user_type = 'student'
    AND v_target_department_id = v_caller_department_id
    AND v_target_class_number IS NOT DISTINCT FROM v_caller_class_number;
END;
$$;

-- 일반 교사에게 추가하는 주문 조회 범위는 담당 학생 주문으로 한정합니다.
DROP POLICY IF EXISTS "Teachers can view own class orders" ON public.product_orders;
CREATE POLICY "Teachers can view own class orders"
  ON public.product_orders
  FOR SELECT TO authenticated
  USING (public.can_manage_class_purchase_order(user_id));

-- 구매 목록에 표시하는 최소 프로필 정보도 같은 주문 범위를 따릅니다.
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

  SELECT caller.permission_level,
         public.get_permission_rank(caller.permission_level),
         COALESCE(caller.managed_dept_id, caller.department_id)
  INTO v_caller_permission,
       v_caller_rank,
       v_caller_managed_dept_id
  FROM public.profiles AS caller
  WHERE caller.id = auth.uid();

  IF v_caller_permission IS NULL OR v_caller_rank < 40 THEN
    RAISE EXCEPTION 'Unauthorized purchase profile access';
  END IF;

  -- 부장 교사, 구매 담당 교사, 전도사님 이상은 기존 범위를 유지합니다.
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

  -- 부서 담당 교사는 기존처럼 관리 부서 주문의 신청자·처리자만 확인합니다.
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
    RETURN;
  END IF;

  -- 일반 교사는 담당 학생 주문에 연결된 신청자·처리자 최소 정보만 확인합니다.
  IF v_caller_permission = 'teacher' AND v_caller_rank = 40 THEN
    RETURN QUERY
      SELECT p.id,
             p.display_name,
             NULL::text,
             p.user_type,
             p.department_id,
             p.class_number
      FROM public.profiles p
      WHERE p.id = ANY(p_user_ids)
        AND EXISTS (
          SELECT 1
          FROM public.product_orders o
          JOIN public.profiles requester ON requester.id = o.user_id
          WHERE public.can_manage_class_purchase_order(requester.id)
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

-- 상태 전이는 화면 검증과 별개로 서버에서 다시 반·부서 범위를 확인합니다.
CREATE OR REPLACE FUNCTION public.process_product_order(
  p_order_id uuid,
  p_new_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.product_orders%ROWTYPE;
  v_caller_permission text;
  v_caller_managed_dept_id uuid;
  v_caller_rank integer;
  v_order_department_id uuid;
  v_purchase_result json;
  v_allowed boolean := false;
BEGIN
  SELECT * INTO v_order
  FROM public.product_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN json_build_object('success', false, 'error', '주문을 찾을 수 없습니다.');
  END IF;

  SELECT permission_level,
         managed_dept_id
  INTO v_caller_permission,
       v_caller_managed_dept_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_permission IS NULL THEN
    RETURN json_build_object('success', false, 'error', '구매 처리 권한이 없습니다.');
  END IF;

  SELECT department_id
  INTO v_order_department_id
  FROM public.profiles
  WHERE id = v_order.user_id;

  v_caller_rank := public.get_permission_rank(v_caller_permission);

  IF v_caller_rank >= 90 OR v_caller_permission = 'purchase_teacher' THEN
    v_allowed := (v_order.status = 'requested' AND p_new_status IN ('preparing', 'cancelled'))
      OR (v_order.status = 'preparing' AND p_new_status IN ('purchased', 'requested'))
      OR (v_order.status = 'purchased' AND p_new_status = 'delivered');
  ELSIF v_caller_permission IN ('dept_teacher', 'chief')
    AND v_caller_managed_dept_id IS NOT NULL
    AND v_caller_managed_dept_id = v_order_department_id THEN
    v_allowed := v_order.status = 'requested' AND p_new_status IN ('preparing', 'cancelled');
  ELSIF v_caller_permission = 'teacher'
    AND public.can_manage_class_purchase_order(v_order.user_id) THEN
    v_allowed := v_order.status = 'requested' AND p_new_status = 'preparing';
  END IF;

  IF NOT v_allowed THEN
    RETURN json_build_object('success', false, 'error', '현재 권한으로는 이 주문 상태를 변경할 수 없습니다.');
  END IF;

  IF p_new_status = 'preparing' THEN
    UPDATE public.product_orders
    SET status = 'preparing', prepared_at = now(), prepared_by = auth.uid()
    WHERE id = v_order.id;
  ELSIF p_new_status = 'purchased' THEN
    SELECT public.use_talent(
      v_order.user_id,
      v_order.price,
      '상품 구매: ' || v_order.product_name,
      auth.uid()
    ) INTO v_purchase_result;

    IF COALESCE((v_purchase_result->>'success')::boolean, false) = false THEN
      RETURN v_purchase_result;
    END IF;

    UPDATE public.product_orders
    SET status = 'purchased', purchased_at = now(), purchased_by = auth.uid()
    WHERE id = v_order.id;

    UPDATE public.profiles
    SET pending_talent = GREATEST(COALESCE(pending_talent, 0) - v_order.price, 0)
    WHERE id = v_order.user_id;
  ELSIF p_new_status = 'delivered' THEN
    UPDATE public.product_orders
    SET status = 'delivered', delivered_at = now(), delivered_by = auth.uid()
    WHERE id = v_order.id;
  ELSIF p_new_status = 'requested' THEN
    UPDATE public.product_orders
    SET status = 'requested', prepared_at = null, prepared_by = null
    WHERE id = v_order.id;
  ELSIF p_new_status = 'cancelled' THEN
    UPDATE public.product_orders
    SET status = 'cancelled'
    WHERE id = v_order.id;

    UPDATE public.profiles
    SET pending_talent = GREATEST(COALESCE(pending_talent, 0) - v_order.price, 0)
    WHERE id = v_order.user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'previous_status', v_order.status,
    'status', p_new_status
  );
END;
$$;

-- 레거시 권한표도 일반 교사의 조회·처리를 표시하도록 맞춥니다.
INSERT INTO public.page_permissions (page_key, permission_level, can_view, can_manage)
VALUES ('purchases', 'teacher', true, true)
ON CONFLICT (page_key, permission_level) DO UPDATE
SET can_view = EXCLUDED.can_view,
    can_manage = EXCLUDED.can_manage,
    updated_at = now();

REVOKE ALL ON FUNCTION public.can_manage_class_purchase_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_class_purchase_order(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_class_purchase_order(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_purchase_order_profiles(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_purchase_order_profiles(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_purchase_order_profiles(uuid[]) TO authenticated;
REVOKE ALL ON FUNCTION public.process_product_order(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_product_order(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.process_product_order(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verification
-- 1. 일반 교사: 담당 부서·반 학생 주문만 목록/집계/상세에 표시된다.
-- 2. 일반 교사: 담당 학생 주문은 requested -> preparing 전이만 가능하다.
-- 3. 일반 교사: 다른 반·부서·교사 주문과 그 외 상태 전이는 거부된다.
--    본인 주문은 기존 내 구매 상품 화면에서만 확인하며, 구매 관리 화면에서는 제외된다.
-- 4. 기존 60+ 및 구매 담당 교사 이상의 주문 범위·전이 규칙은 유지된다.
