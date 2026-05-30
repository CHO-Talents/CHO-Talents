# CHO-Talents

초등부 달란트 운영을 위한 정적 웹 기반 관리 사이트입니다. 학생과 교사는 달란트 잔액과 상점 상품을 확인하고 구매 신청을 하며, 부서 담당 교사 이상 권한자는 권한 범위 안에서 달란트, 사용자, 상품, 구매, 부서, 로그, 보고서를 관리합니다.

**Live:** https://cho-talents.github.io/CHO-Talents/

## 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 서비스명 | ⭐ 달란트 마을 / CHO-Talents |
| 목적 | 초등부 학생/교사 달란트 적립, 사용, 상품 구매, 운영 관리를 한 곳에서 처리 |
| 배포 | GitHub Pages 정적 사이트 |
| 데이터 | Supabase PostgreSQL, Auth, Storage, RPC, RLS |
| 현재 버전 | `v3.13.0` (`js/version.js` 기준, 2026-05-30) |
| 작성 기준 | `develop` 브랜치 현재 코드와 `APP_VERSION.history` |

## 현재 버전 요약

- 모든 HTML의 JS 캐시 버스팅과 `APP_VERSION.current`는 `3.13.0`으로 맞춰져 있습니다.
- **v3.13.0 주요 변경 사항**:
  - 네비게이션 전면 개편: 평면 단일행 → 드롭다운 5그룹 (소개/달란트/상품/관리/운영)
  - `guide.html` 신규: 사용자 가이드 페이지 (카드/스텝 기반 시각적 설명)
  - `qna.html` 신규: Q&A 게시판 (FAQ 상단 표시 + 질문 등록 + 관리자 답변 + FAQ 등록)
  - 로그인: `check_registration_status` RPC로 승인 대기 메시지 정상 표시
  - 비밀번호 변경: 8자 이상, 영문+숫자 필수, '1234' 사용 금지
  - 메인 페이지 네비: 브랜드 + 로그인/로그아웃 + 관리(60+)만 표시
- **v3.12.2 신규/변경 사항**:
  - 네비게이션 통일: 전체 페이지에 "내 구매 상품" 메뉴 추가, 보고서 리디렉트 수정
  - `my-orders.html` 신규: 로그인 사용자 본인 구매 내역 조회 (4단계 상태 배지, 관리자 정보 미표시)
  - 대리 구매 기능: `shop.html`에서 rank 40+ 대리 구매 모달 (스코핑 규칙 적용)
  - 달란트 관리 스코핑 강화: 일반 교사(40)는 반 미배정 시 빈 목록, 달란트 항목 관리 버튼 60+ 전용
  - 로그인 후 리디렉트: 모든 권한 `index.html`(메인 페이지)로 통일
  - 사용자 관리: 부서 담당 교사(60+) 반 수정 활성화, 부장 교사(80+) 부서 필터 추가
  - 관리자 관리: 학생 검색 제외, 부장 교사(80+) 부서 필터 추가
- **상품 구매 시스템** (v3.9.0~):
  - 구매 신청 → 상품 준비 → 상품 구매 → 상품 지급 4단계 흐름
  - `shop.html`에서 구매/대리 구매, `my-orders.html`에서 내 구매 확인, `my-talents.html`에서 사용 대기 확인, `admin/purchases.html`에서 관리
  - 구매 신청 시 달란트는 `pending_talent`(사용 대기)로 관리
- **달란트 관리**: 체크박스 선택 + 일괄 지급, 부장 교사(80+) 반환 처리, 일반 교사(40) 반 스코핑
- **에러 처리**: `tErr()` 한글 번역, 전체 페이지 에러 로깅
- **로그 관리**: 소프트 삭제(`is_deleted=true`), 관리자(100+)만 삭제 가능

## 프로젝트 구조

