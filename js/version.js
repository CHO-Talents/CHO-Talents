/**
 * 버전 관리 모듈 - CHO-Talents
 */
const APP_VERSION = {
  current: '3.3.1',
  date: '2026-05-27',
  history: [
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
