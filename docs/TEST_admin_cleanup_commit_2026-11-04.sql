-- 관리자 테스트 실제 정리 쿼리. 실행하면 주문 및 거래가 삭제되고 잔액이 변경됩니다.
-- 사용자가 실제 정리를 원할 때만 전체 쿼리를 실행하세요. 백업 및 대상·의존성을 확인하세요.
-- 테스트 이후 다른 거래가 생겼거나 상태가 다르면 예외로 중단합니다.
-- 활동/감사 로그와 Slack 메시지는 삭제하지 않습니다.

BEGIN;

DO $cleanup$
DECLARE
  v_order_id constant uuid := '53f77ba6-175e-433b-8ea4-57832bc6cfc4';
  v_earn_ids constant uuid[] := ARRAY[
    'dea3cfdc-1450-4669-987d-0e6cdf1fa769'::uuid,
    '7310d197-b530-4b89-a21e-7dd8601f5c99'::uuid,
    '6e385bf8-d96b-49f7-98d9-a1d2b70f673d'::uuid
  ];
  v_user_id uuid;
  v_use_id uuid;
  v_purchased_at timestamptz;
  v_first_at timestamptz;
  v_count integer;
  v_balance integer;
  v_pending integer;
  v_ref record;
  v_ref_exists boolean;
BEGIN
  SELECT p.id, p.talent_balance, COALESCE(p.pending_talent, 0)
    INTO STRICT v_user_id, v_balance, v_pending
  FROM public.profiles p WHERE p.username = 'admin' FOR UPDATE;

  SELECT o.purchased_at INTO STRICT v_purchased_at
  FROM public.product_orders o
  WHERE o.id = v_order_id AND o.user_id = v_user_id
    AND o.product_id = 'afe7f59b-b798-4847-93b6-1e6511c9c461'::uuid
    AND o.product_name = '스타벅스 아메리카노'
    AND o.price = 30 AND o.status = 'delivered' AND o.purchased_at IS NOT NULL
  FOR UPDATE;

  SELECT count(*), min(created_at) INTO v_count, v_first_at
  FROM public.talent_transactions
  WHERE id = ANY(v_earn_ids) AND user_id = v_user_id AND type = 'earn'
    AND ((id = v_earn_ids[1] AND amount = 1 AND balance_after = 1)
      OR (id = v_earn_ids[2] AND amount = 29 AND balance_after = 30)
      OR (id = v_earn_ids[3] AND amount = 3 AND balance_after = 33));
  IF v_count <> 3 THEN RAISE EXCEPTION '테스트 적립 3건이 예상과 다릅니다: %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.talent_transactions
  WHERE user_id = v_user_id AND type = 'use' AND amount = 30 AND balance_after = 3
    AND description = '상품 구매: 스타벅스 아메리카노'
    AND created_at BETWEEN v_purchased_at - interval '1 minute' AND v_purchased_at + interval '1 minute';
  IF v_count <> 1 THEN RAISE EXCEPTION '구매 사용 거래가 유일하지 않습니다: %', v_count; END IF;
  SELECT id INTO STRICT v_use_id FROM public.talent_transactions
  WHERE user_id = v_user_id AND type = 'use' AND amount = 30 AND balance_after = 3
    AND description = '상품 구매: 스타벅스 아메리카노'
    AND created_at BETWEEN v_purchased_at - interval '1 minute' AND v_purchased_at + interval '1 minute';

  SELECT count(*) INTO v_count FROM public.talent_transactions
  WHERE user_id = v_user_id AND created_at >= v_first_at
    AND NOT (id = ANY(v_earn_ids) OR id = v_use_id);
  IF v_count <> 0 OR v_balance <> 3 OR v_pending <> 0 THEN
    RAISE EXCEPTION '이후 거래 또는 잔액 변화가 있습니다. 추가 거래 %, 잔액 %, 대기 %', v_count, v_balance, v_pending;
  END IF;

  -- CASCADE/SET NULL을 포함한 모든 외래키 참조가 있으면 자동 정리를 중단한다.
  FOR v_ref IN
    SELECT c.conname, c.conrelid::regclass AS source_table,
           c.confrelid::regclass AS target_table, a.attname AS source_column,
           cardinality(c.conkey) AS key_count
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f' AND c.confrelid IN ('public.product_orders'::regclass, 'public.talent_transactions'::regclass)
  LOOP
    IF v_ref.key_count <> 1 THEN
      RAISE EXCEPTION '복합 외래키를 수동 검토해야 합니다: %', v_ref.conname;
    END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s WHERE %I = ANY($1))', v_ref.source_table, v_ref.source_column)
      INTO v_ref_exists USING CASE WHEN v_ref.target_table = 'public.product_orders'::regclass
        THEN ARRAY[v_order_id] ELSE array_append(v_earn_ids, v_use_id) END;
    IF v_ref_exists THEN
      RAISE EXCEPTION '다른 데이터가 테스트 기록을 참조합니다: % (%)', v_ref.source_table, v_ref.conname;
    END IF;
  END LOOP;

  RAISE NOTICE '정리 예정: 주문 %, 사용 거래 %, 적립 거래 %, 현재 잔액 %', v_order_id, v_use_id, v_earn_ids, v_balance;
  DELETE FROM public.product_orders WHERE id = v_order_id AND user_id = v_user_id;
  DELETE FROM public.talent_transactions WHERE user_id = v_user_id AND (id = ANY(v_earn_ids) OR id = v_use_id);
  UPDATE public.profiles SET talent_balance = talent_balance - 3 WHERE id = v_user_id;
  RAISE NOTICE '테스트 거래 제거 후 잔액 % → %; 검증 성공 시 COMMIT으로 실제 반영', v_balance, v_balance - 3;
END
$cleanup$;

-- 정리 후 예상 잔액 확인 후 트랜잭션 전체를 확정한다.
SELECT username, talent_balance, pending_talent FROM public.profiles WHERE username = 'admin';
COMMIT;

