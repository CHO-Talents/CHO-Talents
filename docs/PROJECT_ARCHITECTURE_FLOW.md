# CHO-Talents 프로젝트 구성도 및 프로세스 흐름도

작성 기준: 2026-05-27 KST 현재 코드 기준
대상 배포: https://cho-talents.github.io/CHO-Talents/  
문서 목적: 다음 검토자가 프로젝트 목적, 화면 구성, 권한 구조, 주요 데이터 흐름, 검증 지점을 빠르게 파악하도록 한다.

## 1. 프로젝트 목적

CHO-Talents는 초등부 달란트 운영을 위한 정적 웹 기반 관리 시스템이다. 학생과 교사는 본인의 달란트 잔액과 상점 물품을 확인하고, 부서 담당 교사 이상 운영자는 사용자, 부서, 물품, 달란트 지급/사용, 보고서, 로그를 관리한다.

| 목적 | 설명 |
|---|---|
| 역할별 화면 분리 | 사용자 권한에 따라 필요한 메뉴와 화면만 표시한다. |
| 달란트 운영 관리 | 적립/사용 내역과 잔액을 `profiles`, `talent_transactions` 중심으로 관리한다. |
| 상품 교환 구조 | 학생용/교사용 상품을 구분해 조회하고 운영자가 교환 처리를 한다. |
| 승인 기반 계정 운영 | 신규 사용자는 신청 후 관리자 승인으로 계정이 생성된다. |
| 운영 추적 | 페이지 방문, 오류, 관리 작업을 로그로 남기고 오류 로그를 확인 처리한다. |
| 보안 강화 | Supabase Auth, RLS, SECURITY DEFINER RPC로 민감 데이터 접근을 제한한다. |

## 2. 전체 시스템 구성

```mermaid
flowchart LR
  User["사용자 브라우저"] --> Pages["GitHub Pages 정적 화면<br/>HTML/CSS/Vanilla JS"]

  Pages --> AuthJS["js/auth.js<br/>로그인/세션/권한"]
  Pages --> LogJS["js/activity-log.js<br/>로그/세션 캐시"]
  Pages --> UserMgmt["js/user-mgmt.js<br/>사용자/부서 관리"]
  Pages --> TalentJS["js/talent.js<br/>달란트 조회/처리"]
  Pages --> ProductJS["js/product.js<br/>물품 조회/관리"]
  Pages --> VersionJS["js/version.js<br/>버전 이력"]

  AuthJS --> Auth["Supabase Auth"]
  UserMgmt --> RPC["Supabase RPC"]
  TalentJS --> RPC
  ProductJS --> Rest["Supabase REST / Storage"]
  LogJS --> Rest

  Auth --> DB["Supabase PostgreSQL"]
  RPC --> DB
  Rest --> DB

  DB --> Profiles["profiles"]
  DB --> Departments["departments"]
  DB --> Products["products"]
  DB --> Items["talent_items"]
  DB --> Transactions["talent_transactions"]
  DB --> Requests["registration_requests"]
  DB --> Reports["reports"]
  DB --> Logs["activity_logs"]
  DB --> PagePerms["page_permissions"]
```

## 3. 폴더 및 파일 구성

| 경로 | 역할 |
|---|---|
| `index.html` | 메인 진입 화면. 상점, 로그인, 적립 안내, 내 달란트로 이동 |
| `login.html` | 통합 로그인. 모든 사용자가 같은 화면에서 로그인 |
| `register.html` | 계정 등록 신청. 아이디 중복확인 후 승인 대기 등록 |
| `earn-talents.html` | 달란트 적립 방법 안내 |
| `shop.html` | 상점 조회. 비로그인은 학생용, 교사/운영자는 추가 탭 표시 |
| `my-talents.html` | 로그인 사용자 본인의 달란트 요약/내역 |
| `admin/index.html` | 80등급 이상 대시보드 |
| `admin/users.html` | 60등급 이상 사용자 관리. 가입 신청 처리는 80등급 이상 |
| `admin/departments.html` | 80등급 이상 부서 관리 |
| `admin/managers.html` | 80등급 이상 관리자 계열 권한 관리 |
| `admin/talents.html` | 60등급 이상 학생/교사 달란트 처리 |
| `admin/talent-items.html` | 90등급 이상 달란트 지급 항목 관리 |
| `admin/shop.html` | 60등급 이상 물품 관리 |
| `admin/reports.html` | 80등급 이상 보고서 조회 |
| `admin/logs.html` | 80등급 이상 로그 조회 및 확인 처리 |
| `admin/versions.html` | 80등급 이상 버전 이력 확인 |
| `admin/page-permissions.html` | 100등급 페이지 권한 매트릭스 관리. 상단 메뉴에는 노출되지 않으며 직접 주소로 접근 |
| `admin/change-password.html` | 로그인 사용자 비밀번호 변경 |
| `css/` | 메인, 공통, 관리자 스타일 |
| `js/` | Supabase 설정, 인증, 로그, 사용자/달란트/물품/버전 모듈 |
| `docs/` | 작업 기록, SQL, 구성 문서, 사용자 안내서 |