```text
CHO-Talents/
├── index.html                     # 메인 환영 페이지
├── login.html                     # 통합 로그인
├── register.html                  # 계정 등록 신청
├── earn-talents.html              # 달란트 적립 방법 안내
├── shop.html                      # 달란트 상점 조회 + 구매 신청 + 대리 구매
├── my-talents.html                # 내 달란트 잔액/내역/구매 내역 조회
├── my-orders.html                 # 내 구매 상품 (본인 구매 내역 조회)
├── admin/                         # 권한별 관리 화면
│   ├── index.html                 # 대시보드
│   ├── users.html                 # 사용자 관리 / 가입 신청 / 부서 이동
│   ├── departments.html           # 부서 관리
│   ├── managers.html              # 관리자/부서 담당 교사 권한 관리
│   ├── talents.html               # 학생/교사 달란트 지급·사용·반환
│   ├── talent-items.html          # 달란트 지급 항목 관리
│   ├── shop.html                  # 상품 등록/수정/삭제
│   ├── purchases.html             # 구매 관리 (4단계 구매 흐름)
│   ├── reports.html               # 작업 보고서 조회 + JS 시더
│   ├── logs.html                  # 활동 로그 조회/확인/삭제 대기
│   ├── versions.html              # 버전 이력
│   ├── page-access.html           # 권한별 페이지 접근/요소 가시성 관리
│   ├── page-features.html         # 권한별 페이지 기능 관리
│   ├── audit.html                 # 관리 작업 이력 조회
│   ├── page-permissions.html      # 페이지 권한 매트릭스 (레거시)
│   └── change-password.html       # 최초 로그인/비밀번호 변경
├── css/
│   ├── style.css                  # 메인 화면 스타일
│   ├── common.css                 # 공개/사용자 화면 공통 스타일
│   └── admin.css                  # 로그인/관리자 화면 스타일
├── js/
│   ├── supabase-config.js         # Supabase 설정, Auth 도메인, 공통 CRUD 유틸
│   ├── app.js                     # 메인 화면 효과/연결 상태 확인
│   ├── activity-log.js            # 활동 로그, 세션 캐시, 소프트 삭제
│   ├── auth.js                    # 로그인, 세션, 권한, 비밀번호 변경, tErr() 에러 번역
│   ├── user-mgmt.js               # 사용자/부서 관리 RPC 래퍼
│   ├── talent.js                  # 달란트 잔액/내역/지급/사용/반환
│   ├── product.js                 # 상품 조회/등록/수정/삭제/이미지 업로드
│   └── version.js                 # 버전 정보와 변경 이력
└── docs/                          # 작업 보고서, SQL, 구성 문서, 사용자 안내서
```

## 기술 스택

- **Frontend:** HTML / CSS / Vanilla JavaScript
- **Backend:** Supabase (PostgreSQL, Auth, REST, RPC, RLS, Storage)
- **Hosting:** GitHub Pages
- **Auth:** Supabase email/password Auth. 화면에서는 `아이디 + @cho-talents.app` 형태로 로그인 처리
- **Security:** RLS 정책과 `SECURITY DEFINER` RPC로 사용자/달란트/로그 등 민감 데이터 접근 제어
- **에러 처리:** `tErr()` 함수로 영문 DB 에러를 한글로 자동 변환, 전체 기능에 `logError`/`logWarn`/`logInfo` 로깅

## 사용자 권한 체계

현재 구현은 `user_type`과 `permission_level`을 함께 사용합니다.

- `user_type`: `student` 또는 `teacher`
- `permission_level`: 실제 접근 권한. 숫자 등급으로 비교합니다.

| 권한 | 코드 | 등급 | 기본 이동 | 주요 권한 |
|---|---|---:|---|---|
| 최고 관리자 | `admin` + `is_super_admin` | 110 | `admin/index.html` | 관리자 포함 전체 사용자 관리, 보고서 초기화, 시스템 설정 |
| 관리자 | `admin` | 100 | `admin/index.html` | 전체 관리, 페이지 권한 관리, 로그 삭제 대기 처리 |
| 전도사님 | `evangelist` | 90 | `admin/index.html` | 관리자 계열 화면, 달란트 항목 관리, 상품 삭제, 페이지 접근/기능 수정 |
| 부장 교사 | `chief` | 80 | `admin/index.html` | 대시보드, 부서/관리자/보고서/버전/작업이력, 달란트 반환 처리 |
| 부서 담당 교사 | `dept_teacher` | 60 | `admin/talents.html` | 담당 부서 중심 사용자/부서/달란트/상품/구매 관리 |
| 일반 교사 | `teacher` | 40 | `admin/talents.html` | 담당 부서/반 학생 달란트 처리, 내 달란트, 교사용/학생용 상점 |
| 학생 | `student` | 20 | `my-talents.html` | 내 달란트 확인, 학생용 상점 조회, 구매 신청 |
| 비로그인 | 없음 | 0 | 공개 페이지 | 메인, 적립 안내, 학생용 상점, 계정 신청 |

