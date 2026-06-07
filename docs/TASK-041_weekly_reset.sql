-- TASK-041: give_talent RPC에 교사도 주간(월~일) 1회 제한 추가
-- 기존: 학생만 주간 제한, 교사는 제한 없음
-- 변경: 학생 + 교사 모두 주간 1회 제한

CREATE OR REPLACE FUNCTION public.give_talent(
  p_user_id uuid,
  p_talent_item_id uuid,
  p_created_by uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item record;
  v_target_type text;
  v_week_count int;
  v_new_balance int;
BEGIN
  SELECT * INTO v_item FROM public.talent_items WHERE id = p_talent_item_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Talent item not found or inactive');
  END IF;

  SELECT user_type INTO v_target_type FROM public.profiles WHERE id = p_user_id;
  IF v_target_type IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_item.target_type <> v_target_type THEN
    RETURN json_build_object('success', false, 'error', 'Item target type mismatch: ' || v_item.target_type || ' vs ' || v_target_type);
  END IF;

  SELECT count(*) INTO v_week_count
  FROM public.talent_transactions
  WHERE user_id = p_user_id
    AND talent_item_id = p_talent_item_id
    AND type = 'earn'
    AND created_at >= date_trunc('week', now() AT TIME ZONE 'Asia/Seoul')
    AND created_at < date_trunc('week', now() AT TIME ZONE 'Asia/Seoul') + interval '7 days';

  IF v_week_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Already given this item this week: ' || v_item.name);
  END IF;

  INSERT INTO public.talent_transactions (user_id, type, amount, description, talent_item_id, created_by)
  VALUES (p_user_id, 'earn', v_item.talent_amount, v_item.name, p_talent_item_id, p_created_by);

  UPDATE public.profiles
  SET talent_balance = talent_balance + v_item.talent_amount
  WHERE id = p_user_id
  RETURNING talent_balance INTO v_new_balance;

  RETURN json_build_object('success', true, 'balance', v_new_balance, 'amount', v_item.talent_amount);
END;
$$;
