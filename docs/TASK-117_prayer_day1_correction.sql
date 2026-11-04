-- 2026-11-03 조회 결과에서 확인된 기존 지급 5건만 보정한다.
-- 새 첫째 날 지급이나 반환이 생긴 경우 해당 사용자는 변경하지 않는다.
-- 금액과 잔액은 그대로 유지한다. 지급 집계일은 11월 8일로 정정된다.
UPDATE public.talent_transactions t
SET attendance_date = DATE '2026-11-02',
    grant_date = DATE '2026-11-08',
    description = '특별새벽기도회 참석 (특새 1일차, 2026-11-02)'
WHERE t.id IN (
  '1852abf2-b420-46d7-803d-6d14cb46b51f',
  'ab6a2b97-b218-4551-9d1e-32f9e72620de',
  '02236011-076b-4158-8f72-22fc329d547c',
  'e43c667b-cd85-436d-91d9-29f56617249d',
  '9735afd7-4a5e-4550-996e-ec7dc2d26840'
)
AND t.type = 'earn' AND t.amount = 3
AND t.talent_item_id = '15cf5ba4-ee50-4bde-a7d7-ec7a3b976ae9'
AND t.description = '특별새벽기도회 참석'
AND t.attendance_date IS NULL AND t.grant_date = DATE '2026-11-01'
AND (t.created_at AT TIME ZONE 'Asia/Seoul')::date = DATE '2026-11-02'
AND NOT EXISTS (
  SELECT 1 FROM public.talent_transactions other
  WHERE other.user_id = t.user_id AND other.type = 'earn'
    AND other.talent_item_id = t.talent_item_id
    AND other.attendance_date = DATE '2026-11-02' AND other.id <> t.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.talent_transactions returned
  WHERE returned.user_id = t.user_id AND returned.type = 'use'
    AND (returned.description LIKE ('반환: [' || t.id::text || ']%')
      OR (returned.amount = t.amount AND returned.description = '반환: [] 특별새벽기도회 참석'))
)
RETURNING t.id, t.user_id, t.amount, t.description, t.grant_date, t.attendance_date;
