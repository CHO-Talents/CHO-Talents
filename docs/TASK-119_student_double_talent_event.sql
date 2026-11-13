-- TASK-119: 학생 달란트 2배 이벤트 (기존 거래 소급 변경 없음)
-- 선행: TASK-104, TASK-105, TASK-117. 운영 DB 현재 함수와 항목을 확인한 뒤 적용.
BEGIN;

CREATE TABLE IF NOT EXISTS public.talent_double_event_items (
  talent_item_id uuid PRIMARY KEY REFERENCES public.talent_items(id)
);
REVOKE ALL ON public.talent_double_event_items FROM PUBLIC, anon, authenticated;
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.talent_items
  WHERE target_type = 'student' AND is_active = true
    AND name IN ('주일 어린이예배', '매주 말씀 암송', '예배 태도', '전도/새신자');
  IF v_count <> 4 THEN RAISE EXCEPTION '이벤트 학생 항목 4개를 확인할 수 없습니다: %개', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.departments
  WHERE name IN ('1부','2부','3부','4부','5부');
  IF v_count <> 5 THEN RAISE EXCEPTION '이벤트 부서 5개를 확인할 수 없습니다: %개', v_count; END IF;
END $$;
INSERT INTO public.talent_double_event_items (talent_item_id)
SELECT id FROM public.talent_items WHERE target_type = 'student'
 AND name IN ('주일 어린이예배', '매주 말씀 암송', '예배 태도', '전도/새신자')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public._is_student_double_talent_event(p_user_id uuid, p_item_id uuid, p_grant_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.departments d ON d.id = p.department_id
    JOIN public.talent_double_event_items i ON i.talent_item_id = p_item_id
    WHERE p.id = p_user_id AND p.user_type = 'student'
      AND ((p_grant_date = DATE '2026-11-15' AND d.name IN ('1부','2부','3부'))
        OR (p_grant_date = DATE '2026-11-22' AND d.name IN ('4부','5부')))
  );
$$;
REVOKE ALL ON FUNCTION public._is_student_double_talent_event(uuid,uuid,date) FROM PUBLIC, anon, authenticated;

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
      IF public._is_student_double_talent_event(p_user_id, p_talent_item_id, v_grant_date) THEN
        v_actual_amount := v_actual_amount * 2;
        v_actual_desc := v_actual_desc || ' (2배 이벤트)';
      END IF;
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
    'description', v_actual_desc,
    'grant_date', v_grant_date
  );
END;
$$;