## 4. 권한 구조

현재 권한은 `permission_level`을 숫자 등급으로 환산해 비교한다. `user_type`은 학생/교사 구분이고, 실제 화면 접근은 `permission_level`이 결정한다.

| 권한 | 코드 | 등급 | 기본 이동 | 설명 |
|---|---|---:|---|---|
| 관리자 | `admin` | 100 | `admin/index.html` | 전체 운영 관리, 페이지 권한 관리 |
| 전도사님 | `evangelist` | 90 | `admin/index.html` | 관리자 계열 운영, 달란트 항목/물품 삭제 가능 |
| 부장 | `chief` | 80 | `admin/index.html` | 대시보드, 부서, 관리자, 보고서, 로그, 버전 관리 |
| 부서 담당 교사 | `dept_teacher` | 60 | `admin/talents.html` | 사용자/달란트/물품 관리 |
| 일반 교사 | `teacher` | 40 | `my-talents.html` | 내 달란트, 교사용/학생용 상점 조회 |
| 학생 | `student` | 20 | `my-talents.html` | 내 달란트, 학생용 상점 조회 |
| 비로그인 | 없음 | 0 | 공개 페이지 | 메인, 적립 안내, 학생용 상점, 계정 신청 |

권한 제어 기준:

| 기준 | 구현 위치 | 내용 |
|---|---|---|
| 페이지 진입 | `initPage(minRank, loginPath)` | 로그인, 최초 비밀번호 변경, 최소 등급을 확인 |
| 메뉴 노출 | `data-min-perm`, `applyPermNav()` | 현재 등급보다 높은 메뉴는 숨김 |
| 권한 비교 | `PERMISSION_RANK` | `admin:100`부터 `student:20`까지 숫자 비교 |
| 사용자 관리 | `admin_update_user`, `admin_delete_user` 등 RPC | 상위 권한자/최고관리자 보호 |
| 데이터 접근 | Supabase RLS | 익명/저권한 직접 조회 제한 |

## 5. 화면 연결 구조

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
  Login --> Password{"최초 로그인?"}
  Password -->|예| ChangePassword["admin/change-password.html"]
  Password -->|아니오| RoleRedirect["권한별 기본 페이지"]

  RoleRedirect --> AdminDash["admin/index.html<br/>admin/evangelist/chief"]
  RoleRedirect --> DeptTeacher["admin/talents.html<br/>dept_teacher"]
  RoleRedirect --> MyTalents

  AdminDash --> Users["admin/users.html"]
  AdminDash --> Departments["admin/departments.html"]
  AdminDash --> Managers["admin/managers.html"]
  AdminDash --> Talents["admin/talents.html"]
  AdminDash --> TalentItems["admin/talent-items.html"]
  AdminDash --> AdminShop["admin/shop.html"]
  AdminDash --> Reports["admin/reports.html"]
  AdminDash --> Logs["admin/logs.html"]
  AdminDash --> Versions["admin/versions.html"]
  AdminDash -.-> PagePerms["admin/page-permissions.html<br/>직접 주소 접근"]
```

## 6. 로그인 및 세션 흐름

```mermaid
flowchart TD
  Start["login.html 접속"] --> Input["아이디/비밀번호 입력"]
  Input --> Email["아이디 + @cho-talents.app"]
  Email --> SignIn["Supabase Auth signInWithPassword"]
  SignIn -->|실패| LoginFail["LOGIN_FAIL 로그 / 오류 메시지"]
  SignIn -->|성공| Profile["RPC get_my_profile"]
  Profile --> Cache["sessionStorage cho_session 저장"]
  Cache --> FirstLogin{"is_first_login?"}
  FirstLogin -->|true| Change["admin/change-password.html"]
  FirstLogin -->|false| Redirect["PERMISSION_REDIRECT 기준 이동"]
