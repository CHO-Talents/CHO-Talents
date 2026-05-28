-- TASK-023/024: 권한별 페이지 접근 + 로그 삭제 RPC + user_name 컬럼

-- 0. activity_logs에 user_name 컬럼 추가 (이미 있으면 무시)
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_name TEXT;

-- 1. 권한별 페이지 접근 관리 테이블
CREATE TABLE IF NOT EXISTS role_page_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_key TEXT NOT NULL,
  page_id TEXT NOT NULL,
  can_access BOOLEAN DEFAULT true,
  hidden_elements TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_key, page_id)
);

ALTER TABLE role_page_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_page_access_select" ON role_page_access;
CREATE POLICY "role_page_access_select" ON role_page_access
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "role_page_access_insert" ON role_page_access;
CREATE POLICY "role_page_access_insert" ON role_page_access
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND get_permission_rank(permission_level) >= 90)
  );

DROP POLICY IF EXISTS "role_page_access_update" ON role_page_access;
CREATE POLICY "role_page_access_update" ON role_page_access
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND get_permission_rank(permission_level) >= 90)
  );

DROP POLICY IF EXISTS "role_page_access_delete" ON role_page_access;
CREATE POLICY "role_page_access_delete" ON role_page_access
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND get_permission_rank(permission_level) >= 90)
  );

-- 2. activity_logs DELETE 정책 (이전 TASK-022에서도 포함, 여기서 재확인)
DROP POLICY IF EXISTS "activity_logs_delete" ON activity_logs;
CREATE POLICY "activity_logs_delete" ON activity_logs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND get_permission_rank(permission_level) >= 100
    )
  );

-- 3. reports 테이블 CRUD 정책 (재확인)
DROP POLICY IF EXISTS "reports_select" ON reports;
CREATE POLICY "reports_select" ON reports
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "reports_insert" ON reports;
CREATE POLICY "reports_insert" ON reports
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND get_permission_rank(permission_level) >= 80)
  );

DROP POLICY IF EXISTS "reports_update" ON reports;
CREATE POLICY "reports_update" ON reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND get_permission_rank(permission_level) >= 80)
  );

DROP POLICY IF EXISTS "reports_delete" ON reports;
CREATE POLICY "reports_delete" ON reports
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND get_permission_rank(permission_level) >= 80)
  );

-- 4. 로그 삭제 RPC 함수 (SECURITY DEFINER - RLS 우회)
CREATE OR REPLACE FUNCTION delete_logs_by_ids(p_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rank INTEGER;
  v_count INTEGER;
BEGIN
  SELECT get_permission_rank(permission_level) INTO v_rank
  FROM profiles WHERE id = auth.uid();
  IF v_rank < 100 THEN RAISE EXCEPTION 'Permission denied: rank % < 100', v_rank; END IF;
  DELETE FROM activity_logs WHERE id = ANY(p_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION delete_logs_by_range(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rank INTEGER;
  v_count INTEGER;
BEGIN
  SELECT get_permission_rank(permission_level) INTO v_rank
  FROM profiles WHERE id = auth.uid();
  IF v_rank < 100 THEN RAISE EXCEPTION 'Permission denied: rank % < 100', v_rank; END IF;
  DELETE FROM activity_logs WHERE created_at >= p_from AND created_at <= p_to;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