CREATE OR REPLACE FUNCTION public.scan_qr_talent(
  p_qr_code_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr record;
  v_actual_amount integer;
  v_actual_desc text;
  v_new_balance integer;
  v_txn_id uuid;
  v_scan_id uuid;
  v_existing_scan uuid;
  v_existing_txn uuid;
  v_now_kst timestamp;
  v_grant_date date;
  v_time_kst time;
  v_day_kst integer;
  v_week_kst integer;
  v_today_start_utc timestamptz;
  v_tomorrow_start_utc timestamptz;
BEGIN
  v_now_kst := timezone('Asia/Seoul', now());
  v_grant_date := v_now_kst::date + ((7 - EXTRACT(DOW FROM v_now_kst)::integer) % 7);
  v_time_kst := v_now_kst::time;
  v_day_kst := extract(dow from v_now_kst)::integer;
  v_week_kst := ceil((
    extract(day from v_now_kst)::numeric
    + extract(dow from date_trunc('month', v_now_kst)::date)::numeric
  ) / 7)::integer;
  v_today_start_utc := date_trunc('day', v_now_kst) AT TIME ZONE 'Asia/Seoul';
  v_tomorrow_start_utc := (date_trunc('day', v_now_kst) + interval '1 day') AT TIME ZONE 'Asia/Seoul';

  SELECT * INTO v_qr
  FROM public.talent_qr_codes
  WHERE id = p_qr_code_id
    AND is_active = true;

  IF v_qr IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid QR code');
  END IF;

  IF v_qr.valid_from IS NOT NULL AND now() < v_qr.valid_from THEN
    RETURN json_build_object('success', false, 'error', 'Not yet valid');
  END IF;

  IF v_qr.valid_until IS NOT NULL AND now() > v_qr.valid_until THEN
    RETURN json_build_object('success', false, 'error', 'Expired QR code');
  END IF;

  IF v_qr.expires_at IS NOT NULL AND now() > v_qr.expires_at THEN
    RETURN json_build_object('success', false, 'error', 'Expired QR code');
  END IF;

  IF v_qr.valid_start_time IS NOT NULL AND v_time_kst < v_qr.valid_start_time THEN
    RETURN json_build_object('success', false, 'error', 'Invalid time window');
  END IF;

  IF v_qr.valid_end_time IS NOT NULL AND v_time_kst > v_qr.valid_end_time THEN
    RETURN json_build_object('success', false, 'error', 'Invalid time window');
  END IF;

  IF COALESCE(v_qr.repeat_type, 'none') = 'weekday' THEN
    IF v_qr.repeat_days IS NULL OR NOT (v_day_kst = ANY(v_qr.repeat_days)) THEN
      RETURN json_build_object('success', false, 'error', 'Invalid weekday');
    END IF;
  END IF;

  IF COALESCE(v_qr.repeat_type, 'none') = 'week_weekday' THEN
    IF v_qr.repeat_weeks IS NULL OR NOT (v_week_kst = ANY(v_qr.repeat_weeks)) THEN
      RETURN json_build_object('success', false, 'error', 'Invalid week of month');
    END IF;

    IF v_qr.repeat_days IS NULL OR NOT (v_day_kst = ANY(v_qr.repeat_days)) THEN
      RETURN json_build_object('success', false, 'error', 'Invalid weekday');
    END IF;
  END IF;

  IF COALESCE(v_qr.max_uses, 0) > 0 AND COALESCE(v_qr.used_count, 0) >= v_qr.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Max uses exceeded');
  END IF;

  IF COALESCE(v_qr.repeat_type, 'none') = 'none' THEN
    SELECT id INTO v_existing_scan
    FROM public.talent_qr_scans
    WHERE qr_code_id = p_qr_code_id
      AND user_id = p_user_id
    ORDER BY scanned_at DESC
    LIMIT 1;
  ELSE
    SELECT id INTO v_existing_scan
    FROM public.talent_qr_scans
    WHERE qr_code_id = p_qr_code_id
      AND user_id = p_user_id
      AND scanned_at >= v_today_start_utc
      AND scanned_at < v_tomorrow_start_utc
    ORDER BY scanned_at DESC
    LIMIT 1;
  END IF;

  IF v_existing_scan IS NOT NULL THEN
    SELECT id INTO v_existing_txn
    FROM public.talent_transactions
    WHERE user_id = p_user_id
      AND type = 'earn'
      AND created_at BETWEEN
        (SELECT scanned_at FROM public.talent_qr_scans WHERE id = v_existing_scan) - interval '2 minutes'
        AND
        (SELECT scanned_at FROM public.talent_qr_scans WHERE id = v_existing_scan) + interval '2 minutes'
      AND (
        source = 'qr'
        OR v_qr.talent_item_id IS NULL
        OR talent_item_id = v_qr.talent_item_id
      )
    LIMIT 1;

    IF v_existing_txn IS NOT NULL THEN
      RETURN json_build_object('success', false, 'error', 'Already received');
    END IF;

    UPDATE public.talent_qr_scans
    SET scanned_at = now()
    WHERE id = v_existing_scan;

    v_scan_id := v_existing_scan;
  ELSE
    INSERT INTO public.talent_qr_scans (qr_code_id, user_id, scanned_at)
    VALUES (p_qr_code_id, p_user_id, now())
    RETURNING id INTO v_scan_id;

    UPDATE public.talent_qr_codes
    SET used_count = COALESCE(used_count, 0) + 1
    WHERE id = p_qr_code_id;
  END IF;

  v_actual_amount := v_qr.amount;
  v_actual_desc := COALESCE(v_qr.description, 'QR 달란트');
  IF public._is_student_double_talent_event(p_user_id, v_qr.talent_item_id, v_grant_date) THEN
    v_actual_amount := v_actual_amount * 2;
    v_actual_desc := v_actual_desc || ' (2배 이벤트)';
  END IF;

  UPDATE public.profiles
  SET talent_balance = COALESCE(talent_balance, 0) + v_actual_amount
  WHERE id = p_user_id
  RETURNING talent_balance INTO v_new_balance;

  INSERT INTO public.talent_transactions (
    user_id, type, amount, balance_after, description,
    created_by, talent_item_id, source, grant_date
  ) VALUES (
    p_user_id, 'earn', v_actual_amount, v_new_balance,
    v_actual_desc,
    p_user_id, v_qr.talent_item_id, 'qr', v_grant_date
  )
  RETURNING id INTO v_txn_id;

  RETURN json_build_object(
    'success', true,
    'balance', v_new_balance,
    'amount', v_actual_amount,
    'description', v_actual_desc,
    'txn_id', v_txn_id,
    'scan_id', v_scan_id,
    'grant_date', v_grant_date
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.scan_qr_talent(uuid, uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
