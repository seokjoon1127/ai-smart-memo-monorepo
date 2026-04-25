# AI Smart Memo

> 메모를 자연어로 적으면 AI가 일정으로 만들어주는 생산성 SaaS

한 줄짜리 한국어 메모(예: _"내일 3시 김팀장 회의, 금요일까지
보고서 제출"_)를 입력하면 LLM이 일정 후보를 추출하고, 시간 충돌을 자동 감지해 대안
시간을 제안하고, 등록 후엔 RAG로 관련 문서까지 연결해줍니다.

---

## 시연 시나리오

### 🅰 Happy Path — 메모 → 파싱 → 등록 → 캘린더

1. `/memo` 페이지에서 **"김팀장 회의 + 보고서"** 시드 칩 클릭 (또는 직접 입력)
2. **AI 파싱 시작** → ~800ms 후 STEP 2로 자동 전환
3. 카드 2장 표시 — _김팀장 회의(⚠ 충돌)_, _보고서 제출(종일)_
4. 충돌 카드의 **"15:30으로 변경"** 클릭 → 시간 자동 조정 + 충돌 해소
5. **"2개 일정 모두 등록"** → STEP 3
6. 사이드바 → **일정 관리** → 4월 캘린더에서 신규 일정 확인 ✅

### 🅱 RAG — 관련 문서 자동 연결

1. STEP 3 카드의 📎 **연관 문서** 클릭 → `/sharebox`로 이동
2. 검색창에 **"김팀장"** 입력 → 300ms debounce 후 매치 문서만 표시
3. 카테고리 필터 **"회의록"** 선택 → 회의록만 필터링

### 🅲 AI 제안 → 캘린더 즉시 반영 (클라이맥스)

1. STEP 3에서 SuggestionBox **"💡 AI 제안 — QA 킥오프 미팅"** 의 **일정 만들기** 클릭
2. 모달 오픈 (ESC 키로 닫기 가능)
3. 모달 **확인** 버튼 → 토스트 _"일정이 등록됐어요"_ + **"캘린더 보기"** 액션
4. 캘린더 보기 → `/calendar`에 신규 일정 **즉시 표시** ✨

---

## 핵심 기능

- **자연어 메모 → 일정 자동 추출** (Gemini 기반)
- **시간 충돌 감지** + 대안 시간 자동 제안 (09–21시 30분 단위)
- **RAG 기반 관련 문서 연결** (FAISS + 임베딩 cosine similarity)
- **AI 후속 제안** — 회의 등록 시 자연스러운 follow-up 미팅 제안
- **Google Calendar 동기화** (선택, 기본은 Mock UUID)
- **Mock 모드** — 백엔드 없이도 환경변수 한 줄로 전체 시연 가능

## 기술 스택

**프론트엔드**

![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router_v6-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-433E38?style=for-the-badge)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)

**백엔드**

![Python](https://img.shields.io/badge/Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy_2.x-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

**AI / 벡터 검색**

![Gemini](https://img.shields.io/badge/Google_Gemini_2.0_Flash-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)
![Gemini Embedding](https://img.shields.io/badge/text--embedding--004-4285F4?style=for-the-badge&logo=google&logoColor=white)
![FAISS](https://img.shields.io/badge/FAISS-0467DF?style=for-the-badge&logo=meta&logoColor=white)

**외부 연동**

![Google Calendar](https://img.shields.io/badge/Google_Calendar_API-4285F4?style=for-the-badge&logo=googlecalendar&logoColor=white)

**테스트**

![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Testing Library](https://img.shields.io/badge/Testing_Library-E33332?style=for-the-badge&logo=testinglibrary&logoColor=white)
![jsdom](https://img.shields.io/badge/jsdom-F7DF1E?style=for-the-badge&logoColor=black)

## 프로젝트 구조

```
ai-smart-memo-monorepo/
├── frontend/
│   ├── src/
│   │   ├── pages/           # 6개 화면 (Memo / ShareBox / Calendar / Notes / Team / Notification)
│   │   ├── components/      # shell, memo, sharebox, calendar, common
│   │   ├── stores/          # Zustand: memoStore, scheduleStore, shareBoxStore, uiStore
│   │   ├── services/        # mock/real API 스위치 (services/index.ts)
│   │   ├── data/            # mock 시연 데이터 (Schedules, ShareBox, Notes 등)
│   │   ├── hooks/           # useDebounce, useToast
│   │   ├── types/api.ts     # API contract TS 타입
│   │   ├── router/          # React Router 설정
│   │   └── test/            # vitest setup, MSW handlers
│   ├── vite.config.ts
│   └── package.json
│
├── backend/
│   ├── main.py              # FastAPI app + 12개 엔드포인트 라우팅
│   ├── models/              # Pydantic 모델 (api_contract.md 5절)
│   ├── services/            # ai_service (Gemini), rag_service (FAISS), gcal_service
│   ├── db/                  # SQLAlchemy 세션, 모델
│   ├── data/                # SQLite DB + FAISS 인덱스 파일
│   └── requirements.txt
│
├── api_contract.md          # API 명세서 (Single Source of Truth)
├── CLAUDE.md                # Claude Code 작업용 가이드
└── README.md
```

## API 문서

전체 명세는 **[`api_contract.md`](./api_contract.md)** 참고.

| EP  | Method | Path                             | 설명                                    |
| --- | ------ | -------------------------------- | --------------------------------------- |
| 1   | GET    | `/api/notes`                     | 메모 목록 조회                          |
| 2   | POST   | `/api/notes`                     | 메모 생성 (백그라운드 임베딩)           |
| 3   | DELETE | `/api/notes/{id}`                | 메모 삭제                               |
| 4   | POST   | `/api/parse`                     | 메모 → 일정 후보 추출 (Gemini)          |
| 5   | POST   | `/api/schedules`                 | 일정 일괄 등록 (Google Calendar 동기화) |
| 6   | GET    | `/api/schedules?from=&to=&type=` | 캘린더 뷰용 일정 조회                   |
| 7   | GET    | `/api/schedules/{id}`            | 일정 상세 + RAG + AI 제안               |
| 8   | GET    | `/api/calendar/conflicts`        | 시간 충돌 단독 조회                     |
| 9   | GET    | `/api/sharebox?q=&category=`     | ShareBox 검색/필터                      |
| 10  | POST   | `/api/sharebox`                  | ShareBox 문서 추가                      |
| 11  | GET    | `/api/sharebox/{id}`             | ShareBox 문서 상세                      |
| 12  | POST   | `/api/suggestions/{id}/accept`   | AI 제안 수락 → 일정 등록                |

모든 응답은 JSON. 에러는 `{"error": {"code", "message", "detail?"}}` 형태로 통일.