권한 노출 기준은 화면의 `data-min-perm`과 `initPage(minRank, loginPath)`로 관리합니다. 서버 작업은 Supabase RLS/RPC에서 한 번 더 제한합니다.

## 페이지별 연결고리

```mermaid
flowchart TD
  Public["공개 영역"] --> Home["index.html"]
  Public --> Earn["earn-talents.html"]
  Public --> Shop["shop.html"]
  Public --> Login["login.html"]
  Public --> Register["register.html"]

  Home --> Earn
  Home --> Shop
  Home --> MyTalents["my-talents.html"]
  Login --> FirstLogin{"최초 로그인?"}
  FirstLogin -->|예| ChangePassword["admin/change-password.html"]
  FirstLogin -->|아니오| Redirect["권한별 기본 페이지"]

  Redirect --> AdminDash["admin/index.html<br/>admin/evangelist/chief"]
  Redirect --> DeptTalent["admin/talents.html<br/>dept_teacher/teacher"]
  Redirect --> MyTalents

  AdminDash --> Users["admin/users.html"]
  AdminDash --> Departments["admin/departments.html"]
  AdminDash --> Managers["admin/managers.html"]
  AdminDash --> Talents["admin/talents.html"]
  AdminDash --> TalentItems["admin/talent-items.html"]
  AdminDash --> AdminShop["admin/shop.html"]
  AdminDash --> Purchases["admin/purchases.html"]
  AdminDash --> Reports["admin/reports.html"]
  AdminDash --> Logs["admin/logs.html"]
  AdminDash --> Versions["admin/versions.html"]
  AdminDash --> PageAccess["admin/page-access.html"]
  AdminDash --> PageFeatures["admin/page-features.html"]
  AdminDash --> Audit["admin/audit.html"]
  AdminDash -.-> PagePerms["admin/page-permissions.html<br/>직접 주소 접근"]
```

### 공개/사용자 화면

| 페이지 | 연결 | 동작 |
|---|---|---|
| `index.html` | 상점, 로그인, 달란트 적립, 내 달란트 | 로그인 상태면 사용자 배지와 로그아웃 표시. 동적 로그인/로그아웃 버튼 |
| `login.html` | 계정 등록 신청, 메인 | 로그인 성공/실패 로그 기록. 승인 대기/거부 계정 구분 안내 |
| `register.html` | 로그인 | 영문/숫자/`_`/`-` 아이디 중복확인 후 가입 신청. 실패 시 에러 로깅 |
| `earn-talents.html` | 메인, 상점, 내 달란트 | 달란트 적립 방법 안내. 로그인 상태면 권한별 메뉴 추가 표시 |
| `shop.html` | 메인, 적립 안내, 내 달란트 | 학생용 상품 공개 조회. 교사/60등급 이상은 교사용 탭. 로그인 시 구매 신청 가능 |
| `my-talents.html` | 로그인 필요 | 누적 적립/사용 완료/사용 대기/사용 가능 잔액, 달란트 내역, 구매 내역 조회 |

### 관리 화면

