-- ============================================================
-- TASK-030: talent_qr_codes + talent_qr_scans 테이블 생성
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 1. talent_qr_codes 테이블
CREATE TABLE IF NOT EXISTS public.talent_qr_codes (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code          text NOT NULL UNIQUE,
  description   text,
  amount        integer NOT NULL DEFAULT 1,
  max_uses      integer,
  used_count    integer NOT NULL DEFAULT 0,
  expires_at    timestamptz,
  is_active     boolean NOT NULL DEFAULT true,
  talent_item_id uuid REFERENCES public.talent_items(id),
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.talent_qr_codes IS 'QR 코드 기반 달란트 지급 코드';

-- 2. talent_qr_scans 테이블
CREATE TABLE IF NOT EXISTS public.talent_qr_scans (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code_id    uuid NOT NULL REFERENCES public.talent_qr_codes(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  scanned_at    timestamptz NOT NULL DEFAULT now(),
  ip_address    text,
  user_agent    text,
  latitude      double precision,
  longitude     double precision,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.talent_qr_scans IS 'QR 코드 스캔 이력';

CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code ON public.talent_qr_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_user    ON public.talent_qr_scans(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_scans_unique ON public.talent_qr_scans(qr_code_id, user_id);

-- 3. RLS 정책
ALTER TABLE public.talent_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_qr_scans ENABLE ROW LEVEL SECURITY;

-- talent_qr_codes: 인증 사용자 SELECT, rank 90+ CUD
CREATE POLICY "qr_codes_select" ON public.talent_qr_codes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "qr_codes_insert" ON public.talent_qr_codes
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT permission_rank FROM public.profiles WHERE id = auth.uid()) >= 90
  );

CREATE POLICY "qr_codes_update" ON public.talent_qr_codes
  FOR UPDATE TO authenticated
  USING (
    (SELECT permission_rank FROM public.profiles WHERE id = auth.uid()) >= 90
  );

CREATE POLICY "qr_codes_delete" ON public.talent_qr_codes
  FOR DELETE TO authenticated
  USING (
    (SELECT permission_rank FROM public.profiles WHERE id = auth.uid()) >= 90
  );

-- talent_qr_scans: 인증 사용자 SELECT/INSERT
CREATE POLICY "qr_scans_select" ON public.talent_qr_scans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "qr_scans_insert" ON public.talent_qr_scans
  FOR INSERT TO authenticated WITH CHECK (true);

-- 4. 스키마 캐시 리로드
NOTIFY pgrst, 'reload schema';
