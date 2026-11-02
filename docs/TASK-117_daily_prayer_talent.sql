-- TASK-103과 TASK-105 적용 후 실행. 기존 교사 항목을 사용한다.
-- 참석 날짜는 별도로 보존하고 기존 일요일 집계일은 유지한다.
BEGIN;
ALTER TABLE public.talent_transactions ADD COLUMN IF NOT EXISTS attendance_date date;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.talent_items WHERE target_type = 'teacher' AND name = '특별새벽기도회 참석') THEN
    RAISE EXCEPTION '기존 교사 항목 특별새벽기도회 참석을 찾을 수 없습니다';
  END IF;
END $$;
UPDATE public.talent_items SET talent_amount = 3 WHERE target_type = 'teacher' AND name = '특별새벽기도회 참석';

CREATE OR REPLACE FUNCTION public.give_talent(
  p_user_id uuid,
  p_amount integer DEFAULT 0,
  p_description text DEFAULT '',
  p_created_by uuid DEFAULT NULL,
  p_talent_item_id uuid DEFAULT NULL,
  p_override_week_limit boolean DEFAULT false,
  p_override_reason text DEFAULT NULL,
  p_grant_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
  v_txn_id uuid;
  v_caller_perm text;
  v_caller_rank integer;
  v_caller_is_super_admin boolean;
  v_caller_dept uuid;
  v_caller_class integer;
  v_caller_managed_dept uuid;
  v_target_type text;
  v_target_dept uuid;
  v_target_class integer;
  v_target_is_super_admin boolean;
  v_item record;
  v_actual_amount integer;
  v_actual_desc text;
  v_grant_date date;
  v_grant_count integer;
  v_override_week_limit boolean;
  v_daily_prayer boolean := false;
  v_attendance_date date;
BEGIN
  SELECT permission_level,
         COALESCE(is_super_admin, false),
         department_id,
         class_number,
         COALESCE(managed_dept_id, department_id)
  INTO v_caller_perm, v_caller_is_super_admin, v_caller_dept, v_caller_class, v_caller_managed_dept
  FROM public.profiles
  WHERE id = auth.uid();

  v_caller_rank := public.get_permission_rank(v_caller_perm);
  IF v_caller_perm IS NULL OR v_caller_rank < 40 THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  v_override_week_limit := COALESCE(p_override_week_limit, false);
  IF v_override_week_limit AND v_caller_rank < 90 THEN
    RETURN json_build_object('success', false, 'error', '예외 지급은 전도사님 이상만 가능합니다');
  END IF;

  -- 동시 지급 시 중복 검사를 우회하지 않도록 대상 프로필을 잠근다.
  SELECT user_type, department_id, class_number, COALESCE(is_super_admin, false)
  INTO v_target_type, v_target_dept, v_target_class, v_target_is_super_admin
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_target_type IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_target_is_super_admin AND NOT v_caller_is_super_admin THEN
    RETURN json_build_object('success', false, 'error', 'Super administrator accounts cannot be granted talents');
  END IF;

  -- 관리자·전도사님은 전체 대상 지급, 부장/담당 교사는 관리 부서만 지급한다.
  IF v_caller_rank >= 90 THEN
    NULL;
  ELSIF v_caller_perm IN ('chief', 'purchase_teacher', 'dept_teacher') THEN
    IF v_caller_managed_dept IS NULL OR v_caller_managed_dept != v_target_dept THEN
      RETURN json_build_object('success', false, 'error', 'You can only give talents to users in your managed department');
    END IF;
  ELSIF v_caller_rank = 40 THEN
    IF v_target_type <> 'student'
       OR v_caller_dept IS NULL
       OR v_caller_dept != v_target_dept
       OR v_caller_class IS DISTINCT FROM v_target_class THEN
      RETURN json_build_object('success', false, 'error', 'You can only give talents to students in your class');
    END IF;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  v_grant_date := COALESCE(
    p_grant_date,
    (now() AT TIME ZONE 'Asia/Seoul')::date
      + ((7 - EXTRACT(DOW FROM (now() AT TIME ZONE 'Asia/Seoul'))::integer) % 7)
  );

  IF p_talent_item_id IS NOT NULL THEN
    IF p_grant_date IS NOT NULL AND EXTRACT(DOW FROM p_grant_date) <> 0 THEN
      RETURN json_build_object('success', false, 'error', '지급일은 일요일만 선택할 수 있습니다');
    END IF;

    SELECT * INTO v_item
    FROM public.talent_items
    WHERE id = p_talent_item_id AND is_active = true;

    IF v_item IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Invalid or inactive talent item');
    END IF;

    IF v_item.target_type IS NOT NULL AND v_item.target_type <> v_target_type THEN
      RETURN json_build_object('success', false, 'error', 'Item target type mismatch: ' || v_item.target_type || ' vs ' || v_target_type);
    END IF;

    v_daily_prayer := v_target_type = 'teacher' AND v_item.target_type = 'teacher'
      AND v_item.name = '특별새벽기도회 참석';
    IF v_daily_prayer THEN
      IF COALESCE(p_description, '') !~ '^2026-11-0[2-7]$' THEN
        RETURN json_build_object('success', false, 'error', '특새 1~6일차 참석일을 선택해주세요');
      END IF;
      v_attendance_date := p_description::date;
      IF v_attendance_date > (now() AT TIME ZONE 'Asia/Seoul')::date THEN
        RETURN json_build_object('success', false, 'error', '미래 참석일에는 지급할 수 없습니다');
      END IF;
      v_grant_date := DATE '2026-11-08';
      v_actual_amount := 3;
      v_actual_desc := v_item.name || ' (특새 ' || (v_attendance_date - DATE '2026-11-02' + 1) || '일차, ' || v_attendance_date || ')';
    ELSE
      v_actual_amount := v_item.talent_amount;
      v_actual_desc := v_item.name;
    END IF;

    SELECT count(*) INTO v_grant_count
    FROM public.talent_transactions AS earned
    WHERE earned.user_id = p_user_id
      AND earned.talent_item_id = p_talent_item_id
      AND earned.type = 'earn'
      AND (CASE WHEN v_daily_prayer
        THEN earned.attendance_date = v_attendance_date
        ELSE COALESCE(earned.grant_date, (earned.created_at AT TIME ZONE 'Asia/Seoul')::date) = v_grant_date END)
      AND NOT EXISTS (
        SELECT 1
        FROM public.talent_transactions AS returned
        WHERE returned.user_id = earned.user_id
          AND returned.type = 'use'
          AND (
            returned.description LIKE ('반환: [' || earned.id::text || ']%')
            OR (
              returned.amount = earned.amount
              AND returned.description = '반환: [] ' || COALESCE(earned.description, '')
            )
          )
      );

    IF v_grant_count > 0 AND (v_daily_prayer OR NOT v_override_week_limit) THEN
      RETURN json_build_object('success', false, 'error', 'Already given this item on this payment date: ' || v_item.name);
    END IF;
  ELSE
    IF p_amount <= 0 THEN
      RETURN json_build_object('success', false, 'error', 'Amount must be positive');
    END IF;
    v_actual_amount := p_amount;
    v_actual_desc := COALESCE(NULLIF(p_description, ''), 'Manual');
  END IF;

  IF v_override_week_limit AND (p_override_reason IS NULL OR btrim(p_override_reason) = '') THEN
    RETURN json_build_object('success', false, 'error', '예외 지급 사유를 입력해주세요');
  END IF;
  IF v_actual_amount > 100 THEN
    RETURN json_build_object('success', false, 'error', 'Amount cannot exceed 100');
  END IF;

  UPDATE public.profiles
  SET talent_balance = COALESCE(talent_balance, 0) + v_actual_amount
  WHERE id = p_user_id
  RETURNING talent_balance INTO v_new_balance;

  INSERT INTO public.talent_transactions (
    user_id, type, amount, balance_after, description, created_by, talent_item_id,
    override_week_limit, override_reason, grant_date, attendance_date
  ) VALUES (
    p_user_id, 'earn', v_actual_amount, v_new_balance, v_actual_desc,
    COALESCE(p_created_by, auth.uid()), p_talent_item_id,
    v_override_week_limit, p_override_reason, v_grant_date, v_attendance_date
  )
  RETURNING id INTO v_txn_id;

  RETURN json_build_object(
    'success', true,
    'balance', v_new_balance,
    'txn_id', v_txn_id,
    'amount', v_actual_amount,
    'grant_date', v_grant_date
  );
END;
$$;


NOTIFY pgrst, 'reload schema';
COMMIT;