| 페이지 | 최소 등급 | 주요 기능 |
|---|---:|---|
| `admin/index.html` | 80 | 사용자/부서/보고서/로그 요약, 미확인 오류 로그 알림, 가입 대기자 수 |
| `admin/users.html` | 60 | 사용자 목록, 권한 범위 내 수정/삭제/비밀번호 초기화, 가입 신청 처리, 부서 이동 요청/승인 |
| `admin/departments.html` | 60 | 부서 등록/수정/비활성화, 반 개수 관리, 부서별 인원/담당자 확인 |
| `admin/managers.html` | 80 | 기존 사용자를 관리자 계열 권한으로 승격/수정, 담당 부서 지정 |
| `admin/talents.html` | 40 | 학생/교사 탭별 달란트 체크박스 선택+일괄 지급, 수동 적립/사용, 반환(80+). 일반 교사는 담당 부서/반 제한 |
| `admin/talent-items.html` | 90 | 달란트 지급 항목 등록/수정/활성화. 학생 항목은 주 1회 지급 규칙과 연동 |
| `admin/shop.html` | 60 | 학생용/교사용 상품 등록, 수정, 이미지 업로드, 재고 관리. 삭제 버튼은 90등급 이상 |
| `admin/purchases.html` | 60 | 구매 관리: 4단계(구매 신청→상품 준비→상품 구매→상품 지급) 처리. 권한별 조회/처리 범위 제한 |
| `admin/reports.html` | 80 | 작업 보고서 유형별 조회, 상세 보기, 등록/수정, 선택 삭제 |
| `admin/logs.html` | 100 | 활동 로그 필터링, 상세 보기, 오류 로그 확인 처리, 소프트 삭제(삭제 대기) |
| `admin/versions.html` | 80 | 배포 버전과 변경 이력 확인 |
| `admin/page-access.html` | 80 | 유형/권한별 페이지 접근/요소 가시성 설정. 수정은 90등급 이상 |
| `admin/page-features.html` | 80 | 권한별 페이지 기능(수정/삭제/승인 등) 설정. 수정은 90등급 이상 |
| `admin/audit.html` | 80 | 관리 작업 이력 조회 (사용자/부서/달란트/상품/권한 카테고리별 필터) |
| `admin/page-permissions.html` | 100 | 페이지별 조회/관리 권한 매트릭스 설정 (레거시) |
| `admin/change-password.html` | 로그인 | 최초 로그인 또는 비밀번호 변경 처리 |

## 주요 동작 프로세스

### 로그인/세션

```mermaid
flowchart TD
  Start["login.html"] --> Input["아이디/비밀번호 입력"]
  Input --> Auth["Supabase Auth signInWithPassword"]
  Auth -->|실패| Fail["tErr() 한글 오류 표시 + LOGIN_FAIL 로그"]
  Auth -->|성공| Profile["RPC get_my_profile"]
  Profile --> Session["sessionStorage cho_session 저장"]
  Session --> First{"is_first_login?"}
  First -->|예| Change["admin/change-password.html"]
  First -->|아니오| Role["permission_level 기준 기본 화면 이동"]
```

- 모든 보호 페이지는 `initPage()`에서 세션을 확인합니다.
- 최초 로그인 사용자는 `change-password.html` 외 화면에 접근하려 하면 비밀번호 변경 화면으로 이동합니다.
- 권한이 부족한 페이지에 접근하면 본인 권한의 기본 페이지로 이동합니다.
- 승인 대기 계정 로그인 시 "승인 대기 중" 안내, 거부 계정은 "거부됨" 안내를 구분 표시합니다.

### 계정 등록 신청

```mermaid
flowchart TD
  User["사용자"] --> Register["register.html"]
  Register --> Check["아이디 중복확인 RPC"]
  Check --> Submit["registration_requests 저장"]
  Submit --> Review["admin/users.html 가입 신청 목록"]
  Review --> Scope["권한/담당 부서 기준 처리 가능 여부 확인"]
  Scope --> Decision{"승인/거부"}
  Decision -->|승인| Create["admin_create_user RPC"]
  Decision -->|거부| Reject["거부 사유 저장"]
  Create --> FirstPw["초기 비밀번호 1234 / 최초 변경 필요"]
```

- 관리자/전도사님은 모든 가입 신청을 처리할 수 있습니다.
- 부장 교사는 전체 신청을 볼 수 있지만 담당 부서 신청만 처리합니다.
- 부서 담당 교사는 담당 부서 신청만 보고 처리합니다.

### 달란트 지급/사용/반환

