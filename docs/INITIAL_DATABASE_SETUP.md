# CHO-Talents 새 Database 초기 세팅 가이드

이 문서는 CHO-Talents를 새 Supabase Database에서 다시 시작할 때 필요한 테이블, 권한, 기본 데이터, 실행 SQL을 정리한다.

실행 SQL: `docs/INITIAL_DATABASE_SETUP.sql`

자동 실행 스크립트: `scripts/install-supabase-database.ps1`

## 실행 순서

1. 새 Supabase 프로젝트를 만든다.
2. 새 프로젝트의 `Project URL`, `publishable/anon key`, DB connection string을 확인한다.
3. 아래 수동 또는 자동 방식 중 하나로 DB 설치를 실행한다.
4. Storage에 `Talents_Items` 버킷이 생성되었는지 확인한다.
5. 사이트 설정 파일의 Supabase URL/anon key를 새 프로젝트 값으로 바꾼다.
   - `config/public-config.js`
   - 필요 시 `.env.local`
6. `admin_user / 1234`로 로그인한다.
7. 최초 로그인 후 비밀번호를 변경한다.
8. 부서, 사용자, 상품을 실제 운영 기준으로 새로 등록한다.

## 실행 방법 A: SQL Editor

Supabase Dashboard의 SQL Editor에서 `docs/INITIAL_DATABASE_SETUP.sql`을 열고, 상단 `0. Target Project Runtime Config` 블록의 공개 설정값을 새 프로젝트 기준으로 수정한 뒤 전체를 실행한다.

```sql
('production', 'SUPABASE_URL', 'https://YOUR_PROJECT_REF.supabase.co', false, true, ...),
('production', 'SUPABASE_ANON_KEY', 'YOUR_PUBLISHABLE_OR_ANON_KEY', false, true, ...),
('production', 'KAKAO_MAP_KEY', 'YOUR_KAKAO_MAP_JAVASCRIPT_KEY', false, true, ...)
```

## 실행 방법 B: PowerShell/psql

`.env.local`에 새 프로젝트 값을 채운 뒤 실행한다.

```powershell
. .\scripts\load-env.ps1
.\scripts\install-supabase-database.ps1
```

필요한 값은 아래와 같다.

```text
SUPABASE_DB_CONNECTION_STRING=postgresql://postgres:...
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

SQL Editor에 붙여넣을 합본 SQL만 만들 수도 있다.

```powershell
.\scripts\install-supabase-database.ps1 `
  -GenerateOnly `
  -OutputSqlPath .\docs\INITIAL_DATABASE_SETUP.generated.sql `
  -SupabaseUrl "https://YOUR_PROJECT_REF.supabase.co" `
  -SupabaseAnonKey "YOUR_PUBLISHABLE_OR_ANON_KEY"
