-- ============================================================
-- TASK-095: 오류 로그 이슈 집계 및 영문 로그 한글화
--
-- 실행 순서
--   1) 아래 "A. 오류 이슈 목록" SELECT를 먼저 실행하여 중복 제거된 이슈를 확인합니다.
--   2) "B. 한글화 적용" 트랜잭션을 실행합니다.
--   3) "C. 잔여 영문 확인" SELECT에서 남은 항목만 추가 번역합니다.
--
-- 번역은 action 코드북과 activity_logs.details의 문자열 값만 변경합니다.
-- activity_logs.action, level, created_at 및 원본 로그 행은 삭제하거나 합치지 않습니다.
-- ============================================================

-- ============================================================
-- A. 오류 이슈 목록 (읽기 전용)
--
-- errorFingerprint가 있으면 같은 클라이언트 오류로 묶고, 없으면
-- action + page + UUID를 제거한 대표 오류 문구로 중복을 제거합니다.
-- 로그인 오입력, 주간 제한, 권한 거부처럼 정상 업무 흐름인 오류는 제외합니다.
-- ============================================================
WITH error_source AS (
  SELECT
    l.id,
    l.created_at,
    l.level,
    l.action,
    l.page,
    l.details,
    COALESCE(l.is_acknowledged, false) AS is_acknowledged,
    COALESCE(l.details->>'errorFingerprint', '') AS error_fingerprint,
    COALESCE(
      NULLIF(l.details->>'message', ''),
      NULLIF(l.details->>'error', ''),
      NULLIF(l.details->>'reason', ''),
      NULLIF(l.details->>'hint', ''),
      '(상세 문구 없음)'
    ) AS raw_message
  FROM public.activity_logs l
  WHERE l.level IN ('ERROR', 'FATAL', 'CRITICAL')
    AND COALESCE(l.is_deleted, false) = false
),
normalized AS (
  SELECT
    e.*,
    regexp_replace(
      e.raw_message,
      '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
      '{uuid}',
      'gi'
    ) AS normalized_message
  FROM error_source e
),
classified AS (
  SELECT
    n.*,
    CASE
      WHEN n.action IN (
        'LOGIN_FAIL', 'LOGIN_PENDING_APPROVAL', 'USER_ID_CHECK_DUPLICATE',
        'QR_LOCATION_PERMISSION_BLOCKED', 'TALENT_GIVE_ITEM_DENIED',
        'TALENT_USE_DENIED', 'ORDER_REQUEST_DENIED', 'PROXY_ORDER_DENIED',
        'ORDER_PURCHASE_CONFIRM_DENIED'
      ) THEN false
      ELSE true
    END AS is_actionable,
    CASE
      WHEN n.level IN ('FATAL', 'CRITICAL')
        OR n.action IN ('JS_ERROR', 'PROMISE_REJECTION', 'CONNECTION_FAIL', 'SLACK_NOTIFY_FAIL')
        THEN '높음'
      WHEN n.action IN ('SERVICE_USAGE_COLLECT_FAIL', 'ORDER_CANCEL_REFUND_FAIL')
        THEN '높음'
      WHEN n.action LIKE '%_FAIL' OR n.action LIKE '%_ERROR'
        THEN '보통'
      ELSE '검토'
    END AS priority,
    CASE
      WHEN n.action IN ('JS_ERROR', 'PROMISE_REJECTION') THEN '클라이언트 오류'
      WHEN n.action IN ('CONNECTION_FAIL', 'SLACK_NOTIFY_FAIL', 'SERVICE_USAGE_COLLECT_FAIL') THEN '외부 연동/네트워크'
      WHEN n.action LIKE 'AUTH_%' OR n.action LIKE 'LOGIN_%' THEN '인증/권한'
      WHEN n.action LIKE 'ORDER_%' OR n.action LIKE 'PROXY_%' THEN '주문/결제 흐름'
      WHEN n.action LIKE 'TALENT_%' OR n.action LIKE 'ATTENDANCE_%' THEN '달란트 흐름'
      ELSE '기타 기능 오류'
    END AS issue_category,
    COALESCE(
      NULLIF(n.error_fingerprint, ''),
      n.action || '|' || COALESCE(n.page, '-') || '|' || n.normalized_message
    ) AS issue_signature
  FROM normalized n
),
ranked AS (
  SELECT
    c.*,
    row_number() OVER (PARTITION BY c.issue_signature ORDER BY c.created_at DESC) AS sample_rank
  FROM classified c
  WHERE c.is_actionable
)
SELECT
  r.priority AS 우선순위,
  r.issue_category AS 분류,
  r.action AS 액션코드,
  COALESCE(ci.code_value, r.action) AS 액션명,
  COUNT(*)::int AS 발생건수,
  COUNT(*) FILTER (WHERE NOT r.is_acknowledged)::int AS 미확인건수,
  MIN(r.created_at) AS 최초발생,
  MAX(r.created_at) AS 최종발생,
  r.normalized_message AS 대표오류,
  jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      '발생시각', r.created_at,
      '페이지', r.page,
      '상세', r.details
    )
    ORDER BY r.created_at DESC
  ) FILTER (WHERE r.sample_rank <= 3) AS 최근예시