```

보호 페이지는 `initPage()`에서 다음 순서로 처리한다.

1. Supabase Auth 세션 확인
2. 프로필/권한 로드
3. 최초 로그인 상태면 비밀번호 변경 화면으로 이동
4. 최소 권한 미달이면 본인 권한 기본 화면으로 이동
5. 통과 시 `auth-ready` 적용, 역할 배지/메뉴/페이지 데이터 로드

## 7. 신규 계정 신청 흐름

```mermaid
flowchart TD
  Guest["비로그인 사용자"] --> Register["register.html"]
  Register --> Check["check_username_available RPC"]
  Check -->|중복| Duplicate["중복 안내"]
  Check -->|사용 가능| Submit["registration_requests INSERT"]
  Submit --> AdminReview["admin/users.html 가입 신청 목록"]
  AdminReview --> Decision{"승인 또는 거부"}
  Decision -->|승인| Create["admin_create_user RPC"]
  Decision -->|거부| Reject["거부 상태/사유 저장"]
  Create --> Login["초기 비밀번호 1234로 로그인"]
  Login --> Change["최초 비밀번호 변경"]
```

## 8. 사용자/부서/관리자 관리 흐름

```mermaid
flowchart TD
  Operator["60등급 이상 운영자"] --> Users["admin/users.html"]
  Users --> List["admin_list_users RPC"]
  Users --> Create["admin_create_user RPC"]
  Users --> Update["admin_update_user RPC"]
  Users --> Reset["admin_reset_password RPC"]
  Users --> Delete["admin_delete_user RPC"]

  Chief["80등급 이상"] --> Departments["admin/departments.html"]
  Departments --> DeptCRUD["departments 등록/수정/비활성화"]

  Chief --> Managers["admin/managers.html"]
  Managers --> Promote["기존 사용자를 관리자 계열 권한으로 승격/수정"]
```

운영 제약:

| 항목 | 기준 |
|---|---|
| 사용자 등록/수정 | 본인 이하 등급 중심으로 가능. 실제 검증은 RPC에서 수행 |
| 아이디 표시 | 관리자에게만 아이디 노출. 그 외에는 이름 중심 표시 |
| 동명이인 | 같은 이름/유형/부서면 `①`, `②` 번호를 붙여 표시 |
| 최고관리자 | `is_super_admin` 사용자는 삭제/수정 보호 |
| 담당 부서 | 관리 권한 계열은 담당 관리 부서를 지정할 수 있음 |

## 9. 달란트 처리 흐름

```mermaid
flowchart TD
  Manager["60등급 이상"] --> TalentPage["admin/talents.html"]
  TalentPage --> Target["학생/교사 탭에서 대상 선택"]
  Target --> Earn["지급 항목 선택 또는 수동 적립"]
  Target --> Use["사용 금액/사유 입력"]
  Earn --> GiveRPC["give_talent RPC"]
  Use --> UseRPC["use_talent RPC"]
  GiveRPC --> Tx["talent_transactions 기록"]
  UseRPC --> Tx
  Tx --> Balance["profiles.talent_balance 갱신"]
  Balance --> UserView["my-talents.html에서 조회"]
```

`admin/talent-items.html`에서는 90등급 이상이 학생용/교사용 달란트 지급 항목을 관리한다.

## 10. 물품 및 상점 흐름

```mermaid
flowchart TD
  Manager["60등급 이상"] --> ManageShop["admin/shop.html"]
  ManageShop --> ProductCRUD["products 등록/수정/조회"]
  ManageShop --> Upload["Storage Talents_Items 이미지 업로드"]
  ProductCRUD --> PublicShop["shop.html"]
  PublicShop --> Student["학생용 물품"]
  PublicShop --> Teacher["교사용 물품<br/>교사/60등급 이상"]
  PublicShop --> Exchange["교환 시 운영자가 달란트 사용 처리"]