```

## 필수 테이블

| 테이블 | 용도 | 새 DB 기본 데이터 |
|---|---|---|
| `departments` | 부서/반 관리 | `기본 부서` 1개 |
| `profiles` | Supabase Auth 사용자 프로필, 권한, 달란트 잔액, 마지막 로그인 | `admin_user` 최고 관리자 1명 |
| `registration_requests` | 가입 신청 | 비움 |
| `department_transfer_requests` | 부서 이동 신청/승인 | 비움 |
| `talent_items` | 달란트 지급 항목, 지급 규칙/설명 | 학생 8개, 교사 5개 |
| `talent_transactions` | 달란트 적립/사용 이력 | 비움 |
| `products` | 상품 목록 | 비움 |
| `product_orders` | 상품 구매 신청/처리 | 비움 |
| `qna` | FAQ와 질문 | FAQ 9개 |
| `qna_comments` | Q&A 댓글/답변 | 비움 |
| `reports` | 보고서 | 비움 |
| `report_events` | 보고서 확인/변경 이력 | 비움 |
| `activity_logs` | 접속/오류/작업 로그 | 비움 |
| `page_permissions` | 권한별 페이지 매트릭스 | 기본 권한표 |
| `role_page_access` | 역할별 페이지 접근/요소 숨김 설정 | 비움, 기본 허용 |
| `role_page_features` | 역할별 페이지 기능 설정 | 비움, 기본 허용 |
| `user_preferences` | 사용자별 즐겨찾기 바로가기와 테마 설정 | 비움 |
| `talent_qr_codes` | 달란트 QR 코드 | 비움 |
| `talent_qr_scans` | QR 수령 이력 | 비움 |
| `app_config` | 공개 설정/비밀 참조 설정 | 공개 설정 7개, 비밀 참조 4개 |

## 권한 요약

| 권한 | rank | 주요 가능 작업 |
|---|---:|---|
| 학생 | 20 | 내 달란트, 상품 구매, 내 구매 상품, Q&A |
| 일반 교사 | 40 | 담당 반 학생 달란트 지급, 대리 구매 |
| 부서 담당 교사 | 60 | 담당 부서 사용자/달란트/상품/구매 관리 |
| 구매 담당 교사 | 70 | 부서 담당 교사와 동일 접근, 구매 관리에서 전체 부서 주문 처리 |
| 부장 교사 | 80 | 보고서, 버전, 가입 승인, 부서 운영 관리 |
| 전도사님 | 90 | 달란트 항목, QR, 페이지 접근/기능 설정 |
| 관리자 | 100 | 로그, 권한 매트릭스, 전체 시스템 관리 |
| 최고 관리자 | 110 | `is_super_admin=true`인 관리자. 삭제/수정 보호 대상 |

## RLS 정책 기준

| 영역 | 조회 | 생성 | 수정 | 삭제 |
|---|---|---|---|---|
| 부서 | 모두 | 80+ | 80+ | 90+ |
| 프로필 | 본인 또는 60+ | 시스템/RPC | 본인 또는 60+ | 60+ |
| 가입 신청 | 80+ | 모두 | 80+ | 80+ |
| 달란트 항목 | 모두 | 90+ | 90+ | 100+ |
| 달란트 이력 | 본인 또는 60+ | RPC/시스템 | 직접 수정 없음 | 직접 삭제 없음 |
| 상품 | 모두 | 60+ | 60+ | 90+ |
| 구매 주문 | 본인 또는 60+ | 본인/RPC | 60+ | 직접 삭제 없음 |
| Q&A | FAQ/본인/60+ | 인증 사용자 또는 익명 RPC | 인증 사용자 | 100+ |
| 보고서 | 80+ | 80+ | 80+ | 80+ |
| 로그 | 100+ | 모두 | 100+ | 100+ |
| 페이지 권한 | 모두 | 100+ | 100+ | 100+ |
| 역할별 접근/기능 | 인증 사용자 | 90+ | 90+ | 90+ |
| 사용자 설정 | 본인 | 본인 | 본인 | 본인 |
| QR 코드 | 인증 사용자 | 90+ | 90+ | 90+ |
| QR 스캔 | 인증 사용자 | 인증 사용자 | 직접 수정 없음 | 직접 삭제 없음 |
| app_config | 직접 조회 차단 | 서버/SQL | 서버/SQL | 서버/SQL |

`app_config`의 공개값은 `get_public_app_config()` RPC로만 조회한다. 비밀 토큰 원문은 DB에 넣지 않고 `env:GITHUB_PAT` 같은 참조값만 둔다.

## 기본 데이터 설명

`기본 부서`
: 가입 신청 화면에서 부서 선택이 필수이므로 최소 1개가 필요하다. 실제 운영 전 이름과 반 개수를 수정한다.

`admin_user`
: 새 DB 진입용 최고 관리자 계정이다. 초기 비밀번호는 `1234`이며 첫 로그인 후 변경해야 한다.

달란트 항목
: 달란트 지급 화면과 QR 생성 화면이 바로 동작하도록 학생/교사 기본 항목을 넣는다. 운영 방식에 맞게 금액과 사용 여부를 수정한다.

FAQ
: Q&A 화면이 빈 화면으로 시작하지 않도록 기본 안내 9개를 넣는다.

페이지 권한 매트릭스
: `admin/page-permissions.html`에서 기본 권한표가 보이도록 넣는다. 실제 페이지 접근 차단은 `role_page_access`에서 별도로 설정할 수 있다.

`app_config`
: 브라우저 공개 설정과 비밀 설정 참조값을 분리해 관리한다. 새 Supabase 프로젝트를 만들면 `SUPABASE_URL`, `SUPABASE_ANON_KEY`는 새 프로젝트 값으로 바꿔야 한다.

## 비워두는 데이터

다음 데이터는 운영 데이터이므로 새로 시작할 때 비워두는 것이 맞다.

- 일반 사용자 계정
- 달란트 거래 이력
- 상품 목록과 주문 이력
- QR 코드와 스캔 이력
- 사용자별 즐겨찾기 설정
- 활동 로그
- 보고서 데이터
- 부서 이동 요청
- 가입 신청 내역

## 주의할 점

- 새 Supabase 프로젝트의 Auth 설정에서 이메일 인증을 운영 방식에 맞게 조정한다. 이 프로젝트는 SQL로 생성한 계정의 `email_confirmed_at`을 채워 바로 로그인 가능하게 만든다.
- GitHub PAT, Supabase access token, service role key는 `app_config`에 원문으로 저장하지 않는다.
- 상품 이미지를 사용하려면 `Talents_Items` Storage 버킷이 필요하다. SQL에서 자동 생성한다.
- 새 프로젝트 URL과 anon key가 바뀌면 프론트 설정도 반드시 바꿔야 한다.
