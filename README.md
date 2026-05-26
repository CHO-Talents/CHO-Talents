# CHO-Talents

초등부 교사 / 아이들 달란트 및 상품 관리 프로젝트

**Live:** https://cho-talents.github.io/CHO-Talents/

## 프로젝트 구조

```
CHO-Talents/
├── index.html                     # 메인 환영 페이지
├── admin/
│   ├── login.html                # 관리자 로그인
│   ├── index.html                # 관리자 대시보드
│   ├── reports.html              # 보고서 관리
│   ├── logs.html                 # 활동 로그 관리
│   └── change-password.html      # 비밀번호 변경
├── css/
│   ├── style.css                 # 메인 스타일
│   └── admin.css                 # 관리자 스타일
├── js/
│   ├── supabase-config.js        # Supabase 설정 + KST 유틸리티 + CRUD 헬퍼
│   ├── app.js                    # 메인 앱 로직
│   ├── activity-log.js           # 로그 시스템 (7레벨, 확인 체계)
│   └── auth.js                   # 인증 모듈
├── docs/
│   ├── supabase_setup.sql        # Supabase 초기 설정 SQL
│   └── TASK-001_test_scenario.md # 검증 테스트 시나리오
└── README.md
```

## 기술 스택

- **Frontend:** HTML / CSS / JavaScript (Vanilla)
- **Backend:** Supabase (PostgreSQL + REST API)
- **Hosting:** GitHub Pages

## 초기 설정

1. `docs/supabase_setup.sql`을 Supabase SQL Editor에서 실행
