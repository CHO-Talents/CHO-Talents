-- TASK-113: 상품 추천 채택 보상 달란트 항목 설정
--
-- 상품 추천 채택 보상 항목을 이름으로 찾지 않고 talent_items.id로 지급합니다.
-- 전체 달란트 항목 중 하나의 활성 항목만 설정할 수 있으며, 설정은 달란트 항목 관리 화면의 관리 메뉴에서 변경합니다.

BEGIN;

ALTER TABLE public.talent_items
  ADD COLUMN IF NOT EXISTS is_product_suggestion_adoption_reward boolean NOT NULL DEFAULT false;

-- 기존에 설정값이 비활성 항목에 남아 있으면 먼저 해제한다.
UPDATE public.talent_items
SET is_product_suggestion_adoption_reward = false
WHERE is_product_suggestion_adoption_reward = true
  AND COALESCE(is_active, false) = false;

-- 남은 중복 설정은 가장 최근에 만든 한 항목만 유지한다.
WITH ranked_configs AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY created_at DESC NULLS LAST, id) AS row_num
  FROM public.talent_items
  WHERE is_product_suggestion_adoption_reward = true
)
UPDATE public.talent_items item
SET is_product_suggestion_adoption_reward = false
FROM ranked_configs config
WHERE item.id = config.id
  AND config.row_num > 1;

DROP INDEX IF EXISTS public.idx_talent_items_product_suggestion_adoption_reward_target;
CREATE UNIQUE INDEX IF NOT EXISTS idx_talent_items_product_suggestion_adoption_reward_single
  ON public.talent_items ((true))
  WHERE is_product_suggestion_adoption_reward = true;

CREATE OR REPLACE FUNCTION public.configure_product_suggestion_adoption_reward_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_product_suggestion_adoption_reward THEN
    IF COALESCE(NEW.is_active, false) = false THEN
      RAISE EXCEPTION '활성 상태인 달란트 항목만 상품 채택 지급 항목으로 설정할 수 있습니다.';
    END IF;

    -- 전체 달란트 항목의 기존 설정을 해제해 하나의 항목만 유지한다.
    UPDATE public.talent_items
    SET is_product_suggestion_adoption_reward = false
    WHERE id <> NEW.id
      AND is_product_suggestion_adoption_reward = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS configure_product_suggestion_adoption_reward_item_before_write ON public.talent_items;
CREATE TRIGGER configure_product_suggestion_adoption_reward_item_before_write
  BEFORE INSERT OR UPDATE OF is_product_suggestion_adoption_reward, is_active
  ON public.talent_items
  FOR EACH ROW
  EXECUTE FUNCTION public.configure_product_suggestion_adoption_reward_item();

-- 기존 운영 데이터의 설정을 보존한다. 이름은 이번 일회성 마이그레이션에서만 사용하며,
-- 런타임 지급 처리는 아래 함수의 talent_items.id를 사용한다.
WITH legacy_candidates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           ORDER BY CASE name
             WHEN '상품 추천 채택' THEN 0
             WHEN '상품 추천' THEN 1
             ELSE 2
           END,
           sort_order,
           id
         ) AS row_num
  FROM public.talent_items
  WHERE is_active = true
    AND name IN ('상품 추천 채택', '상품 추천')
)
UPDATE public.talent_items item
SET is_product_suggestion_adoption_reward = true
FROM legacy_candidates candidate
WHERE item.id = candidate.id
  AND candidate.row_num = 1
  AND NOT EXISTS (
    SELECT 1
    FROM public.talent_items configured
    WHERE configured.is_product_suggestion_adoption_reward = true
  );