```

정책:

| 항목 | 기준 |
|---|---|
| 학생용 물품 | 비로그인도 조회 가능 |
| 교사용 물품 | 로그인한 교사 또는 60등급 이상만 조회 |
| 물품 등록/수정 | 60등급 이상 |
| 물품 삭제 | 90등급 이상 |
| 실제 구매 처리 | 상점에는 구매 버튼이 없고, 운영자가 달란트 사용으로 처리 |

## 11. 보고서 및 로그 흐름

```mermaid
flowchart TD
  Event["페이지 방문/로그인/오류/관리 작업"] --> WriteLog["activity_logs INSERT"]
  WriteLog --> Logs["admin/logs.html"]
  Logs --> Filter["레벨/기간 필터"]
  Logs --> Ack["ERROR 이상 로그 확인 처리"]

  Docs["작업 문서/검증 결과"] --> ReportsTable["reports 테이블"]
  ReportsTable --> Reports["admin/reports.html"]
  Reports --> ReportView["유형별 필터/상세 보기"]
```

로그 레벨은 `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`, `CRITICAL`을 사용한다. `ERROR`, `FATAL`, `CRITICAL`은 기본적으로 미확인 상태로 저장되고 운영자가 확인 내용을 남긴다.

## 12. 주요 Supabase 리소스

| 리소스 | 용도 |
|---|---|
| `profiles` | 사용자 유형, 권한, 부서, 달란트 잔액 |
| `departments` | 부서명, 설명, 반 개수, 활성 상태 |
| `registration_requests` | 가입 신청/승인/거부 |
| `talent_items` | 달란트 지급 항목 |
| `talent_transactions` | 달란트 적립/사용 내역 |
| `products` | 상점 물품 |
| `reports` | 작업 보고서 |
| `activity_logs` | 활동/오류 로그 |
| `page_permissions` | 페이지 권한 설정 |
| `Talents_Items` | 물품 이미지 Storage 버킷 |

## 13. 주요 RPC

| RPC | 목적 |
|---|---|
| `get_my_profile` | 로그인 사용자 프로필/권한 조회 |
| `check_username_available` | 가입 신청 아이디 중복확인 |
| `admin_list_users` | 사용자 목록 조회 |
| `admin_create_user` | Auth 사용자와 profile 생성 |
| `admin_update_user` | 사용자 정보/권한 수정 |
| `admin_delete_user` | 사용자 삭제 |
| `admin_reset_password` | 비밀번호 `1234` 초기화 |
| `change_my_password` | 본인 비밀번호 변경 및 최초 로그인 해제 |
| `give_talent` | 달란트 적립 |
| `use_talent` | 달란트 사용 |

## 14. 빠른 검증 체크리스트

1. `login.html`에서 로그인 성공/실패 메시지가 정상인지 확인한다.
2. 최초 로그인 사용자가 `admin/change-password.html`로 강제 이동하는지 확인한다.
3. 권한이 부족한 페이지 직접 접근 시 본인 기본 화면으로 이동하는지 확인한다.
4. 비로그인 상태에서 `my-talents.html`이 로그인으로 이동하는지 확인한다.
5. 비로그인 `shop.html`에서 학생용 물품만 조회되는지 확인한다.
6. 교사 로그인 후 `shop.html`에서 교사용 탭이 보이는지 확인한다.
7. 60등급 이상이 `admin/users.html`, `admin/talents.html`, `admin/shop.html`을 사용할 수 있는지 확인한다.
8. 80등급 이상이 대시보드, 부서, 관리자, 보고서, 로그, 버전 화면을 사용할 수 있는지 확인한다.
9. 90등급 이상만 `admin/talent-items.html`과 물품 삭제 버튼을 사용할 수 있는지 확인한다.
10. 100등급만 `admin/page-permissions.html`에 접근 가능한지 확인한다.
11. 오류 로그가 `admin/logs.html`에서 확인 처리되는지 확인한다.

## 15. 다음 작업자가 먼저 볼 파일

| 우선순위 | 파일 | 이유 |
|---:|---|---|
| 1 | `README.md` | 현재 구조, 페이지 연결, 권한, 운영 흐름 요약 |
| 2 | `docs/PROJECT_ARCHITECTURE_FLOW.md` | 상세 구성도와 프로세스 흐름 |
| 3 | `js/auth.js` | 권한 등급, 리디렉트, 세션, 비밀번호 정책 |
| 4 | `js/activity-log.js` | 로그 기록, 세션 캐시, 페이지뷰 |
| 5 | `js/user-mgmt.js` | 사용자/부서 관리 RPC |
| 6 | `js/talent.js` | 달란트 조회/처리 |
| 7 | `js/product.js` | 물품 조회/관리 |
| 8 | `admin/*.html` | 각 관리 화면의 실제 접근 권한과 UI 동작 |
