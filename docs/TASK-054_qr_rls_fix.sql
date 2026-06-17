-- TASK-054: talent_qr_codes RLS 정책 수정
-- 문제: TASK-030에서 생성한 INSERT/UPDATE/DELETE 정책이 get_permission_rank() 호출 시
--       public. 스키마 접두사를 누락하여, Supabase RLS 평가 컨텍스트에서 함수를 찾지 못함
-- 증상: rank 90+ 사용자도 QR 코드 생성 시 "new row violates row-level security policy" 에러
-- 수정: public.get_permission_rank(auth.uid()) 형태로 통일 (SECURITY DEFINER UUID 오버로드 사용)
-- 실행 위치: Supabase Dashboard > SQL Editor

-- 기존 정책 전부 삭제
DROP POLICY IF EXISTS "qr_codes_select" ON public.talent_qr_codes;
DROP POLICY IF EXISTS "qr_codes_insert" ON public.talent_qr_codes;
DROP POLICY IF EXISTS "qr_codes_update" ON public.talent_qr_codes;
DROP POLICY IF EXISTS "qr_codes_delete" ON public.talent_qr_codes;

-- RLS 활성화 확인
ALTER TABLE public.talent_qr_codes ENABLE ROW LEVEL SECURITY;

-- SELECT: 인증된 사용자 모두 조회 가능
CREATE POLICY "qr_codes_select" ON public.talent_qr_codes
  FOR SELECT TO authenticated USING (true);

-- INSERT: rank 90 이상 (전도사님+)
CREATE POLICY "qr_codes_insert" ON public.talent_qr_codes
  FOR INSERT TO authenticated
  WITH CHECK (public.get_permission_rank(auth.uid()) >= 90);

-- UPDATE: rank 90 이상
CREATE POLICY "qr_codes_update" ON public.talent_qr_codes
  FOR UPDATE TO authenticated
  USING (public.get_permission_rank(auth.uid()) >= 90);

-- DELETE: rank 90 이상
CREATE POLICY "qr_codes_delete" ON public.talent_qr_codes
  FOR DELETE TO authenticated
  USING (public.get_permission_rank(auth.uid()) >= 90);

-- 스키마 캐시 리로드
NOTIFY pgrst, 'reload schema';
