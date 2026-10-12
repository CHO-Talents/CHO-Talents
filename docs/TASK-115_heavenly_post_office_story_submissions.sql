-- ============================================================
-- TASK-115: 천국우체국 사연 접수 / 승인 / 달란트 지급
-- Supabase SQL Editor에서 한 번 실행하세요.
-- ============================================================

BEGIN;

-- 공지 이미지와 "사연 작성하러 가기" 버튼을 같은 등록 화면에서 관리합니다.
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS link_url text;

CREATE TABLE IF NOT EXISTS public.story_submissions (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  is_anonymous boolean NOT NULL DEFAULT false,
  story_content text NOT NULL CHECK (char_length(btrim(story_content)) BETWEEN 5 AND 5000),
  song_request text CHECK (song_request IS NULL OR char_length(btrim(song_request)) <= 200),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'completed')),
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  talent_transaction_id uuid UNIQUE REFERENCES public.talent_transactions(id) ON DELETE SET NULL,
  reward_amount integer CHECK (reward_amount IS NULL OR reward_amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT story_submissions_completed_fields_check CHECK (
    (status = 'received' AND completed_by IS NULL AND completed_at IS NULL AND talent_transaction_id IS NULL AND reward_amount IS NULL)
    OR
    (status = 'completed' AND completed_by IS NOT NULL AND completed_at IS NOT NULL AND talent_transaction_id IS NOT NULL AND reward_amount IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_story_submissions_status_created
  ON public.story_submissions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_submissions_author_created
  ON public.story_submissions(author_id, created_at DESC);

ALTER TABLE public.talent_transactions
  ADD COLUMN IF NOT EXISTS story_submission_id uuid REFERENCES public.story_submissions(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_talent_transactions_story_submission
  ON public.talent_transactions(story_submission_id)
  WHERE story_submission_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_story_submissions_updated_at ON public.story_submissions;
CREATE TRIGGER trg_story_submissions_updated_at
  BEFORE UPDATE ON public.story_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.story_submissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.story_submissions TO authenticated;

DROP POLICY IF EXISTS story_submissions_select_own_or_manager ON public.story_submissions;
CREATE POLICY story_submissions_select_own_or_manager ON public.story_submissions
  FOR SELECT TO authenticated
  USING (author_id = auth.uid() OR public.get_permission_rank(auth.uid()) >= 90);

CREATE OR REPLACE FUNCTION public.submit_story_submission(
  p_is_anonymous boolean,
  p_story_content text,
  p_song_request text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_story text := NULLIF(btrim(p_story_content), '');
  v_song text := NULLIF(btrim(p_song_request), '');
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;
  IF v_story IS NULL OR char_length(v_story) < 5 THEN
    RAISE EXCEPTION '사연은 5자 이상 작성해주세요.';
  END IF;
  IF char_length(v_story) > 5000 THEN
    RAISE EXCEPTION '사연은 5,000자 이하로 작성해주세요.';
  END IF;
  IF v_song IS NOT NULL AND char_length(v_song) > 200 THEN
    RAISE EXCEPTION '신청곡은 200자 이하로 작성해주세요.';
  END IF;

  INSERT INTO public.story_submissions (author_id, is_anonymous, story_content, song_request)
  VALUES (auth.uid(), COALESCE(p_is_anonymous, false), v_story, v_song)
  RETURNING id INTO v_id;

  RETURN json_build_object('success', true, 'submission_id', v_id, 'status', 'received');
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_story_submission(p_submission_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_submission public.story_submissions%ROWTYPE;
  v_item public.talent_items%ROWTYPE;
  v_author_type text;
  v_balance integer;
  v_transaction_id uuid;
  v_rank integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;
  SELECT COALESCE(public.get_permission_rank(permission_level), 0)
  INTO v_rank
  FROM public.profiles
  WHERE id = auth.uid();
  IF COALESCE(v_rank, 0) < 90 THEN
    RAISE EXCEPTION '전도사님 이상의 권한이 필요합니다.';
  END IF;

  SELECT * INTO v_submission
  FROM public.story_submissions
  WHERE id = p_submission_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '사연을 찾을 수 없습니다.';
  END IF;
  IF v_submission.status <> 'received' OR v_submission.talent_transaction_id IS NOT NULL THEN
    RAISE EXCEPTION '이미 접수완료 처리되어 달란트가 지급된 사연입니다.';
  END IF;

  SELECT user_type INTO v_author_type
  FROM public.profiles
  WHERE id = v_submission.author_id;
  SELECT * INTO v_item
  FROM public.talent_items
  WHERE name = '천국우체국 사연 등록'
    AND is_active = true
    AND (target_type IS NULL OR target_type = v_author_type)
  ORDER BY sort_order, created_at
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION '활성 상태의 ''천국우체국 사연 등록'' 달란트 항목을 찾을 수 없습니다. 대상 유형과 활성 상태를 확인해주세요.';
  END IF;

  UPDATE public.profiles
  SET talent_balance = COALESCE(talent_balance, 0) + v_item.talent_amount
  WHERE id = v_submission.author_id
  RETURNING talent_balance INTO v_balance;

  INSERT INTO public.talent_transactions (
    user_id, type, amount, balance_after, description, created_by, talent_item_id, story_submission_id
  ) VALUES (
    v_submission.author_id, 'earn', v_item.talent_amount, v_balance,
    v_item.name, auth.uid(), v_item.id, v_submission.id
  ) RETURNING id INTO v_transaction_id;

  UPDATE public.story_submissions
  SET status = 'completed',
      completed_by = auth.uid(),
      completed_at = now(),
      talent_transaction_id = v_transaction_id,
      reward_amount = v_item.talent_amount
  WHERE id = v_submission.id;

  RETURN json_build_object(
    'success', true,
    'submission_id', v_submission.id,
    'transaction_id', v_transaction_id,
    'amount', v_item.talent_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_story_submission(boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_story_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_story_submission(boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_story_submission(uuid) TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.code_items') IS NOT NULL THEN
    INSERT INTO public.code_items (group_key, code_key, code_value, sort_order, meta)
    VALUES
      ('activity_logs.action', 'STORY_SUBMISSION_CREATE', '천국우체국 사연 접수', 9100, '{"category":"TALENT","emoji":"💌"}'),
      ('activity_logs.action', 'STORY_SUBMISSION_COMPLETE', '천국우체국 사연 접수완료', 9110, '{"category":"TALENT","emoji":"🎁"}')
    ON CONFLICT (group_key, code_key) DO UPDATE
    SET code_value = EXCLUDED.code_value, sort_order = EXCLUDED.sort_order, meta = EXCLUDED.meta, is_active = true;
  END IF;
END $$;

-- GitHub Pages에 포함된 압축 공지 이미지(원본 1.8MB → 227KB)를 사용합니다.
-- 이미 같은 제목의 공지가 있으면 운영자가 수정한 내용을 덮어쓰지 않습니다.
INSERT INTO public.announcements (title, content, image_url, link_url, is_active, created_by_name)
SELECT
  '천국우체국 가을 사연 축제 “하나님 도와주세요”',
  E'추수감사절 특별 2부 순서\n\n사연 신청 기간: 10/11 ~ 10/25\n\n나의 고민, 소원 등 하나님의 도움이 필요한 사연을 작성해주세요. 익명으로도 작성할 수 있습니다.\n\n참여자 전원에게는 5줄 이상 작성 시 3달란트가 지급되며, 사연 채택 시 추가 선물이 있습니다.',
  'https://cho-talents.github.io/CHO-Talents/assets/heavenly-post-office-autumn-story-festival.jpg',
  'https://cho-talents.github.io/CHO-Talents/story-submission.html',
  true,
  '시스템'
WHERE NOT EXISTS (
  SELECT 1 FROM public.announcements
  WHERE title = '천국우체국 가을 사연 축제 “하나님 도와주세요”'
    AND is_deleted IS NOT TRUE
);

NOTIFY pgrst, 'reload schema';

COMMIT;
