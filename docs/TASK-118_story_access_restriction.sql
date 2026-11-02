-- 기존 사연과 관리자 처리를 보존하고 학생/일반 교사의 접근을 제한한다.
BEGIN;
DROP POLICY IF EXISTS story_submissions_select_own_or_manager ON public.story_submissions;
CREATE POLICY story_submissions_select_own_or_manager ON public.story_submissions
  FOR SELECT TO authenticated USING (
    public.get_permission_rank(auth.uid()) >= 90 OR
    (public.get_permission_rank(auth.uid()) >= 60 AND author_id = auth.uid())
  );

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
  IF auth.uid() IS NULL OR COALESCE(public.get_permission_rank(auth.uid()), 0) < 60 THEN
    RAISE EXCEPTION '부서 담당 교사 이상의 권한이 필요합니다.';
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

NOTIFY pgrst, 'reload schema';
COMMIT;
