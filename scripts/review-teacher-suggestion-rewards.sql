-- 읽기 전용 점검: 각 추천과 보상 원장, 실제 거래를 연결한다.
-- 동일 이름 계정은 username/부서를 확인해 구분한다. 데이터는 변경하지 않는다.
SELECT p.display_name, p.username, d.name AS department,
       s.id AS suggestion_id, s.name AS product_name, s.status,
       s.resolved_at AT TIME ZONE 'Asia/Seoul' AS resolved_at_kst,
       r.created_at AT TIME ZONE 'Asia/Seoul' AS rewarded_at_kst,
       r.transaction_id, t.user_id AS transaction_recipient_id,
       t.type, t.amount, t.description, t.source, t.grant_date,
       t.created_at AT TIME ZONE 'Asia/Seoul' AS transaction_at_kst
FROM public.profiles p
LEFT JOIN public.departments d ON d.id = p.department_id
JOIN public.product_suggestions s ON s.suggested_by = p.id
LEFT JOIN public.product_suggestion_adoption_rewards r ON r.suggestion_id = s.id
LEFT JOIN public.talent_transactions t ON t.id = r.transaction_id
WHERE p.user_type = 'teacher' AND p.display_name IN ('권혜리', '이재욱')
ORDER BY p.display_name, s.resolved_at NULLS LAST, s.created_at, s.id;

-- 추천 보상 거래 전체와 원장 연결 유무: 연결되지 않은 수동 지급도 남긴다.
SELECT p.display_name, p.username, d.name AS department,
       t.id AS transaction_id, t.amount, t.description, t.source, t.grant_date,
       t.created_at AT TIME ZONE 'Asia/Seoul' AS transaction_at_kst,
       r.suggestion_id, s.name AS product_name, s.status
FROM public.profiles p
LEFT JOIN public.departments d ON d.id = p.department_id
JOIN public.talent_transactions t ON t.user_id = p.id AND t.type = 'earn'
LEFT JOIN public.product_suggestion_adoption_rewards r ON r.transaction_id = t.id
LEFT JOIN public.product_suggestions s ON s.id = r.suggestion_id
WHERE p.user_type = 'teacher' AND p.display_name IN ('권혜리', '이재욱')
  AND (t.description IN ('상품 추천', '상품 추천 채택') OR t.source = 'product_suggestion_adoption')
ORDER BY p.display_name, t.created_at, t.id;