CREATE OR REPLACE FUNCTION public._grant_product_suggestion_adoption_talent(
  p_suggestion_id uuid,
  p_actor_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_suggestion public.product_suggestions%ROWTYPE;
  v_current_balance integer;
  v_new_balance integer;
  v_talent_item_id uuid;
  v_talent_item_name text;
  v_amount integer;
  v_reward_suggestion_id uuid;
  v_transaction_id uuid;
  v_actor_username text;
  v_actor_name text;
BEGIN
  SELECT * INTO v_suggestion
  FROM public.product_suggestions
  WHERE id = p_suggestion_id;

  IF NOT FOUND OR v_suggestion.suggested_by IS NULL THEN
    RAISE EXCEPTION '상품 추천 등록자를 찾을 수 없습니다.';
  END IF;

  SELECT COALESCE(talent_balance, 0)
  INTO v_current_balance
  FROM public.profiles
  WHERE id = v_suggestion.suggested_by
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '상품 추천 등록자 프로필을 찾을 수 없습니다.';
  END IF;

  SELECT id, name, talent_amount
  INTO v_talent_item_id, v_talent_item_name, v_amount
  FROM public.talent_items
  WHERE is_product_suggestion_adoption_reward = true
    AND is_active = true;

  IF v_talent_item_id IS NULL THEN
    RAISE EXCEPTION '상품 채택 지급 달란트 항목이 설정되어 있지 않거나 비활성 상태입니다.';
  END IF;

  -- suggestion_id의 PK가 지급 단위이다. 이미 보상된 추천은 잔액이나 거래를 다시 만들지 않는다.
  INSERT INTO public.product_suggestion_adoption_rewards (
    suggestion_id, recipient_id, talent_item_id, granted_by
  ) VALUES (
    p_suggestion_id, v_suggestion.suggested_by, v_talent_item_id, p_actor_id
  )
  ON CONFLICT (suggestion_id) DO NOTHING
  RETURNING suggestion_id INTO v_reward_suggestion_id;

  IF v_reward_suggestion_id IS NULL THEN
    RETURN json_build_object('rewarded', false, 'reason', 'already_rewarded');
  END IF;

  v_new_balance := v_current_balance + v_amount;
  UPDATE public.profiles
  SET talent_balance = v_new_balance,
      updated_at = now()
  WHERE id = v_suggestion.suggested_by;

  INSERT INTO public.talent_transactions (
    user_id, type, amount, balance_after, description, created_by,
    talent_item_id, source, override_week_limit, override_reason
  ) VALUES (
    v_suggestion.suggested_by, 'earn', v_amount, v_new_balance, v_talent_item_name, p_actor_id,
    v_talent_item_id, 'product_suggestion_adoption', false, NULL
  )
  RETURNING id INTO v_transaction_id;

  UPDATE public.product_suggestion_adoption_rewards
  SET transaction_id = v_transaction_id
  WHERE suggestion_id = p_suggestion_id;

  SELECT COALESCE(username, '시스템'), COALESCE(display_name, username, '시스템')
  INTO v_actor_username, v_actor_name
  FROM public.profiles
  WHERE id = p_actor_id;

  INSERT INTO public.activity_logs (level, action, page, details, username, user_name)
  VALUES (
    'INFO',
    'PRODUCT_SUGGESTION_ADOPTION_TALENT',
    'product_suggestion_votes',
    jsonb_build_object(
      'targetType', '상품 추천',
      'targetId', p_suggestion_id,
      'targetName', v_suggestion.name,
      'talentItemId', v_talent_item_id,
      'talentItem', v_talent_item_name,
      'amount', v_amount,
      'source', 'product_suggestion_adoption',
      'changeSummary', '추천 등록자에게 ' || v_talent_item_name || ' ' || v_amount || '달란트 자동 지급'
    ),
    COALESCE(v_actor_username, '시스템'),
    COALESCE(v_actor_name, '시스템')
  );

  RETURN json_build_object(
    'rewarded', true,
    'talent_item_id', v_talent_item_id,
    'talent_item_name', v_talent_item_name,
    'amount', v_amount,
    'transaction_id', v_transaction_id
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
