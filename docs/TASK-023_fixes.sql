-- TASK-023: 권한별 페이지 접근 테이블 + 로그 DELETE 정책 재확인

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
