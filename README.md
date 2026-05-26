# CHO-Talents

초등부 교사 / 아이들 달란트 및 상품 관리 프로젝트

**Live:** https://cho-talents.github.io/CHO-Talents/

## 프로젝트 구조

```
CHO-Talents/
├── index.html              # 메인 페이지
├── css/
│   └── style.css           # 스타일시트
├── js/
│   ├── supabase-config.js  # Supabase 설정 및 CRUD 헬퍼
│   └── app.js              # 앱 로직
├── assets/                 # 이미지, 아이콘 등
└── README.md
```

## 기술 스택

- **Frontend:** HTML / CSS / JavaScript (Vanilla)
- **Backend:** Supabase (PostgreSQL + REST API)
- **Hosting:** GitHub Pages

## Supabase 설정

`js/supabase-config.js` 파일에서 아래 값을 본인의 Supabase 프로젝트 정보로 교체하세요:

```js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```
