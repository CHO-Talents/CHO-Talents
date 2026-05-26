/**
 * 버전 관리 모듈 - CHO-Talents
 */
const APP_VERSION = {
  current: '2.3.0',
  date: '2026-05-26',
  history: [
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
