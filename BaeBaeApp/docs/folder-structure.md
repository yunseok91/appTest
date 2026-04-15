# BaeBaeApp 폴더 구조

## 전체 구조

```
BaeBaeApp/
├── src/                              # 앱 소스코드
│   ├── screens/                      # 화면 컴포넌트
│   │   ├── HomeScreen.tsx            # 홈 — 거래 입력
│   │   ├── HistoryScreen.tsx         # 거래 내역 목록
│   │   ├── CalendarScreen.tsx        # 캘린더 뷰
│   │   ├── StatisticsScreen.tsx      # 통계 (카테고리별/기간별)
│   │   ├── MyPageScreen.tsx          # 마이페이지 (카드·CSV·예산·파트너)
│   │   ├── LoginScreen.tsx           # 구글 로그인
│   │   ├── ProfileSetupScreen.tsx    # 최초 가입 — 프로필 설정
│   │   ├── CoupleIconScreen.tsx      # 커플 아이콘 선택
│   │   ├── InviteCodeScreen.tsx      # 파트너 초대코드 입력
│   │   ├── HouseholdNameScreen.tsx   # 가계부 이름 입력 (최초)
│   │   ├── RenameHouseholdScreen.tsx # 가계명 변경
│   │   └── SplashScreenView.tsx      # 스플래시 화면
│   │
│   ├── components/                   # 재사용 컴포넌트
│   │   ├── EditTxModal.tsx           # 거래 수정 팝업
│   │   ├── TxCommentSection.tsx      # 거래 댓글 영역
│   │   ├── PhotoViewerModal.tsx      # 사진 전체화면 뷰어
│   │   ├── WheelPicker.tsx           # 휠 스크롤 선택기
│   │   ├── BaeBaeMark.tsx            # 앱 로고 컴포넌트
│   │   └── GoogleIcon.tsx            # 구글 로그인 아이콘
│   │
│   ├── context/                      # 전역 상태 관리 (React Context)
│   │   ├── AuthContext.tsx           # 로그인/로그아웃 상태
│   │   ├── ProfileContext.tsx        # 유저 정보·카드 목록
│   │   └── TransactionContext.tsx    # 거래 데이터
│   │
│   ├── services/
│   │   └── firestoreService.ts       # Firebase Firestore CRUD 함수
│   │
│   ├── config/
│   │   ├── firebase.ts               # Firebase 초기화 설정
│   │   └── categoryIcons.ts          # 지출(19개)·수입(5개) 카테고리 정의
│   │
│   ├── navigation/
│   │   ├── AppNavigator.tsx          # 화면 전환 스택 설정
│   │   └── navigationRef.ts          # 전역 네비게이션 참조
│   │
│   ├── theme/
│   │   └── colors.ts                 # 앱 전체 색상 상수
│   │
│   └── __tests__/
│       └── utils.test.ts             # Jest 단위 테스트 50개 (자동화)
│
├── docs/                             # QA 산출물
│   ├── TC.md                         # 수동 테스트 케이스 문서
│   ├── TC-auto.md                    # 자동화 TC 명세 (A01~A10)
│   ├── folder-structure.md           # 이 파일
│   └── api-test/
│       ├── BaeBae-API-Tests.postman_collection.json  # Postman 컬렉션
│       ├── postman-guide.md          # Postman 설정 가이드
│       └── test-report.html          # Newman 실행 리포트 (36 assertions)
│
├── assets/                           # 정적 리소스
│   ├── icon.png                      # 앱 아이콘
│   └── avatars/                      # 커플 아이콘 이미지
│
├── App.tsx                           # 앱 진입점 — Context Provider 설정
├── index.js                          # Expo 앱 등록
├── app.json                          # Expo 앱 설정 (이름·버전·아이콘)
├── eas.json                          # EAS 빌드·OTA 업데이트 채널 설정
├── jest.config.js                    # Jest 테스트 설정
├── tsconfig.json                     # TypeScript 컴파일 설정
├── babel.config.js                   # Babel 변환 설정
├── package.json                      # 의존성 목록
└── .gitignore                        # Git 제외 목록

```

## .gitignore로 push 제외되는 것

| 경로 | 이유 |
|------|------|
| `node_modules/` | 의존성 — npm install로 복원 가능 |
| `dist/` | eas update 빌드 산출물 |
| `android/` | 네이티브 빌드 파일 |
| `.expo/` | Expo 로컬 캐시 |
| `.env` | 환경변수 — 보안상 제외 |
