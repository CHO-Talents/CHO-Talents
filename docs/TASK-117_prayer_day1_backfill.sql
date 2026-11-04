-- 읽기 전용: 항목 ID 또는 설명으로 특별새벽기도회 관련 거래 전체 조회.
-- 2026년 특별새벽기도회 이전의 거래도 포함하므로 날짜를 확인한 후 판단한다.
SELECT p.username, p.display_name, p.user_type,
       i.name AS item_name, i.target_type AS item_target_type,
       t.id, t.user_id, t.talent_item_id, t.type, t.amount, t.description,
       t.grant_date, t.attendance_date,
       t.created_at AT TIME ZONE 'Asia/Seoul' AS created_kst
FROM public.talent_transactions t
LEFT JOIN public.profiles p ON p.id = t.user_id
LEFT JOIN public.talent_items i ON i.id = t.talent_item_id
WHERE i.name = '특별새벽기도회 참석'
   OR t.description LIKE '%특별새벽기도회 참석%'
   OR (t.type = 'use' AND EXISTS (
       SELECT 1 FROM public.talent_transactions earned
       JOIN public.talent_items item ON item.id = earned.talent_item_id
       WHERE item.name = '특별새벽기도회 참석'
         AND earned.user_id = t.user_id AND earned.type = 'earn'
         AND t.description LIKE ('반환: [' || earned.id::text || ']%')
   ))
ORDER BY p.username, t.created_at, t.id;