```mermaid
flowchart TD
  Manager["40등급 이상 교사/운영자"] --> Page["admin/talents.html"]
  Page --> Scope["권한별 부서/반 스코핑"]
  Scope --> Select["학생/교사 선택"]
  Select --> CheckItems["항목 체크박스 선택"]
  Select --> Manual["수동 적립/사용"]
  CheckItems --> Confirm["✅ 지급 확정 버튼"]
  Confirm --> GiveRPC["give_talent RPC (항목별)"]
  Manual --> GiveUseRPC["give_talent / use_talent RPC"]
  GiveRPC --> Tx["talent_transactions 기록"]
  GiveUseRPC --> Tx
  Tx --> Balance["profiles.talent_balance 갱신"]
  Balance --> My["my-talents.html에서 조회"]

  Select --> Detail["상세 모달 → 지급자/반환 확인"]
  Detail --> Return["반환 (80등급+, 사유 입력)"]
  Return --> UseRPC["use_talent RPC (반환)"]
  UseRPC --> Tx
```

### 부서 이동

```mermaid
flowchart TD
  UserAdmin["admin/users.html"] --> Transfer["부서 이동 버튼"]
  Transfer --> Rank{"90등급 이상?"}
  Rank -->|예| Immediate["즉시 부서 이동<br/>class_number 초기화"]
  Rank -->|아니오| Request["department_transfer_requests 생성"]
  Request --> Approval["90등급 이상 전체 처리<br/>80등급은 담당 부서 요청 처리"]
  Approval --> Apply["승인 시 profiles.department_id 변경"]
```

- 소속 부서/반 변경은 일반 수정 모달이 아니라 부서 이동 요청/승인 흐름으로 처리합니다.

### 상품 구매

```mermaid
flowchart TD
  AdminShop["admin/shop.html"] --> ProductCRUD["products 등록/수정/삭제"]
  ProductCRUD --> Storage["이미지 업로드: Talents_Items Storage"]
  ProductCRUD --> PublicShop["shop.html"]
  PublicShop --> StudentGoods["학생용 상품"]
  PublicShop --> TeacherGoods["교사용 상품<br/>교사/60등급 이상 조회"]
  PublicShop --> OrderRequest["🛒 구매 신청 → product_orders 생성<br/>pending_talent 증가"]
  OrderRequest --> PurchaseMgmt["admin/purchases.html"]
  PurchaseMgmt --> Preparing["📦 상품 준비<br/>부서 담당 교사+"]
  Preparing --> Purchased["💳 상품 구매<br/>관리자 확정 → 달란트 차감"]
  Purchased --> Delivered["✅ 상품 지급<br/>관리자 일괄 처리"]
```

구매 권한 범위:

| 권한 | 조회 | 처리 |
|---|---|---|
| 부서 담당 교사 | 자기 부서 신청 | 상품 준비 처리 |
| 부장 교사 | 전체 신청 | 담당 부서만 상품 준비 처리 |
| 전도사님 이상 | 전체 신청 | 전체 처리 가능 |

### 로그/보고서

- `activity-log.js`가 페이지 방문, 로그인, 관리 작업, 에러를 `activity_logs`에 기록합니다.
- 모든 기능의 성공/실패/거부가 `logInfo`/`logWarn`/`logError`로 기록됩니다.
- `ERROR`, `FATAL`, `CRITICAL` 로그는 미확인 상태로 남고, `admin/logs.html`에서 확인 처리합니다.
- 로그 삭제는 소프트 삭제(`is_deleted=true`)이며, 실제 삭제는 SQL Editor에서 수행합니다.
- `admin/reports.html`은 `reports` 테이블의 작업 보고서를 유형별로 조회하고, 등록/수정/삭제를 제공합니다.

## 주요 데이터와 RPC

