-- 학생 상품 할인: 운영 DB에 프런트엔드 배포 전에 적용한다.
-- 요청 가격은 서버에서 재계산하고 불일치하면 갱신을 요청한다.
BEGIN;
CREATE OR REPLACE FUNCTION public.request_product_order(
  p_user_id uuid, p_product_id uuid, p_product_name text, p_price integer
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_balance integer;
  v_pending integer;
  v_order_id uuid;
  v_caller_rank integer;
  v_target_type text;
  v_product public.products%ROWTYPE;
  v_price integer;
BEGIN
  v_caller_rank := public.get_permission_rank(auth.uid());
  IF auth.uid() IS NULL OR (p_user_id <> auth.uid() AND COALESCE(v_caller_rank, 0) < 40) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized proxy order');
  END IF;
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND is_active = true FOR SHARE;
  IF NOT FOUND OR v_product.price IS NULL OR v_product.price < 0 THEN
    RETURN json_build_object('success', false, 'error', '유효한 상품을 찾을 수 없습니다.');
  END IF;
  SELECT talent_balance, COALESCE(pending_talent, 0), user_type
    INTO v_balance, v_pending, v_target_type FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  IF v_target_type IS DISTINCT FROM v_product.target_role THEN
    RETURN json_build_object('success', false, 'error', '구매 대상에 맞지 않는 상품입니다.');
  END IF;
  v_price := CASE WHEN v_product.target_role = 'student' AND v_product.price >= 100
    THEN round(v_product.price::numeric * 0.8)::integer ELSE v_product.price END;
  IF p_price IS DISTINCT FROM v_price OR p_product_name IS DISTINCT FROM v_product.name THEN
    RETURN json_build_object('success', false, 'error', '상품 정보가 변경되었습니다. 새로고침 후 다시 신청해주세요.');
  END IF;
  IF (COALESCE(v_balance, 0) - v_pending) < v_price THEN
    RETURN json_build_object('success', false, 'error', '사용 가능한 달란트가 부족합니다.');
  END IF;
  INSERT INTO public.product_orders (user_id, product_id, product_name, price, status, requested_at)
    VALUES (p_user_id, p_product_id, v_product.name, v_price, 'requested', now()) RETURNING id INTO v_order_id;
  UPDATE public.profiles SET pending_talent = COALESCE(pending_talent, 0) + v_price WHERE id = p_user_id;
  RETURN json_build_object('success', true, 'order_id', v_order_id, 'pending_talent', v_pending + v_price);
END;
$$;
REVOKE ALL ON FUNCTION public.request_product_order(uuid, uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_product_order(uuid, uuid, text, integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
