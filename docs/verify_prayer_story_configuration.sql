-- 읽기 전용 운영 설정 점검. 함수 정의와 권한, 정책 및 항목 설정만 조회합니다.
SELECT 'function' AS kind, p.oid::regprocedure::text AS name,
       pg_get_functiondef(p.oid) AS details
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('give_talent', 'submit_story_submission', 'complete_story_submission')
UNION ALL
SELECT 'policy', policyname, concat('command=', cmd, '; roles=', roles::text,
       '; using=', coalesce(qual, ''), '; check=', coalesce(with_check, ''))
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'story_submissions'
UNION ALL
SELECT 'item', name, concat('target=', target_type, '; active=', is_active,
       '; amount=', talent_amount, '; id=', id)
FROM public.talent_items
WHERE name IN ('특별새벽기도회 참석', '천국우체국 사연 등록')
UNION ALL
SELECT 'execute_privilege', p.oid::regprocedure::text,
       concat('authenticated=', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
              '; anon=', has_function_privilege('anon', p.oid, 'EXECUTE'))
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('give_talent', 'submit_story_submission', 'complete_story_submission')
ORDER BY kind, name;