FROM ranked r
LEFT JOIN public.code_items ci
  ON ci.group_key = 'activity_logs.action'
 AND ci.code_key = r.action
 AND ci.is_active = true
GROUP BY r.priority, r.issue_category, r.action, ci.code_value, r.normalized_message
ORDER BY
  CASE r.priority WHEN '높음' THEN 1 WHEN '보통' THEN 2 ELSE 3 END,
  MAX(r.created_at) DESC,
  COUNT(*) DESC;


-- ============================================================
-- B. 한글화 적용
-- ============================================================
BEGIN;

-- TASK-087에 추가한 최신 액션 라벨을 현재 로그에 실제 존재하는 경우에만 보정합니다.
WITH translations (code_key, code_value, sort_order, meta) AS (
  VALUES
    ('SLACK_NOTIFY_FAIL', 'Slack 알림 전송 실패', 9095, '{"category":"PERM","emoji":"⚠️"}'::jsonb),
    ('PRODUCT_BULK_CREATE', '상품 일괄 등록', 5051, '{"category":"ORDER","emoji":"📥"}'::jsonb),
    ('PRODUCT_SUGGESTION_ADOPTION_TALENT', '상품 추천 채택 달란트 지급', 5075, '{"category":"TALENT","emoji":"💡"}'::jsonb)
),
current_actions AS (
  SELECT DISTINCT btrim(action) AS code_key
  FROM public.activity_logs
  WHERE action IS NOT NULL
    AND btrim(action) <> ''
)
INSERT INTO public.code_items (group_key, code_key, code_value, sort_order, is_active, meta)
SELECT 'activity_logs.action', t.code_key, t.code_value, t.sort_order, true, t.meta
FROM translations t
INNER JOIN current_actions a USING (code_key)
ON CONFLICT (group_key, code_key) DO UPDATE
SET code_value = EXCLUDED.code_value,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    meta = EXCLUDED.meta,
    updated_at = now()
WHERE COALESCE(btrim(public.code_items.code_value), '') = ''
   OR public.code_items.code_value = public.code_items.code_key
   OR public.code_items.code_value !~ '[가-힣]';

