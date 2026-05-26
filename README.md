# CHO-Talents

초등부 교사 / 아이들 달란트 및 상품 관리 프로젝트

**Live:** https://cho-talents.github.io/CHO-Talents/

## 프로젝트 구조

```
CHO-Talents/
├── index.html                     # 메인 환영 페이지
├── login.html                     # 통합 로그인 (전 역할 공통)
├── register.html                  # 계정 등록 신청
├── earn-talents.html              # 달란트 적립 안내
├── admin/                         # 관리자 전용
│   ├── index.html                # 관리자 대시보드
│   ├── users.html                # 사용자 관리
│   ├── departments.html          # 부서 관리
│   ├── managers.html             # 관리자 관리
│   ├── products.html             # 상품 관리
│   ├── shop.html                 # 상점 조회
│   ├── reports.html              # 보고서 관리
│   ├── logs.html                 # 활동 로그 관리
│   ├── versions.html             # 버전 이력
│   └── change-password.html      # 비밀번호 변경
├── manager/                       # 부서 관리자 전용
│   ├── index.html                # 부서 관리자 대시보드
│   ├── students.html             # 학생 관리
│   ├── teachers.html             # 교사 관리
│   ├── products.html             # 물품 관리
│   └── my-talents.html           # 내 달란트
├── teacher/                       # 교사 전용
│   ├── shop.html                 # 교사 상점
│   └── my-talents.html           # 내 달란트
├── student/                       # 학생 전용
│   ├── shop.html                 # 학생 상점
│   └── my-talents.html           # 내 달란트
├── css/
│   ├── style.css                 # 메인 스타일
│   └── admin.css                 # 관리자/역할 페이지 스타일
├── js/
│   ├── supabase-config.js        # Supabase 설정 + KST 유틸리티 + CRUD 헬퍼
│   ├── app.js                    # 메인 앱 로직
│   ├── activity-log.js           # 로그 시스템 (7레벨, 확인 체계)
│   ├── auth.js                   # 인증 모듈 (Supabase Auth 기반)
│   ├── user-mgmt.js              # 사용자 관리 RPC
│   ├── talent.js                 # 달란트 관리
│   ├── product.js                # 상품 관리
│   └── version.js                # 버전 관리
└── docs/                          # 작업 보고서 및 SQL
```

## 기술 스택

- **Frontend:** HTML / CSS / JavaScript (Vanilla)
- **Backend:** Supabase (PostgreSQL + REST API + Auth + Storage)
- **Hosting:** GitHub Pages
- **인증:** Supabase Auth (bcrypt, JWT, RLS)

## 로그인

- **통합 로그인:** https://cho-talents.github.io/CHO-Talents/login.html
- 역할(관리자/부서관리자/교사/학생)에 따라 자동으로 해당 페이지로 이동
- 첫 로그인 시 비밀번호 변경 필수
