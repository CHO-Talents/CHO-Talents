-- TASK-120: QR 본인 검증, 항목 중복 방지 및 지급 예정 금액 조회
-- 선행: TASK-119. 기존 지급/잔액 및 QR 데이터는 변경하지 않는다.
BEGIN;

-- 지급 전 표시 전용. 실제 지급은 give_talent가 다시 계산한다.
CREATE OR REPLACE FUNCTION public.get_talent_grant_preview(p_user_id uuid, p_grant_date date)
RETURNS TABLE (item_id uuid, amount integer, is_event boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller public.profiles%ROWTYPE;
  target public.profiles%ROWTYPE;
  caller_rank integer;
BEGIN
  SELECT * INTO caller FROM public.profiles WHERE id = auth.uid();
  SELECT * INTO target FROM public.profiles WHERE id = p_user_id;
  caller_rank := public.get_permission_rank(caller.permission_level);
  IF caller.id IS NULL OR target.id IS NULL OR caller_rank IS NULL OR caller_rank < 40
    OR (COALESCE(target.is_super_admin, false) AND NOT COALESCE(caller.is_super_admin, false))
    OR (caller_rank < 90 AND caller.permission_level IN ('chief','purchase_teacher','dept_teacher')
      AND (COALESCE(caller.managed_dept_id, caller.department_id) IS NULL
        OR COALESCE(caller.managed_dept_id, caller.department_id) IS DISTINCT FROM target.department_id))
    OR (caller_rank = 40 AND (target.user_type <> 'student' OR caller.department_id IS NULL
      OR caller.department_id IS DISTINCT FROM target.department_id
      OR caller.class_number IS DISTINCT FROM target.class_number))
    OR (caller_rank < 90 AND caller_rank <> 40 AND caller.permission_level NOT IN ('chief','purchase_teacher','dept_teacher'))
  THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY SELECT i.id,
    i.talent_amount * CASE WHEN public._is_student_double_talent_event(p_user_id, i.id, p_grant_date) THEN 2 ELSE 1 END,
    public._is_student_double_talent_event(p_user_id, i.id, p_grant_date)
  FROM public.talent_items i WHERE i.is_active = true AND i.target_type = target.user_type;
END;
$$;
REVOKE ALL ON FUNCTION public.get_talent_grant_preview(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_talent_grant_preview(uuid, date) TO authenticated;

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
  v_target_type text;
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
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  -- 일반 지급과 같은 프로필 잠금으로 교차 지급과 동시 요청을 직렬화한다.
  SELECT user_type INTO v_target_type FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_target_type IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
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
    AND is_active = true
  FOR UPDATE;

  IF v_qr IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid QR code');
  END IF;

  IF v_qr.target_type IS NOT NULL AND v_qr.target_type <> v_target_type THEN
    RETURN json_build_object('success', false, 'error', 'QR target type mismatch');
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

  -- 항목이 연결된 경우 일반 지급과 동일하게 취소되지 않은 거래만 중복으로 본다.
  -- 수동 QR(talent_item_id IS NULL)의 반복/횟수 제한은 기존 규칙을 유지한다.
  IF v_qr.talent_item_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.talent_transactions AS earned
    WHERE earned.user_id = p_user_id AND earned.type = 'earn'
      AND earned.talent_item_id = v_qr.talent_item_id
      AND COALESCE(earned.grant_date, (earned.created_at AT TIME ZONE 'Asia/Seoul')::date) = v_grant_date
      AND NOT EXISTS (
        SELECT 1 FROM public.talent_transactions AS returned
        WHERE returned.user_id = earned.user_id AND returned.type = 'use'
          AND (returned.description LIKE ('반환: [' || earned.id::text || ']%')
            OR (returned.amount = earned.amount
              AND returned.description = '반환: [] ' || COALESCE(earned.description, '')))
      )
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already given this item on this payment date');
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


REVOKE ALL ON FUNCTION public.scan_qr_talent(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scan_qr_talent(uuid, uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