CREATE OR REPLACE FUNCTION pg_temp.cho_translate_activity_log_text(p_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := p_value;
BEGIN
  IF v IS NULL OR v !~ '[A-Za-z]' THEN
    RETURN v;
  END IF;

  CASE v
    WHEN 'Supabase client not initialized' THEN RETURN 'Supabase 클라이언트 초기화 안 됨';
    WHEN 'Supabase auth session missing' THEN RETURN 'Supabase 인증 세션 없음';
    WHEN 'Supabase auth session error' THEN RETURN 'Supabase 인증 세션 오류';
    WHEN 'Supabase auth session exception' THEN RETURN 'Supabase 인증 세션 예외';
    WHEN 'Profile RPC returned no profile' THEN RETURN '프로필 RPC 결과 없음';
    WHEN 'Invalid login credentials' THEN RETURN '로그인 정보가 일치하지 않습니다';
    WHEN 'Email not confirmed' THEN RETURN '이메일 인증이 완료되지 않았습니다';
    WHEN 'User already registered' THEN RETURN '이미 등록된 사용자입니다';
    WHEN 'JWT expired' THEN RETURN '인증 토큰이 만료되었습니다';
    WHEN 'Invalid JWT' THEN RETURN '유효하지 않은 인증 토큰입니다';
    WHEN 'refresh_token_not_found' THEN RETURN '세션 갱신 토큰을 찾을 수 없습니다';
    WHEN 'TypeError: Load failed' THEN RETURN '로드 실패';
    WHEN 'Load failed' THEN RETURN '로드 실패';
    WHEN 'Failed to fetch' THEN RETURN '네트워크 요청 실패';
    WHEN 'fetch failed' THEN RETURN '네트워크 요청 실패';
    WHEN 'Network request failed' THEN RETURN '네트워크 요청 실패';
    WHEN 'NetworkError when attempting to fetch resource.' THEN RETURN '네트워크 리소스 요청 실패';
    WHEN 'The network connection was lost.' THEN RETURN '네트워크 연결이 끊어졌습니다';
    WHEN 'Script error.' THEN RETURN '스크립트 오류';
    WHEN 'User denied Geolocation' THEN RETURN '사용자가 위치 권한을 거부했습니다';
    WHEN 'Cannot coerce the result to a single JSON object' THEN RETURN '단일 JSON 객체로 변환할 수 없습니다';
    WHEN 'Unauthorized' THEN RETURN '권한이 없습니다';
    WHEN 'Failed to send a request to the Edge Function' THEN RETURN 'Edge Function 요청 전송 실패';
    WHEN 'Edge Function returned a non-2xx status code' THEN RETURN 'Edge Function이 오류 상태를 반환했습니다';
    WHEN 'last_activity' THEN RETURN '마지막 활동 기준';
    WHEN 'idle_timer' THEN RETURN '유휴 타이머 기준';
    WHEN 'visibilitychange' THEN RETURN '탭 재활성화 기준';
    WHEN 'weekly_duplicate' THEN RETURN '주간 중복 지급';
    WHEN 'duplicate_pending' THEN RETURN '이미 대기 중인 요청';
    WHEN 'cached_session' THEN RETURN '캐시 세션으로 복구';
    WHEN 'profiles_fallback' THEN RETURN '프로필 직접 조회로 복구';
    WHEN 'cancel_aborted_before_partial_update' THEN RETURN '부분 취소 방지를 위해 중단';
    ELSE NULL;
  END CASE;

  IF v ~* '^Already given this item this week:\s*' THEN
    RETURN regexp_replace(v, '^Already given this item this week:\s*', '이번 주에 이미 지급된 항목입니다: ', 'i');
  END IF;
  IF v ~* '^permission denied for table [A-Za-z0-9_.]+$' THEN
    RETURN regexp_replace(v, '^permission denied for table ', '') || ' 테이블 권한이 없습니다';
  END IF;
  IF v ~* '^relation ".+" does not exist$' THEN
    RETURN '필요한 테이블 또는 뷰를 찾을 수 없습니다';
  END IF;
  IF v ~* '^function .+ does not exist$' OR v ~* '^Could not find the function' THEN
    RETURN '필요한 DB 함수를 찾을 수 없습니다';
  END IF;
  IF v ~* 'row-level security policy' THEN
    RETURN '행 수준 보안(RLS) 정책에 의해 요청이 거부되었습니다';
  END IF;
  IF v ~* '^duplicate key value violates unique constraint' THEN
    RETURN '중복된 데이터로 저장할 수 없습니다';
  END IF;

  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.cho_translate_activity_log_json(p_json jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  item record;
  output_object jsonb := '{}'::jsonb;
  output_array jsonb := '[]'::jsonb;
BEGIN
  IF p_json IS NULL THEN
    RETURN p_json;
  END IF;

  CASE jsonb_typeof(p_json)
    WHEN 'object' THEN
      FOR item IN SELECT key, value FROM jsonb_each(p_json) LOOP
        output_object := output_object || jsonb_build_object(
          item.key,
          pg_temp.cho_translate_activity_log_json(item.value)
        );
      END LOOP;
      RETURN output_object;
    WHEN 'array' THEN
      FOR item IN SELECT value FROM jsonb_array_elements(p_json) LOOP
        output_array := output_array || jsonb_build_array(
          pg_temp.cho_translate_activity_log_json(item.value)
        );
      END LOOP;
      RETURN output_array;
    WHEN 'string' THEN
      RETURN to_jsonb(pg_temp.cho_translate_activity_log_text(p_json #>> '{}'));
    ELSE
      RETURN p_json;
  END CASE;
END;
$$;

WITH candidates AS (
  SELECT
    id,
    details,
    pg_temp.cho_translate_activity_log_json(details) AS translated_details
  FROM public.activity_logs
  WHERE details IS NOT NULL
),
updated AS (
  UPDATE public.activity_logs l
  SET details = c.translated_details
  FROM candidates c
  WHERE l.id = c.id
    AND c.translated_details IS DISTINCT FROM c.details
  RETURNING l.action
)
SELECT action AS 액션코드, count(*)::int AS 한글화건수
FROM updated
GROUP BY action
ORDER BY action;

COMMIT;


-- ============================================================
-- C. 잔여 영문 확인 (읽기 전용)
--
-- 아래 결과의 error/message/reason/hint 값만 확인해 필요한 번역을
-- cho_translate_activity_log_text()의 CASE에 추가한 뒤 B를 재실행합니다.
-- URL, 아이디, UUID처럼 번역 대상이 아닌 값은 의도적으로 제외합니다.
-- ============================================================
SELECT
  l.action AS 액션코드,
  COALESCE(ci.code_value, l.action) AS 액션명,
  COALESCE(
    NULLIF(l.details->>'error', ''),
    NULLIF(l.details->>'message', ''),
    NULLIF(l.details->>'reason', ''),
    NULLIF(l.details->>'hint', '')
  ) AS 잔여영문,
  count(*)::int AS 발생건수,
  max(l.created_at) AS 최종발생
FROM public.activity_logs l
LEFT JOIN public.code_items ci
  ON ci.group_key = 'activity_logs.action'
 AND ci.code_key = l.action
 AND ci.is_active = true
WHERE COALESCE(l.is_deleted, false) = false
  AND COALESCE(
    NULLIF(l.details->>'error', ''),
    NULLIF(l.details->>'message', ''),
    NULLIF(l.details->>'reason', ''),
    NULLIF(l.details->>'hint', '')
  ) ~ '[A-Za-z]'
  AND COALESCE(
    NULLIF(l.details->>'error', ''),
    NULLIF(l.details->>'message', ''),
    NULLIF(l.details->>'reason', ''),
    NULLIF(l.details->>'hint', '')
  ) !~* '^https?://'
GROUP BY l.action, ci.code_value, 잔여영문
ORDER BY max(l.created_at) DESC, count(*) DESC;
