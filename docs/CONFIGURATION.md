# Configuration Guide

이 문서는 CHO-Talents 프로젝트의 공개 설정과 비밀 설정을 분리해 관리하는 기준을 설명한다.

## 1. 결론

| 항목 | 제공된 정보로 충분한가? | 설명 |
|---|---|---|
| GitHub 소스 형상관리 | 조건부 충분 | GitHub PAT에 해당 저장소의 `Contents: Read/Write` 권한 또는 classic `repo` 권한이 있으면 `develop` 브랜치 push가 가능하다. |
| Supabase 브라우저 CRUD | 기존 공개 키로 가능 | 현재 사이트는 `SUPABASE_URL` + publishable/anon key + 사용자 로그인 + RLS/RPC 기준으로 동작한다. |
| Supabase 관리 API/CLI | 대체로 충분 | `sbp_...` 형태의 Supabase access token은 Management API 또는 Supabase CLI 인증에 사용한다. |
| Supabase 무제한 DB CRUD/SQL | 추가 정보 필요 | 서비스 롤 키 또는 DB connection string/password가 필요하다. 이 값은 브라우저에 절대 노출하면 안 된다. |

## 2. 파일 구성

| 파일 | Git 추적 | 용도 |
|---|---|---|
| `config/public-config.js` | 추적 | 브라우저가 읽어도 되는 공개 런타임 설정 |
| `.env.example` | 추적 | 로컬 비밀 설정 템플릿 |
| `.env.local` | 미추적 | 실제 GitHub PAT, Supabase access token, service-role key 등 비밀값 |
| `js/supabase-config.js` | 추적 | `window.CHO_TALENTS_CONFIG`를 읽어 Supabase 클라이언트 초기화 |
| `scripts/load-env.ps1` | 추적 | `.env.local`을 읽어 현재 PowerShell 세션의 환경변수로 설정 |

## 3. 공개 설정

`config/public-config.js`에는 아래처럼 브라우저에 노출되어도 되는 값만 둔다.

- Supabase Project URL
- Supabase publishable/anon key
- Auth 이메일 도메인
- Kakao JavaScript key
- GitHub 저장소 owner/repo/branch 같은 비밀이 아닌 메타데이터

## 4. 비밀 설정

`.env.local`에는 아래 값을 넣을 수 있다. 이 파일은 `.gitignore`에 포함되어 있으므로 커밋하지 않는다.

```text
GITHUB_PAT=...
SUPABASE_ACCESS_TOKEN=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_CONNECTION_STRING=...
```

로컬 PowerShell 자동화에서는 아래처럼 설정을 읽는다.

```powershell
. .\scripts\load-env.ps1
```

## 5. 추가로 필요한 Supabase 정보

제공된 Supabase access token만으로는 브라우저 앱에서 DB CRUD를 직접 수행하는 용도로 쓰지 않는다. DB 관리 자동화 목적이라면 다음 중 하나가 추가로 필요하다.

| 목적 | 필요한 값 |
|---|---|
| RLS를 무시하는 서버/로컬 CRUD | `SUPABASE_SERVICE_ROLE_KEY` |
| SQL 실행, 마이그레이션, 백업 | `SUPABASE_DB_CONNECTION_STRING` 또는 DB password |
| Supabase CLI 프로젝트 연결 | `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` |

## 6. 보안 원칙

- GitHub PAT와 Supabase access token은 정적 HTML/JS에 넣지 않는다.
- 서비스 롤 키는 브라우저에서 사용하지 않는다.
- 브라우저 앱은 publishable/anon key와 RLS/RPC로 제한된 작업만 수행한다.
- 로컬 자동화나 배포 스크립트는 `.env.local`을 읽어 실행한다.