| 구분 | 리소스 | 용도 |
|---|---|---|
| 사용자 | `profiles` | 사용자 정보, 유형, 권한, 부서, 반, 잔액, 사용 대기 달란트 |
| 부서 | `departments` | 부서명, 설명, 반 개수, 활성 상태 |
| 가입 신청 | `registration_requests` | 계정 신청과 승인/거부 상태 |
| 부서 이동 | `department_transfer_requests` | 부서 이동 요청, 승인/거부, 처리 기록 |
| 달란트 | `talent_transactions` | 적립/사용 거래 내역 |
| 달란트 항목 | `talent_items` | 지급 항목과 달란트 금액 |
| 상품 | `products` | 상점 상품, 가격, 재고, 대상, 이미지 |
| 상품 주문 | `product_orders` | 구매 신청, 4단계 상태 관리, 담당자 기록 |
| 로그 | `activity_logs` | 페이지/오류/운영 활동 기록, 소프트 삭제 |
| 보고서 | `reports` | 작업 계획, 검증, 테스트, 수정 보고서 |
| 페이지 권한 | `page_permissions` | 페이지별 조회/관리 권한 설정 (레거시) |
| 권한별 접근 | `role_page_access` | 권한 등급별 페이지 접근/요소 가시성 설정 |
| 권한별 기능 | `role_page_features` | 권한 등급별 페이지 기능 설정 |
| 이미지 | `Talents_Items` Storage | 상품 이미지 업로드/공개 URL |

| RPC | 목적 | 주요 호출 |
|---|---|---|
| `get_my_profile` | 로그인 사용자 프로필/권한 조회 | `auth.js`, `activity-log.js` |
| `check_username_available` | 가입 신청 아이디 중복확인 | `register.html` |
| `admin_list_users` | 사용자 목록 조회 | `user-mgmt.js` |
| `admin_create_user` | Auth 사용자와 프로필 생성 | `user-mgmt.js` |
| `admin_update_user` | 사용자 정보/권한/부서/반 수정 | `user-mgmt.js` |
| `admin_delete_user` | 사용자 삭제 | `user-mgmt.js` |
| `admin_reset_password` | 비밀번호 `1234` 초기화 | `user-mgmt.js` |
| `change_my_password` | 본인 비밀번호 변경, 최초 로그인 해제 | `auth.js` |
| `give_talent` | 달란트 적립 (항목별 또는 수동) | `talent.js` |
| `use_talent` | 달란트 사용/반환 | `talent.js` |
| `request_product_order` | 상품 구매 신청 (사용 대기 달란트 관리) | `shop.html` |
| `confirm_product_purchase` | 상품 구매 확정 (실제 달란트 차감) | `admin/purchases.html` |

## 운영/보안 메모

- 최고관리자(`is_super_admin`, rank 110)는 일반 관리자(rank 100)를 포함한 모든 사용자를 관리할 수 있습니다.
- 사용자 관리 버튼은 본인 또는 본인보다 낮은 권한 대상에게만 표시됩니다.
- 아이디(`username`)는 관리자에게 전체 표시되고, 비관리자는 본인 아이디만 볼 수 있습니다. 동명이인은 표시명에 번호를 붙여 구분합니다.
- 소속 부서/반 변경은 부서 이동 요청/승인 흐름으로 처리합니다 (수정 모달에서 부서 변경 불가).
- 상품 삭제와 달란트 항목 관리는 90등급 이상에 제한됩니다.
- 교사가 `shop.html`에 접근하면 기본 필터가 교사용으로 자동 설정됩니다.
- 영문 DB/RPC 에러는 `tErr()` 함수를 통해 한글로 변환되어 사용자에게 표시됩니다.
- 활동 로그에는 브라우저, OS, 화면 크기, IP 등 클라이언트 정보가 저장됩니다.

## DB 스키마 초기 설정

아래 SQL 파일들은 Supabase SQL Editor에서 실행이 필요합니다:

| 파일 | 용도 |
|---|---|
| `docs/TASK-023_fixes.sql` | `activity_logs`에 `is_deleted`/`deleted_at` 컬럼, `role_page_access`/`role_page_features` 테이블 |
| `docs/TASK-026_schema.sql` | `product_orders` 테이블, `profiles.pending_talent` 컬럼, 구매 관련 RPC |

## 관련 문서

- [프로젝트 구성도 및 프로세스 흐름도](docs/PROJECT_ARCHITECTURE_FLOW.md)
- [일반 사용자 사이트 안내서](docs/SITE_USER_GUIDE.md)
- `docs/TASK-*.md`: 작업별 계획, 변경 보고서, 테스트 결과
- `docs/*.sql`: Supabase 테이블/RPC/RLS 구성 기록
