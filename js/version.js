/**
 * 버전 관리 모듈 - CHO-Talents
 */
const APP_VERSION = {
  current: '3.12.3',
  date: '2026-05-30',
  history: [
    {
      version: '3.12.3',
      date: '2026-05-30',
      title: '데스크탑 네비게이션 표시 오류 수정 (항목 사라짐/2줄 표시)',
      changes: [
        'common.css: top-nav height 56px→48px + overflow-x:auto 가로 스크롤 적용',
        'common.css: top-nav-links flex-wrap:wrap 제거 + flex-shrink:0 고정',
        'common.css: top-nav-links li/a white-space:nowrap 적용 (한 줄 유지)',
        'common.css: 모바일(768px) 반응형 overflow/white-space 별도 복원',
        'shop.html/earn-talents.html: innerHTML 트릭 제거 → 별도 li 사전 렌더링 (사용자정보/로그아웃 2줄 표시 해결)'
      ]
    },
    {
      version: '3.12.2',
      date: '2026-05-30',
      title: 'UI/기능 개선: 네비 통일, 달란트 스코핑, 대리 구매, 내 구매 상품 페이지',
      changes: [
        '네비게이션 통일: 전체 페이지에 "내 구매 상품" 메뉴 추가 (admin 15 + 공개 5)',
        '보고서 리디렉트 수정: initPage minRank 통과 시 role_page_access can_access=false 무시',
        '달란트 관리: 일반 교사(40) 반 미배정 시 빈 목록 + canGiveTalent classNumber 필수화',
        '달란트 항목 관리 버튼: data-min-perm="60" (부서 담당 교사 이상만 표시)',
        '로그인 후 리디렉트: 모든 권한 index.html(메인 페이지)로 통일',
        'my-orders.html 신규 생성: 본인 구매 내역 조회 (4단계 상태 배지, 관리자 정보 미표시)',
        '대리 구매 기능: shop.html에 rank 40+ 대리 구매 모달 추가 (스코핑 규칙 적용)',
        '사용자 관리: 부서 담당 교사(60+) 반 수정 활성화, 부장 교사(80+) 부서 필터 추가',
        '관리자 관리: 학생 검색 제외, 부장 교사(80+) 부서 필터 추가'
      ]
    },
    {
      version: '3.12.1',
      date: '2026-05-29',
      title: '메인 로그인 수정 + 네비 배지/폰트 통일 + 보고서 누락 등록',
      changes: [
        'index.html: initSupabase() 누락 수정 (loadAuthSession 전 _sb 초기화)',
        'common.css: .badge 스타일 추가 (position:absolute, 배경 빨강, 원형 배지)',
        'common.css: top-nav-links 폰트 0.88rem→0.8rem, padding/border-radius admin.css와 통일',
        'common.css: 768px 반응형 badge position:static 인라인 전환',
        '보고서 SEED: TASK-007 backup_checklist, TASK-011 test_report 추가',
        '보고서 SEED: TASK-013A, TASK-013BCD change_report 추가',
        '보고서 REPORT_SEED_MAP: TASK-013A, TASK-013BCD 추가'
      ]
    },
    {
      version: '3.12.0',
      date: '2026-05-29',
      title: '기능 수정 + 문서 정비',
      changes: [
        '페이지 기능: role_page_features 테이블 생성 + RLS 정책 + 스키마 캐시 리로드',
        '페이지 기능: 그리드 4열→6열 변경 (구분/유형/권한/등급/설명/관리)',
        '메인 페이지: 로그인 🔐 / 로그아웃 🔓 이모지 구분 + try-catch 세션 로드',
        '네비게이션: admin 15개 파일에 "달란트 적립" 링크 추가',
        '네비게이션: public 3개 파일(shop/earn-talents/my-talents)에 admin nav 전체 항목 동일 순서 구성',
        '네비게이션: public 페이지에 updateNavOrderBadge() 호출 추가',
        '달란트 관리: "📋 달란트 항목 관리" 버튼 추가 (talent-items.html 링크)',
        '구매 관리: 탭 순서 변경 (전체 > 구매 신청 > 상품 준비 > 상품 구매 > 상품 지급)',
        '구매 관리: 기본 선택 탭 "전체" + 초기 제목 "전체 목록" + statusFilterWrap 표시',
        '로그: 제목 카운트 "활동 로그 (X/Y)" 형식 (현재 건수/전체 활성 건수)',
        '로그: 페이지네이션 번호 버튼 5개 + 말줄임(...) + 총 페이지 수 표시',
        '작업 이력: PERM_KEY_LABELS 한글 매핑 (admin→관리자 등)',
        '작업 이력: DETAIL_KEY_LABELS 40+ 필드 한글 매핑',
        '작업 이력: extractTarget() roleKey/permissionKey 한글 변환',
        '작업 이력: localizeDetailJson() 상세 모달 JSON 키 한글 라벨 병기',
        '문서: TASK-029 4종 생성 (plan/test_scenario/test_result/change_report)',
        '보고서: TASK-029 4종 + 기존 누락 문서(TASK-001~011) SEED 등록'
      ]
    },
    {
      version: '3.11.0',
      date: '2026-05-29',
      title: '반응형 페이지 + 네비게이션 통합',
      changes: [
        'CSS 반응형 브레이크포인트 통합: 480/640/768/1024px 4단계 (실사용자 해상도 기반)',
        'admin.css: 1024px 테이블 스크롤 시작, 768px 햄버거 메뉴 전환',
        'common.css: 768px 햄버거 메뉴, data-table 모바일 스크롤 추가',
        'style.css: 768px/480px 2단계 브레이크포인트 추가 (landing 페이지)',
        '모바일 네비게이션: admin-nav 햄버거 버튼 + 세로 드롭다운 (15개 파일)',
        '모바일 네비게이션: top-nav 햄버거 버튼 (shop/earn-talents/my-talents)',
        '테이블 반응형: min-width 700→600→520px 단계별 축소, 셀 패딩 최적화',
        '모달/폼 반응형: 640px 이하 flex-wrap 강제, 모달 전폭 확대',
        '대시보드: quickLinks 그리드 640px 2열, 480px 1열 강제',
        'detailSummary 3열→1열 모바일 전환 (640px)',
        'my-talents.html: Template A 방식 네비게이션 통합 (navLinks/navMyTalent/navAuthArea)',
        'index.html: 로그인 후 달란트 적립/상점/내 달란트/관리 링크 추가',
        'applyPermNav() 양방향 처리: show + hide (display:none 초기값 지원)',
        'admin nav 불일치 수정: page-access data-min-perm 80→100',
        'admin nav 불일치 수정: audit data-min-perm 80→100',
        'admin nav 불일치 수정: page-features active 클래스 추가'
      ]
    },
    {
      version: '3.10.0',
      date: '2026-05-29',
      title: '권한 세분화 + 구매 관리 개편 + 재고 제거',
      changes: [
        '달란트 관리 권한 세분화: rank 80 전체 조회 + 담당 부서만 지급',
        'give_talent RPC: managed_dept_id 기반 rank 60-89 스코핑 추가',
        '가입 승인 권한: 기존 부장/부서담당 스코핑 검증 완료',
        '부서 이동: rank 60 섹션 표시, rank 80 전체조회/담당부서 처리',
        '부서 이동 버튼: rank < 90 "부서 이동 신청"으로 명칭 변경',
        '로그인: 승인 대기/거부/비밀번호 오류 메시지 세분화',
        '재고 시스템 제거: shop.html 재고 표시/체크 제거',
        '재고 시스템 제거: admin/shop.html 재고 입력/컬럼 제거',
        '구매 관리 전면 개편: 처리자명 + 처리일시 컬럼 추가',
        '구매 관리: 상태 컬럼 제거 (탭 필터로 대체)',
        '구매 관리: "전체" 탭 + 상태 필터 드롭다운 추가',
        '구매 관리 권한: preparing/purchased 처리 admin전용 → rank 60+/담당부서로 확대',
        '구매 관리 네비게이션 배지: 처리 대기 건수 표시 (getPendingOrderCount)',
        'activity-log.js: getPendingOrderCount() + updateNavOrderBadge() 추가',
        '페이지 접근/기능: initPage(100) 관리자 전용화',
        '작업 이력: initPage(100) 관리자 전용화',
        '전체 admin 네비게이션: page-access/features/audit data-min-perm 80→100',
        '전체 admin 네비게이션: 구매 관리 배지(navOrderBadge) 추가 (15개 파일)',
        '전체 admin 페이지: updateNavOrderBadge() 호출 추가',
        '보고서: TASK-027 v3.10.0 보고서 시드 추가'
      ]
    },
    {
      version: '3.9.0',
      date: '2026-05-29',
      title: '상품 구매 시스템 구축 + 달란트 관리 개편 + 전체 명칭 통일',
      changes: [
        '상품 구매 시스템 신규 구축: 4단계 구매 흐름 (구매 신청→상품 준비→상품 구매→상품 지급)',
        'admin/purchases.html 신규: 구매 관리 페이지 (권한별 조회/처리, 일괄 지급 완료)',
        'shop.html: 상품 카드에 구매 신청 버튼 추가 (잔여 달란트 검증 포함)',
        'my-talents.html: 사용 대기 달란트 카드 추가, 구매 내역 표시',
        'product_orders 테이블 + RLS + request_product_order/confirm_product_purchase RPC',
        'profiles.pending_talent 컬럼 추가 (사용 대기 달란트)',
        '달란트 관리 개편: 항목별 체크박스 선택 + 일괄 지급 확정 방식으로 전환',
        '달란트 관리: 이미 지급된 항목 자동 표시 (오늘 기준)',
        '달란트 반환 기능: 부장 교사(80+) 이상만 사유 입력 후 반환 처리 가능',
        '달란트 상세 모달: 지급자 컬럼 추가 (created_by → profiles 조인)',
        '로그 페이지: is_deleted 컬럼 미존재 시 폴백 처리로 로그 표시 복구',
        '로그 페이지: 삭제 대기/목록/일괄 완료 버튼 관리자(100+) 전용으로 제한',
        '명칭 통일: 물품→상품 (전체 페이지), 부장→부장 교사, 부서관리자→부서 담당 교사',
        'shop.html: 교사 접속 시 기본 필터를 교사용으로 자동 설정',
        '전체 admin 페이지: 네비게이션에 구매 관리 메뉴 추가'
      ]
    },
    {
      version: '3.8.4',
      date: '2026-05-28',
      title: '로그 삭제 → 소프트 삭제(삭제 대기) 방식 전환',
      changes: [
        '로그 삭제: 실제 DELETE 대신 is_deleted=true 상태 변경 (소프트 삭제)',
        'fetchLogs: is_deleted=false 또는 null인 로그만 조회 (삭제 대기 항목 제외)',
        '삭제 대기 목록: 별도 뷰로 삭제 대기 로그 조회 + 복원 기능',
        '실제 데이터 삭제는 관리자가 SQL Editor에서 직접 수행',
        'activity_logs: is_deleted, deleted_at 컬럼 추가',
        'RPC 삭제 함수 제거 (더 이상 불필요)'
      ]
    },
    {
      version: '3.8.3',
      date: '2026-05-28',
      title: '작업 이력 실명 표시 + 보고서 자동 복구',
      changes: [
        'writeLog(): user_name(표시이름) + details._userName 저장으로 작업자 실명 기록',
        'audit.html: user_name/details._userName/username 폴백 체인으로 작업자 실명 표시',
        'audit.html: 관리자(100+)인 경우 작업자 이름 옆에 아이디 표시',
        'reports.html: 깨진 보고서(???) 자동 감지 + REPORT_SEED_MAP으로 자동 복구'
      ]
    },
    {
      version: '3.8.2',
      date: '2026-05-28',
      title: '페이지 접근 권한별 개편 + 작업 이력 관리 + DB 연동 적용',
      changes: [
        'page-access.html: 사용자별 → 유형/권한별 관리로 전면 개편 (role_page_access 테이블)',
        '신규 페이지: admin/audit.html - 작업 이력 조회 (부장 교사 80+ 접근)',
        'auth.js initPage(): role_page_access DB 조회 → 페이지 접근 차단 + 요소 숨김 실제 적용',
        'auth.js detectCurrentPageId(): 현재 페이지 ID 자동 감지 함수 추가',
        'activity-log.js: deleteLogsByIds/deleteLogsByDateRange 상세 디버그 로그 + RLS 미적용 안내',
        'reports.html: 보고서 수정 버튼 추가 (editReport 함수)',
        'admin.css: @keyframes spin-slow + .brand-icon 회전 애니메이션 추가',
        '전체 admin 페이지: nav brand 별 이모지 회전 적용',
        '전체 admin 페이지: 네비게이션에 작업 이력 메뉴 추가',
        'docs/TASK-023_fixes.sql: role_page_access 테이블 + activity_logs/reports RLS 정책'
      ]
    },
    {
      version: '3.8.1',
      date: '2026-05-28',
      title: '슈퍼관리자 관리 수정 + UI/UX 개선 + 페이지 기능 권한별 개편',
      changes: [
        'users.html/managers.html: 슈퍼관리자(rank 110)가 일반 관리자(rank 100) 관리 가능하도록 targetRank 계산 수정',
        'activity-log.js: 세션 캐시에 isSuperAdmin 필드 갱신 로직 추가',
        'admin.css: 네비게이션 한 줄 가로 스크롤 (flex-wrap 제거, overflow-x: auto)',
        'admin.css: 테이블 셀 패딩 축소 (th: 0.5rem 0.6rem, td: 0.45rem 0.6rem)',
        'admin.css: 모바일 640px 이하 테이블 더 컴팩트하게 (padding 0.35rem, min-width 500px)',
        'page-features.html: 사용자별 → 권한별 관리로 전면 개편 (role_page_features 테이블)',
        'page-features.html: 슈퍼관리자 행은 is_super_admin 계정만 표시, 모든 기능 기본 활성화',
        'reports.html: JS 기반 보고서 시더 기능 추가 (SQL 인코딩 문제 해결)',
        'reports.html: 슈퍼관리자만 보이는 "전체 보고서 초기화" 버튼',
        'logs.html: 선택 삭제/범위 삭제 에러 핸들링 강화 + RLS 정책 안내',
        'docs/TASK-022_fixes.sql: activity_logs DELETE RLS 정책 + role_page_features 테이블 생성'
      ]
    },
    {
      version: '3.8.0',
      date: '2026-05-28',
      title: '슈퍼관리자 체계 + 네비게이션 개편 + 페이지 권한 관리 + UI 전면 개선',
      changes: [
        'auth.js: 슈퍼관리자(is_super_admin) 권한 체계 구현 - rank 110으로 admin 상위 관리 가능',
        '네비게이션 브랜드: CHO-Talents → ⭐ 달란트 마을 (전체 admin 페이지 통일)',
        '네비게이션: 내 달란트, 상품 구매, 페이지 접근, 페이지 기능 항목 추가',
        '네비게이션 아이디 색상: 흰색 → 검정색으로 가시성 개선',
        '메인 페이지: 로그인 버튼 ↔ 로그아웃 버튼 동적 전환',
        '신규 페이지: 페이지 접근 관리 (page-access.html) - 사용자별 페이지 접근/요소 가시성 관리',
        '신규 페이지: 페이지 기능 관리 (page-features.html) - 사용자별 기능 권한 관리',
        '부서 관리: 그리드 헤더 간소화 (관리자/부서관리자 열 제거)',
        '권한 명칭: 부장 → 부장 교사 (전체 페이지 일괄 변경)',
        '관리자 관리: 달란트/등록일 열 + 비밀번호 초기화/삭제 버튼 제거',
        '달란트 관리: 잔여/사용/누적 달란트 표시 + 상세 통계 모달 추가',
        '달란트 관리: 수정/삭제 버튼 제거, 달란트 → 달란트 지급 명칭 변경'
      ]
    },
    {
      version: '3.7.7',
      date: '2026-05-28',
      title: '수정 모달 부서 변경 제거 + 보고서 전체 등록',
      changes: [
        'users.html: 수정 모달에서 소속 부서/반 변경 비활성화 (부서이동 기능으로 대체)',
        'managers.html: 수정 모달에서 소속 부서 변경 비활성화',
        '보고서 DB 한글 깨짐 데이터 전면 교체 SQL 생성 (TASK-008~011 포함)',
        '전체 작업 보고서 20건 일괄 등록 SQL (TASK-001 ~ TASK-020)'
      ]
    },
    {
      version: '3.7.6',
      date: '2026-05-28',
      title: '보고서 한글 인코딩 수정 + 관리자 아이디 표시 예외',
      changes: [
        '전체 HTML/JS 파일 UTF-8 BOM 제거 (18개 파일)',
        '관리자(admin) 권한: 모든 페이지에서 타인 아이디 표시 가능',
        '비관리자: 자기 아이디만 표시 (기존 유지)'
      ]
    },
    {
      version: '3.7.5',
      date: '2026-05-28',
      title: '타인 아이디 숨김 + 부서 이동 관리 시스템',
      changes: [
        'users/managers/departments/talents: 타인 아이디 숨김 (자기 아이디만 표시)',
        'users.html: 부서 이동 버튼 추가 (하위 권한자만 이동 가능)',
        'users.html: 관리자/전도사님 - 즉시 부서 이동 처리',
        'users.html: 부장/부서담당교사 - 부서 이동 요청 생성 (승인 필요)',
        'users.html: 부서 이동 신청 내역 섹션 + 승인/거부 기능',
        'department_transfer_requests 테이블 SQL 파일 생성 (docs/)'
      ]
    },
    {
      version: '3.7.4',
      date: '2026-05-28',
      title: '가입 신청 권한별 조회/처리 조건 + 네비게이션 아이디 표시',
      changes: [
        'users.html: 관리자/전도사님 - 모든 부서 신청자 보임 + 전체 처리 가능',
        'users.html: 부장 - 모든 부서 신청자 보이나 담당 부서만 처리 가능',
        'users.html: 부서 담당 교사 - 담당 부서 신청자만 보임 + 처리 가능',
        'auth.js: renderRoleBadge에 아이디 표시 추가 (이름 (아이디) 형식)'
      ]
    },
    {
      version: '3.7.3',
      date: '2026-05-28',
      title: '권한 기반 부서/사용자 관리 스코핑 + 교사 카운트 수정',
      changes: [
        'departments.html: 교사 수 카운트에 user_type=teacher 전체 포함 (관리자~일반교사)',
        'users.html/managers.html: 본인 권한보다 낮은 사용자만 관리 가능 (>= → >)',
        'users.html/managers.html: 권한 부여 시 본인 권한 미만만 선택 가능',
        'users.html/managers.html: 전도사님 미만(부장 이하) - 담당 부서 계정만 표시',
        'departments.html: 부장 미만 - 담당 부서만 표시, 전도사님 미만 - 담당 부서만 관리',
        'departments.html: 접근 권한 80→60 (부서 담당 교사도 접근 가능)',
        'admin 전체(11개): 부서 관리 nav data-min-perm 80→60'
      ]
    },
    {
      version: '3.7.2',
      date: '2026-05-28',
      title: '보고서 텍스트 수정 + 로그 선택 삭제 + 가입대기 배지',
      changes: [
        'reports.html: colspan 불일치 수정 (6→7), HTML Entity → 유니코드 이모지 교체',
        'reports.html: session.display_name → session.displayName 프로퍼티명 수정',
        'logs.html: 체크박스 + 선택 삭제 기능 추가 (기존 범위 삭제 유지)',
        'activity-log.js: deleteLogsByIds() 함수 추가',
        '전체 admin 페이지(11개): 사용자 관리 네비게이션에 가입대기 배지 추가',
        'activity-log.js: getPendingRegistrationCount() + updatePendingBadge() 함수 추가'
      ]
    },
    {
      version: '3.7.1',
      date: '2026-05-28',
      title: '보고서 페이지 치명적 버그 수정 + 보고서 관리 기능',
      changes: [
        'reports.html: TYPE_LABELS 변수명 충돌 해결 (auth.js와 동일 const 재선언 → 전체 인라인 스크립트 미실행)',
        'reports.html: REPORT_TYPE_LABELS로 리네이밍하여 전역 스코프 충돌 제거',
        'reports.html: 보고서 등록 모달 + 선택 삭제 기능 추가',
        'TASK-014 보고서 4종 SQL INSERT 파일 생성 (docs/)',
        'reports 테이블 RLS INSERT/UPDATE/DELETE 정책 수정 SQL 포함'
      ]
    },
    {
      version: '3.7.0',
      date: '2026-05-28',
      title: '다중 기능 개선 및 UX 향상',
      changes: [
        '아이디 생성 시 한글 입력 제한 (영문/숫자/_/- 만 허용)',
        '로그 페이지: 범위 삭제, 사용자 이름(아이디) 표시, 상세 팝업 추가',
        '대시보드: 최근 이슈 로그 타이틀 + WARN 이상만 표시',
        '네비게이션: CHO-Talents 타이틀 + 메인 페이지 링크 변경',
        '사용자 관리: 마지막 로그인 표시 (activity_logs 기반)',
        '물품 관리: 수정 시 활성화/비활성화 토글 추가',
        '보고서 페이지: 3초 타임아웃 안전장치 + 스텝별 진단 로그 추가',
        '로그인: 승인 대기/거부 계정 구분 메시지 (이모지 포함)',
        '작업 수행 8단계 프로세스 룰 등록'
      ]
    },
    {
      version: '3.6.0',
      date: '2026-05-27',
      title: '권한 체계 개선 + 반 시스템 추가',
      changes: [
        'DB: departments.class_count, profiles.class_number 컬럼 추가',
        'RPC: admin_create_user/admin_update_user에 p_class_number 파라미터 추가',
        'RPC: give_talent rank >= 40 허용 + 반/부서 스코핑 (교사는 자기 반만)',
        'RPC: admin_list_users rank >= 40 허용 (교사 접근)',
        'RPC: get_my_profile에 class_number 반환 추가',
        'RLS: activity_logs SELECT/UPDATE rank >= 100 (관리자 전용)',
        'users.html: 역할/권한 분리 UI (학생/교사 + 권한 드롭다운), 반 드롭다운 추가',
        'users.html: 권한 부여 제한 (로그인 사용자 rank 이하만 선택 가능)',
        'users.html: 테이블에 역할/권한/반 컬럼 분리 표시',
        'managers.html: 권한 드롭다운 동적 생성 (호출자 rank 이하만)',
        'managers.html: canManage 로직 추가 (자신보다 높은 권한 수정/삭제 차단)',
        'managers.html: 수정 시 권한 변경 가능 (이전: disabled)',
        'departments.html: 부서 생성/수정 시 반 개수 설정 (숫자 입력)',
        'departments.html: 부서 목록에 반 개수 표시, 소속보기에 역할/권한/반 분리',
        'talents.html: initPage(40) - 일반 교사도 접근 가능',
        'talents.html: 반 스코핑 (교사는 자기 부서+반 학생만 표시)',
        'logs.html: initPage(100) - 관리자만 접근 가능',
        'logs.html: 일괄 완료처리 관리자 전용 체크 추가',
        '전체 admin 페이지(11개): 달란트 관리 data-min-perm 60→40',
        '전체 admin 페이지(11개): 로그 data-min-perm 80→100',
        '루트 페이지(3개): 달란트 관리 data-min-perm 60→40',
        'auth.js: teacher PERMISSION_REDIRECT를 admin/talents.html로 변경',
        'auth.js: session에 classNumber 저장',
        'user-mgmt.js: createUser/updateUser에 classNumber 파라미터 추가',
        'user-mgmt.js: createDepartment에 classCount 파라미터 추가'
      ]
    },
    {
      version: '3.5.0',
      date: '2026-05-27',
      title: 'UI/UX 8단계 수정 (네비게이션, 상점, 관리자 등록, 인코딩, 보고서)',
      changes: [
        'admin 전체 페이지(11개): 네비게이션 메인 링크 제거',
        'index.html: 로그인 상태 시 사용자 배지 + 로그아웃 버튼 표시',
        'shop.html: 탭 버튼 스타일 수정 (common.css에 filter-btn 추가), 텍스트 통일',
        'shop.html: 손님/학생 교사 상품 서버 측 필터링 차단',
        'managers.html: 관리자 등록 시 기존 사용자 검색 방식으로 전환',
        'talent_items DB: 한글 깨짐 데이터 13건 수정 (출석, 성경 읽기 등)',
        'reports.html: 에러 처리 + 디버깅 로그 추가',
        'version.js: history 배열 최신순 정렬 수정, versions.html 현재 버전 표시 수정'
      ]
    },
    {
      version: '3.4.0',
      date: '2026-05-27',
      title: '사용자 ID 보안 강화 + 동명이인 넘버링',
      changes: [
        'user-mgmt.js: resolveDisplayNames() 동명이인 넘버링 유틸 함수 추가 (이름+유형+부서 동일 시 ①②③...)',
        'user-mgmt.js: isAdminLevel() 유틸 함수 추가',
        'admin/users.html: username 컬럼 admin만 표시, 동명이인 넘버링 적용',
        'admin/managers.html: username 컬럼 admin만 표시, 동명이인 넘버링 적용',
        'admin/talents.html: username 컬럼 제거(admin만 괄호 표시), 동명이인 넘버링 적용',
        'admin/departments.html: 소속보기에서 username admin만 표시, 동명이인 넘버링 적용',
        '모달 아이디 필드: admin만 표시, 비admin 등록 시 자동 생성'
      ]
    },
    {
      version: '3.3.3',
      date: '2026-05-27',
      title: '로그 개선: 클라이언트 정보 수집 (IP, 브라우저, OS, 해상도, 기기유형, 언어)',
      changes: [
        'activity-log.js: getClientInfo() 함수 추가 - IP, 브라우저, OS, 화면 해상도, 창 크기, 디바이스 유형, 언어 수집',
        'activity-log.js: writeLog()에 자동으로 _client 정보 병합',
        'activity-log.js: IP 주소 비동기 조회 (ipify.org API) + 캐싱',
        'admin/logs.html: 클라이언트 정보 컬럼 추가 (IP, 브라우저, 기기유형 표시 + 툴팁으로 전체 정보)'
      ]
    },
    {
      version: '3.3.2',
      date: '2026-05-27',
      title: '핫픽스: admin 권한 관리 + 캐시 버스팅 + 호환성 수정',
      changes: [
        'admin 계정이 동급 권한자(다른 admin)도 수정/삭제 가능하도록 프론트엔드 canManage 로직 수정',
        'admin_update_user, admin_delete_user, admin_create_user RPC: 동급 권한 차단(>=) → 상위만 차단(>) 변경',
        'applyRoleNav → applyPermNav 호환성 alias 추가 (브라우저 캐시 에러 방지)',
        'admin_user 계정 display_name DB 수정: ???(admin) → 관리자(admin)',
        '전체 HTML 18개 파일 JS 캐시 버스팅 쿼리스트링 추가 (?v=3.3.2)'
      ]
    },
    {
      version: '3.3.1',
      date: '2026-05-27',
      title: 'TASK-013 검증 핫픽스: role→permission_level 전환 누락 수정',
      changes: [
        'admin/users.html: 사용자 생성/수정 모달 6단계 권한 드롭다운 적용',
        'admin/users.html: saveUser()→userType/permissionLevel 파라미터 전달 수정',
        'admin/users.html: approveReq()→userType/permissionLevel 파라미터 전달 수정',
        'admin/users.html: 가입 승인 드롭다운 6단계 권한 옵션 적용',
        'admin/managers.html: 관리자 등록/수정 모달 4단계 권한 드롭다운 적용',
        'admin/managers.html: saveManager()→userType/permissionLevel 전달 수정',
        'admin/managers.html: ROLE_BADGE 4단계 권한별 배지 확장',
        'register.html: registration_requests INSERT에서 삭제된 role 컬럼 참조 제거',
        'shop.html, index.html, login.html: session.role 폴백 참조 제거',
        'js/auth.js: 미사용 ROLE_LABELS, ROLE_EMOJI, applyRoleNav() 레거시 코드 제거',
        'js/user-mgmt.js: options.role 폴백 제거'
      ]
    },
    {
      version: '3.3.0',
      date: '2026-05-27',
      title: 'TASK-013D: 페이지 권한 관리 + 세부 권한 적용',
      changes: [
        'page_permissions 테이블 생성 + 초기 데이터 시드',
        'admin/page-permissions.html 신규: 페이지 권한 매트릭스 관리 UI',
        '프론트엔드 전체: role 참조 → user_type + permission_level 완전 전환',
        'admin_list_users RPC: p_role → p_user_type 파라미터 전환',
        'admin_create_user, admin_update_user RPC: role 파라미터/컬럼 참조 제거',
        'get_my_profile RPC: role 필드 제거',
        'profiles, registration_requests 테이블: role 컬럼 드롭',
        'admin/users.html, managers.html, departments.html: permission_level 기반 필터링/렌더링'
      ]
    },
    {
      version: '3.2.0',
      date: '2026-05-27',
      title: 'TASK-013C: 달란트 지급 방식 개편',
      changes: [
        'talent_items 테이블 신규 생성 (학생/교사별 지급 항목)',
        'talent_transactions에 talent_item_id 컬럼 추가',
        'give_talent RPC 업데이트: 항목 기반 지급 + 학생 주 1회 규칙',
        'admin/talent-items.html 신규: 달란트 지급 항목 관리 (admin/evangelist)',
        'admin/talents.html 개선: 항목 버튼 기반 지급 UI + 수동 입력 옵션',
        '초기 데이터: 학생 8항목, 교사 5항목'
      ]
    },
    {
      version: '3.1.0',
      date: '2026-05-27',
      title: 'TASK-013B: 페이지 구조 통합 + 네비게이션 개선',
      changes: [
        'student/teacher 폴더 페이지 통합 → 루트 레벨 my-talents.html, shop.html',
        'admin/products.html 삭제 → admin/shop.html로 물품 관리 CRUD 통합',
        '전체 admin 페이지 네비게이션 data-min-perm 기반 통합',
        '루트 레벨 페이지(earn-talents.html, shop.html, my-talents.html) 네비게이션 통합',
        'applyRoleNav → applyPermNav 전환 완료',
        '대시보드 퀵 링크에서 products.html/상점 관리 제거, shop.html/물품 관리로 통합'
      ]
    },
    {
      version: '3.0.0',
      date: '2026-05-27',
      title: 'TASK-013A: 유형/권한 6단계 체계 전면 개편 (DB+인증 코어)',
      changes: [
        'profiles 테이블 확장: user_type(교사/학생) + permission_level(6단계) + is_super_admin',
        'registration_requests 테이블 확장: user_type + permission_level 컬럼 추가',
        'get_permission_rank() 헬퍼 함수 생성 (admin:100 ~ student:20 수치 비교)',
        '기존 데이터 자동 마이그레이션 (role -> user_type + permission_level)',
        '최고관리자 is_super_admin 플래그 설정 (본인 외 수정/삭제 불가)',
        '최고관리자 display_name을 "관리자(admin)"으로 변경',
        'RPC 함수 12개 전면 업데이트 (permission_level 기반 권한 체크)',
        'admin_create_user: 상위 권한자 생성 불가 체크 추가',
        'admin_update_user: 계층적 권한 검증 + 최고관리자 보호',
        'admin_delete_user: 계층적 삭제 제한 + 최고관리자 삭제 불가',
        'admin_reset_password: 상위 권한자 비밀번호 초기화 불가',
        'give_talent/use_talent: dept_teacher(60) 이상만 실행 가능',
        'admin_list_users: permission_level/user_type 기반 조회 + is_super_admin 반환',
        'get_my_profile: user_type, permission_level, is_super_admin 반환',
        'get_my_role: permission_level 반환으로 변경',
        'RLS 정책 전면 업데이트: get_permission_rank() 기반 (7개 테이블)',
        'auth.js 코어 전면 개편: PERMISSION_RANK/LABELS/EMOJI/REDIRECT 체계',
        'initPage() 숫자 기반 최소 권한 체크 지원 (배열 호환 유지)',
        'applyPermNav() 함수 추가 (data-min-perm 속성 기반)',
        'getPermRank()/requirePermission() 클라이언트 권한 비교 유틸',
        '세션 캐시 확장: userType, permissionLevel, permissionRank, isSuperAdmin',
        'activity-log.js loadAuthSession() 확장 세션 반환',
        'user-mgmt.js: user_type/permission_level 파라미터 지원',
        '전체 admin/ 페이지 initPage() 호출을 숫자 기반으로 전환',
        'student/teacher 페이지 initPage() 숫자 기반 전환',
        '사용자 관리: 계층적 관리 버튼 표시 (상위 권한자 관리 버튼 숨김)',
        '사용자 관리: 아이디(username) 컬럼 숨김 (보안 강화)',
        '대시보드: user_type 기반 통계, permission_rank 기반 퀵링크/분기',
        'register.html: user_type/permission_level 컬럼 자동 설정',
        'login.html/index.html/change-password.html: permissionLevel 기반 리디렉트'
      ]
    },
    {
      version: '2.5.0',
      date: '2026-05-27',
      title: 'TASK-012: 관리자/부서관리자 메뉴 통합',
      changes: [
        'manager/ 디렉토리 5개 페이지 삭제 (admin/으로 통합)',
        'admin/talents.html 신규 생성 (학생+교사 달란트 통합 관리, 탭 전환)',
        'admin/ 전체 페이지 통합 네비게이션 적용 (data-role 기반 역할 분기)',
        'dept_manager 로그인 시 admin/index.html로 리디렉트',
        'admin/index.html 역할별 대시보드 분기 (통계/바로가기/로그)',
        'admin/users.html dept_manager 접근 허용 (부서 스코프, 읽기 전용)',
        'admin/products.html dept_manager 접근 허용 (물품 관리)',
        'applyRoleNav() 함수 도입 (역할별 네비게이션 표시/숨김)',
        'index.html dept_manager 달란트 경로를 admin/talents.html로 변경',
        '페이지 역할 맵핑 규칙 갱신 (.cursor/rules/page-role-mapping.mdc)'
      ]
    },
    {
      version: '2.4.0',
      date: '2026-05-27',
      title: 'TASK-011: 관리자 대시보드 개선',
      changes: [
        '현재 시간 카드를 가입 대기자 수 카드로 변경 (클릭 시 사용자 관리 이동)',
        '바로가기 영역 5개로 재구성: 사용자/부서/관리자/상점/달란트 관리',
        '각 바로가기 항목에 이모지 추가',
        '시계 관련 JS 코드 제거'
      ]
    },
    {
      version: '2.3.0',
      date: '2026-05-26',
      title: 'TASK-010: 초기 비밀번호 변경 강제 + 학생 상점 인증 보호',
      changes: [
        'initPage()에 isFirstLogin 강제 리디렉트 중앙화 (권한 체크보다 우선 실행)',
        '초기 비밀번호 미변경 시 어떤 페이지든 change-password.html로 강제 이동',
        'login.html에서 기존 세션의 isFirstLogin도 change-password로 리디렉트',
        'student/shop.html을 보호 페이지로 전환 (initPage 적용)',
        'student/shop.html autoLogPageView()를 인증 후로 이동 (익명 로그 방지)'
      ]
    },
    {
      version: '2.2.0',
      date: '2026-05-26',
      title: 'TASK-009: 레거시 관리자 로그인 제거 + 통합 로그인 단일화',
      changes: [
        '메인 화면 톱니바퀴(관리자 진입점) 버튼 제거',
        'admin/login.html 레거시 파일 삭제',
        '전체 소스에서 admin/login.html 참조 제거',
        '.admin-link 미사용 CSS 제거',
        'README.md 프로젝트 구조 전면 갱신 (전 역할 페이지 반영)',
        '로그인 진입점 login.html 단일화 완료'
      ]
    },
    {
      version: '2.1.0',
      date: '2026-05-26',
      title: 'TASK-008: 관리자 페이지 접근 제어 보완 + UI 개선',
      changes: [
        'initPage() 역할 체크 실패 시 역할별 기본 페이지로 리디렉트 (로그인 페이지 대신)',
        'CSS auth-ready 기반 콘텐츠 플래시 방지 (인증 전 페이지 내용 숨김)',
        '미사용 requireAuth() 함수 완전 제거 (데드 코드 정리)',
        '부서 관리 화면 역할별 인원 분리 표시 (관리자/부서관리자/교사/학생)',
        '관리자 관리 페이지에 admin + dept_manager 통합 표시 및 필터',
        'admin 전용 상품 관리 페이지 (admin/products.html) 신설',
        '권한별 중복 페이지 규칙 문서화 (.cursor/rules/page-role-mapping.mdc)'
      ]
    },
    {
      version: '2.0.0',
      date: '2026-05-26',
      title: 'TASK-007: DB 보안 구조 전면 개선',
      changes: [
        'Supabase Auth 도입 - bcrypt 기반 안전한 비밀번호 관리',
        'profiles 테이블 신설 - auth.users 연동',
        'admin_users 직접 접근 완전 차단 (RLS USING false)',
        '클라이언트 SHA-256 해시 제거 - 서버 측 bcrypt로 전환',
        'SECURITY DEFINER RPC 함수 도입 (admin_create_user, admin_update_user, admin_delete_user, admin_reset_password, admin_list_users)',
        'get_my_profile / change_my_password / check_username_available 보안 함수',
        'give_talent / use_talent 함수 권한 검증 강화',
        '전체 테이블 RLS 정책 재설계 (profiles, talent_transactions, products, departments, activity_logs, reports, registration_requests)',
        '프론트엔드 전면 개편 - Supabase Auth signInWithPassword 기반 로그인',
        '모든 페이지 async initPage() 패턴 적용',
        'sessionStorage → Supabase Auth + profile cache 이중 구조',
        'anon key로 password_hash 조회 불가 검증 완료'
      ]
    },
    {
      version: '1.6.0',
      date: '2026-05-26',
      title: 'TASK-007: 모바일 반응형 개선 + 로그 일괄 처리',
      changes: [
        '관리자 페이지 모바일 반응형 대폭 개선 (네비, 테이블, 카드, 모달)',
        '900px 이하: 네비게이션 줄바꿈, 폰트 축소',
        '640px 이하: 카드 2열, 테이블 가로스크롤, 필터 축소',
        '로그 일괄 완료처리 기능 (사유 입력 + 전체 미확인 로그 일괄 처리)'
      ]
    },
    {
      version: '1.5.0',
      date: '2026-05-26',
      title: 'TASK-006: 계정 등록 신청 및 부서 필수 선택',
      changes: [
        '계정 등록 신청 페이지 (register.html)',
        '로그인 페이지에서 신청 페이지 링크 연결',
        '역할 선택 (학생/교사/부서관리자) + 부서 필수 선택',
        '아이디 중복/신청 중복 검증',
        '관리자 사용자 관리에 신청 내역 섹션 추가',
        '신청 승인 (자동 계정 생성) / 거부 (사유 입력) 기능',
        '계정 등록/수정 시 소속 부서 필수 선택',
        '부서 관리자 담당 부서 필수 선택',
        'registration_requests 테이블 추가'
      ]
    },
    {
      version: '1.4.0',
      date: '2026-05-26',
      title: 'TASK-005: 사용자 관리 및 역할 배지',
      changes: [
        '관리자 사용자 관리 페이지 (등록/수정/삭제/권한변경/비밀번호초기화)',
        '역할별 통계 대시보드 (전체/관리자/부서관리자/교사/학생)',
        '역할별 필터링 조회',
        '모든 페이지 역할 배지 (이모지+텍스트+클릭 링크)',
        '관리자 클릭 → 관리자 페이지 이동',
        '부서관리자 클릭 → 부서 관리 페이지 이동',
        '교사/학생 클릭 → 해당 달란트 페이지 이동'
      ]
    },
    {
      version: '1.3.0',
      date: '2026-05-26',
      title: 'TASK-004: 버전 관리 시스템',
      changes: [
        '버전 관리 시스템 도입 (version.js)',
        '모든 페이지 하단에 버전 표시',
        '관리자 버전 이력 조회 페이지',
        '보고서 체계 정비'
      ]
    },
    {
      version: '1.2.0',
      date: '2026-05-26',
      title: 'TASK-003: 상품 이미지 및 메인 화면 개선',
      changes: [
        '상품 이미지 URL 지원 (products 테이블 image_url 컬럼)',
        'Supabase Storage 파일 업로드 (Talents_Items 버킷)',
        '물품 관리 페이지 드래그앤드롭 이미지 업로드 UI',
        '학생/교사 상점 이미지 표시',
        '메인 화면 카드 링크 연결 (달란트적립, 상품구매, 내달란트)',
        '달란트 적립 방법 안내 페이지 (earn-talents.html)',
        '관리자 상점 조회 페이지 (학생/교사/전체 탭 전환)'
      ]
    },
    {
      version: '1.1.0',
      date: '2026-05-26',
      title: 'TASK-002: 역할별 계정 시스템 및 페이지 구현',
      changes: [
        '4단계 역할 구분 (관리자, 부서관리자, 교사, 학생)',
        '역할별 페이지 구현 (학생/교사/부서관리자 전용)',
        '달란트 상점 (학생용/교사용 분리)',
        '달란트 내역 조회 페이지',
        '부서 관리자 기능 (학생/교사 계정 관리, 달란트 관리, 물품 관리)',
        '관리자 기능 확장 (부서 관리, 관리자 계정 관리)',
        'RPC 함수 (verify_user, give_talent, use_talent)',
        '통합 로그인 페이지'
      ]
    },
    {
      version: '1.0.0',
      date: '2026-05-25',
      title: 'TASK-001: 초기 구축',
      changes: [
        '환영 메인 페이지 구현',
        '관리자 로그인/패스워드 변경 시스템',
        '관리자 대시보드 (보고서, 로그 조회)',
        'Supabase 연동 및 CRUD 환경 구성',
        '활동 로그 시스템 (레벨별, KST 시간, 미확인 ERROR 알림)',
        'GitHub Pages 배포 환경 구성'
      ]
    }
  ]
};

function getVersion() { return APP_VERSION.current; }
function getVersionHistory() { return APP_VERSION.history; }

function renderVersionBadge() {
  document.querySelectorAll('.version-badge').forEach(el => {
    el.textContent = `v${APP_VERSION.current}`;
    el.title = `최종 업데이트: ${APP_VERSION.date}`;
  });
  document.querySelectorAll('.page-footer p, .footer p').forEach(el => {
    if (!el.querySelector('.version-badge')) {
      el.innerHTML += ` <span class="version-badge" title="최종 업데이트: ${APP_VERSION.date}" style="font-size:0.75rem;background:rgba(108,92,231,0.1);padding:0.15rem 0.5rem;border-radius:50px;color:#6c5ce7;font-weight:600;margin-left:0.3rem;">v${APP_VERSION.current}</span>`;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderVersionBadge);
} else {
  renderVersionBadge();
}
