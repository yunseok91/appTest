# BaeBaeApp 개발 계획

> 작성일: 2026-03-16 / 최종 업데이트: 2026-03-16 (Phase 1 완료)
> 현재 Expo SDK 54 / React Native 0.77.1
> ℹ️ 이 파일은 작업 완료 시 실시간 반영됩니다.

---

## 아키텍처

### 전체 레이어 구조

```
┌─────────────────────────────────────────────────────┐
│                    사용자 (User)                      │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                 Presentation Layer                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ screens/ │ │components│ │navigation│            │
│  └──────────┘ └──────────┘ └──────────┘            │
│    10개 화면    공통 컴포넌트   AppNavigator            │
└─────────────────────┬───────────────────────────────┘
                      │ useContext / hooks
┌─────────────────────▼───────────────────────────────┐
│                  State Layer                          │
│  ┌───────────────┐  ┌──────────────────────────┐   │
│  │  AuthContext  │  │   TransactionContext      │   │
│  │  (로그인 상태) │  │   (거래 내역 CRUD)        │   │
│  └───────────────┘  └──────────────────────────┘   │
│  ┌────────────────────────────────────────────────┐ │
│  │  ProfileContext (예산·카드 목록 AsyncStorage)   │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────┘
                      │
       ┌──────────────┴──────────────┐
       │ Phase 1~2 (로컬)             │  Phase 3 (서버)
┌──────▼──────┐              ┌───────▼──────────────┐
│AsyncStorage │              │      Firebase         │
│  로컬 저장   │              │  Firestore  │  Auth   │
└─────────────┘              └──────────────────────┘
```

---

### 화면 네비게이션 흐름

```
앱 시작
  │
  ├─ 로그인 안 됨 ──────────────────────────────────────────────────┐
  │                                                                  │
  │   [LoginScreen]                                                  │
  │       │ Google OAuth                                             │
  │       ▼                                                          │
  │   [CoupleIconScreen]  아이콘 선택 (남/여)                        │
  │       │                                                          │
  │       ▼                                                          │
  │   [ProfileSetupScreen]  이름 입력                                │
  │       │                                                          │
  │       ▼                                                          │
  │   [InviteCodeScreen]  커플 코드 입력/공유                         │
  │       │                                                          │
  │       ▼                                                          │
  │   [HouseholdNameScreen]  가계 이름 설정                           │
  │       │                                                          │
  └───────┘                                                          │
                                                                     │
  ├─ 로그인 됨 ───────────────────────────────────────────────────── ┘
  │
  ▼
[MainTabs - Bottom Navigation]
  ├── 홈          [HomeScreen]         거래 입력
  ├── 내역        [HistoryScreen]      거래 목록·필터·상세
  ├── 캘린더 (●)  [CalendarScreen]     날짜별 달력 뷰
  ├── 통계        [StatisticsScreen]   카테고리·도넛차트
  └── 마이        [MyPageScreen]       프로필·예산·카드·설정
                      │
                      └── [RenameHouseholdScreen]  가계명 변경
```

---

### 데이터 흐름 (Phase 1 완성 후)

```
[HomeScreen]
  사용자 입력
  (카테고리·금액·메모·날짜·카드)
        │
        │ addTransaction()
        ▼
[TransactionContext]  ◄──────────────────────────────────────┐
  거래 목록 (메모리)                                           │
        │                                                     │
        │ useEffect → AsyncStorage.setItem()                  │
        ▼                                                     │
[AsyncStorage]  '@baebae_transactions'                        │
        │                                                     │
        │ 앱 재시작 시 AsyncStorage.getItem() → Context 복원  │
        │                                                     │
        ├──── useTransactions() ──► [HistoryScreen]  거래 목록 표시
        ├──── useTransactions() ──► [CalendarScreen]  날짜별 집계
        └──── useTransactions() ──► [StatisticsScreen]  카테고리 합산

[ProfileContext]
  이름·성별·아이콘·예산·카드
        │
        │ AsyncStorage '@baebae_profile'
        │
        ├──► [HomeScreen]  잔액 = 예산 - 지출합계
        └──► [MyPageScreen]  프로필 표시·수정
```

---

### Phase 3 Firebase 아키텍처 (커플 동기화)

```
  [기기 A - 민지]                    [기기 B - 준호]
       │                                   │
  HomeScreen                          HomeScreen
  addTransaction()                         │
       │                                   │
       ▼                                   │
  Firebase SDK                        Firebase SDK
       │                                   │
       │  write                   onSnapshot (실시간 구독)
       ▼                                   ▼
┌──────────────────────────────────────────────────┐
│                  Firestore                        │
│                                                   │
│  households/{id}                                  │
│    ├── members: [userId_A, userId_B]              │
│    ├── name: "민지&준호 가계부"                    │
│    └── budget: 3000000                            │
│                                                   │
│  transactions/{id}                                │
│    ├── householdId                                │
│    ├── category / amount / memo                   │
│    ├── date / time / person                       │
│    └── payMethod / photoUri                       │
│                                                   │
│  users/{userId}                                   │
│    ├── name / email / picture                     │
│    └── householdId                                │
└──────────────────────────────────────────────────┘
       │
       ▼
  Firebase Cloud Functions (선택)
    → 파트너 지출 시 푸시 알림 전송
    → 월간 리포트 자동 생성
```

---

### 파일 구조 (목표)

```
BaeBaeApp/
├── App.tsx
├── app.json
├── assets/
│   ├── avatars/
│   ├── splash.png
│   └── ...
└── src/
    ├── components/         공통 컴포넌트
    │   ├── GoogleIcon.tsx
    │   ├── BaeBaeMark.tsx
    │   └── (Toast, EmptyState 등 추가 예정)
    ├── config/
    │   └── categoryIcons.ts
    ├── context/            전역 상태
    │   ├── AuthContext.tsx         ✅ 완성
    │   ├── TransactionContext.tsx  ✅ 완성
    │   └── ProfileContext.tsx      ✅ 완성 (Phase 1)
    ├── navigation/
    │   └── AppNavigator.tsx
    ├── screens/            화면 (10개)
    │   ├── LoginScreen.tsx
    │   ├── CoupleIconScreen.tsx
    │   ├── ProfileSetupScreen.tsx
    │   ├── InviteCodeScreen.tsx
    │   ├── HouseholdNameScreen.tsx
    │   ├── HomeScreen.tsx
    │   ├── HistoryScreen.tsx
    │   ├── CalendarScreen.tsx
    │   ├── StatisticsScreen.tsx
    │   ├── MyPageScreen.tsx
    │   └── RenameHouseholdScreen.tsx
    └── theme/              디자인 토큰
        ├── colors.ts               ✅ 완성
        ├── responsive.ts           🔲 Phase 4 (해상도 대응)
        └── commonStyles.ts         🔲 Phase 4 (공통 스타일)
```

---

## 현재 상태 요약

| 구분 | 완성도 | 비고 |
|------|--------|------|
| UI/UX 디자인 | 95% | 모든 화면 구현 완료, Pencil 디자인 싱크 |
| 데이터 저장 | 75% | Phase 1 완료 — 거래/예산/카드 AsyncStorage |
| 백엔드 연동 | 5% | Google OAuth만 연동 |
| 커플 동기화 | 0% | Phase 3 예정 |

### 화면별 구현 상태

| 화면 | UI | 데이터 | 저장 | 비고 |
|------|-----|--------|------|------|
| LoginScreen | ✅ | ✅ | ✅ | Google OAuth 코드 완성 (EAS Build 후 실 테스트 필요) |
| CoupleIconScreen | ✅ | 더미 | ❌ | Phase 2 대상 |
| ProfileSetupScreen | ✅ | 더미 | ❌ | Phase 2 대상 |
| InviteCodeScreen | ✅ | 더미 | ❌ | Phase 2/3 대상 |
| HouseholdNameScreen | ✅ | 더미 | ❌ | Phase 2 대상 |
| HomeScreen | ✅ | ✅ | ✅ | TransactionContext 저장 완료 |
| HistoryScreen | ✅ | ✅ | ✅ | 실제 데이터 연동 + 삭제 작동 |
| CalendarScreen | ✅ | ✅ | ✅ | 실제 데이터 연동 + 삭제 작동 |
| StatisticsScreen | ✅ | ✅ | ✅ | 실제 집계 연동 |
| MyPageScreen | ✅ | ✅ | ✅ | ProfileContext 연동 완료 |

### 잔여 하드코딩 제거 대상

- 부부 이름 `민지 & 준호` — HomeScreen, MyPageScreen → Phase 2 (ProfileContext 이름/아이콘 저장)
- 초대코드 `'BF-2847-XK'` — InviteCodeScreen → Phase 2/3
- ~~월간 예산 `₩3,000,000`~~ ✅ ProfileContext 연동 완료
- ~~카드 목록 3개~~ ✅ ProfileContext 연동 완료

---

## Phase 1 — 로컬 데이터 완성 ✅ 완료

> **목표**: 백엔드 없이 앱이 실제로 작동하도록
> **완료일**: 2026-03-16

### 1-1. TransactionContext 생성

거래 데이터를 전체 앱에서 공유하는 전역 상태 관리

```
src/context/TransactionContext.tsx
```

- `Transaction` 타입 정의 (id, category, amount, memo, date, time, person, payMethod, photoUri)
- AsyncStorage에 거래 목록 저장/로드
- CRUD 메서드: `addTransaction`, `updateTransaction`, `deleteTransaction`
- 전체 앱에서 `useTransactions()` 훅으로 접근

### 1-2. HomeScreen 저장 기능

- "저장" 버튼 클릭 → `addTransaction()` 호출
- 저장 후 입력 필드 초기화
- 저장 성공 피드백 (토스트 or 진동)

### 1-3. HistoryScreen 연동

- 더미 `DUMMY` 배열 제거
- `useTransactions()`로 실제 데이터 표시
- 월 선택에 따른 필터링 (실제 날짜 기준)
- 수정/삭제 버튼 실제 작동

### 1-4. CalendarScreen 연동

- 고정 달력 제거 → 현재 날짜 기준 동적 렌더링
- 날짜별 거래 집계 (TransactionContext 데이터 기반)
- 거래 상세 시트 스타일 에러 해결 (미완료 상태)

### 1-5. StatisticsScreen 연동

- 더미 카테고리 금액 제거
- 실제 거래 데이터 기반 카테고리별 집계
- 월 선택 시 해당 월 데이터만 필터

### 1-6. ProfileContext 생성

```
src/context/ProfileContext.tsx
```

- 사용자 프로필 (이름, 아이콘, 성별) AsyncStorage 저장
- 파트너 정보 저장
- 예산 설정 저장
- 하드코딩된 `민지 & 준호` 제거

### 1-7. 카드/예산 저장

- MyPage 카드 추가/삭제 → AsyncStorage 저장
- 예산 설정 → ProfileContext 연동
- HomeScreen 잔액 계산 → 실제 예산 - 실제 지출

---

## Phase 2 — 온보딩 플로우 완성

> **목표**: 회원가입부터 가계 설정까지 흐름 완성
> **예상 기간**: 1~2일

### 2-1. 온보딩 데이터 저장

- CoupleIconScreen → 아이콘 선택 저장
- ProfileSetupScreen → 이름/성별 ProfileContext 저장
- HouseholdNameScreen → 가계명 저장
- RenameHouseholdScreen → 가계명 수정 저장

### 2-2. 초대코드 로직

- 앱 설치 후 랜덤 6자리 코드 생성 (예: `BF-2847-XK`)
- AsyncStorage에 저장
- 상대방이 코드 입력 시 → 로컬에서 매칭 처리 (Phase 3에서 서버 검증으로 교체)

### 2-3. 온보딩 완료 플래그

- AsyncStorage에 `@baebae_onboarded: true` 저장
- 앱 재시작 시 온보딩 스킵 → 바로 메인 탭

### 2-4. 예산 설정

- MyPage에서 예산 입력 UI
- ProfileContext에 저장
- HomeScreen 잔액 계산에 반영

---

## Phase 3 — 백엔드 연동 (커플 실시간 동기화)

> **목표**: 두 기기에서 데이터 실시간 공유
> **예상 기간**: 3~5일
> **추천 스택**: Firebase (무료 플랜으로 충분)

### Firebase 선택 이유

| 항목 | 설명 |
|------|------|
| Firestore | 실시간 DB — 한 명 입력 시 상대방 즉시 반영 |
| Firebase Auth | Google 로그인 연동 간단 |
| 비용 | 개인 프로젝트 규모는 무료 |
| Expo 호환 | 공식 지원 |

### 3-1. Firebase 설정

```
npx expo install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore
```

- Google Cloud Console ↔ Firebase 프로젝트 연결
- `google-services.json` (Android), `GoogleService-Info.plist` (iOS) 추가

### 3-2. Firestore 데이터 구조

```
households/
  {householdId}/
    members: [userId1, userId2]
    name: "우리 가계부"
    budget: 3000000
    inviteCode: "BF-2847-XK"

transactions/
  {transactionId}/
    householdId: string
    category: string
    amount: number
    memo: string
    date: timestamp
    person: string
    payMethod: string

users/
  {userId}/
    name: string
    email: string
    picture: string
    householdId: string
```

### 3-3. 커플 연결

- 로그인 시 Firestore에 사용자 생성
- 초대코드 입력 → Firestore에서 `inviteCode` 조회 → 같은 `household`에 합류
- 연결 성공 시 `householdId` 저장

### 3-4. 실시간 동기화

- `useEffect` + Firestore `onSnapshot` → 거래 내역 실시간 구독
- 한 명이 추가/수정/삭제 → 상대방 화면 자동 업데이트

### 3-5. 푸시 알림

```
npx expo install expo-notifications
```

- 파트너가 지출 입력 시 → 알림 전송
- "준호가 스타벅스에서 6,500원 지출했어요 ☕"

---

## Phase 4 — 완성도 향상

> **목표**: 사용성 개선, 버그 수정
> **언제**: Phase 1~2 완료 후 병행

### 버그 수정

- [ ] CalendarScreen 스타일 에러 22개 해결 (미완료)
- [ ] Google Client ID placeholder 실제 값으로 교체
- [ ] uLNqy Pencil 디자인 싱크

### UX 개선

- [ ] 빈 상태 UI — 거래 없을 때 "아직 기록이 없어요" 화면
- [ ] 거래 저장 성공 피드백 (토스트 or 햅틱)
- [ ] 예산 초과 시 경고 UI
- [ ] 월간 리포트 — "이번 달 식비가 지난달보다 23% 늘었어요"
- [ ] 거래 검색 기능 (HistoryScreen)

### 접근성

- [ ] 다크모드 대응 (현재 라이트 고정)
- [ ] 폰트 크기 대응

---

## 기술 결정 사항

### 상태 관리

```
src/context/
  AuthContext.tsx          ✅ 완성 — Google 로그인 + AsyncStorage 세션 유지, 가계명 저장
  TransactionContext.tsx   ✅ 완성 — 거래 CRUD + AsyncStorage 영속성
  ProfileContext.tsx        ✅ 완성 — 예산 + 카드 목록 AsyncStorage 영속성
```

### 백엔드 선택지

| 옵션 | 장점 | 단점 | 추천 |
|------|------|------|------|
| Firebase | 빠른 구현, 실시간, 무료 | Google 종속 | ✅ 추천 |
| Supabase | 오픈소스, PostgreSQL | 설정 복잡 | 대안 |
| 직접 구축 (Node.js) | 완전한 제어 | 서버 비용, 시간 | 나중에 |

---

## 실행 순서

```
[지금] CalendarScreen 스타일 에러 해결
  ↓
[Phase 1] TransactionContext + 저장 기능
  ↓
[Phase 1] 각 화면 Context 연동 (History, Calendar, Statistics)
  ↓
[Phase 1] ProfileContext + 하드코딩 제거
  ↓
[Phase 2] 온보딩 플로우 완성
  ↓
[Phase 4] 버그/UX 개선 병행
  ↓
[Phase 3] Firebase 연동 (커플 동기화)
  ↓
[Phase 3] 푸시 알림
```

---

## 잔여 할일 목록

> ✅ 완료 / 🔲 미완료 / ⚠️ 버그 / 🚫 배포 전 필수

### 즉시 처리

- ✅ 개발 모드 우회 버튼 추가 (LoginScreen `__DEV__` 조건부)
- ✅ CalendarScreen 스타일 에러 해결 (`detailSheet`, `catChip` 등 22개)
- 🔲 Google 로그인 실제 작동 → **EAS Development Build 생성 후 테스트**

---

### Phase 1 — 데이터 저장 ✅ 완료

- ✅ `TransactionContext` 생성 (`src/context/TransactionContext.tsx`)
  - ✅ Transaction 타입 정의
  - ✅ AsyncStorage CRUD (add / update / delete)
  - ✅ `useTransactions()` 훅
- ✅ HomeScreen 저장 버튼 실제 동작 → `addTransaction()` 연결
- ✅ HomeScreen 저장 후 입력 필드 초기화
- ✅ HistoryScreen 더미 데이터 제거 → Context 연동
- ✅ HistoryScreen 삭제 버튼 실제 동작
- ✅ HistoryScreen 빈 상태 UI
- ✅ HistoryScreen 수정 모달 구현 (바텀시트 + KAV 키보드 대응)
- ✅ HistoryScreen / CalendarScreen 거래 상세 팝업 사진 표시
- ✅ CalendarScreen 더미 고정 달력 제거 → 동적 렌더링
- ✅ CalendarScreen 날짜별 거래 집계 → Context 연동
- ✅ CalendarScreen 삭제 버튼 실제 동작
- ✅ CalendarScreen 모달 중첩 이슈 수정 (Android)
- ✅ StatisticsScreen 더미 통계 제거 → 실제 집계
- ✅ StatisticsScreen 빈 상태 UI
- ✅ StatisticsScreen 날짜 선택 overlay 버그 수정
- ✅ RenameHouseholdScreen 저장 → AuthContext 실시간 반영
- ✅ `PhotoViewerModal` 컴포넌트 — 사진 전체화면 뷰어 + 갤러리 저장
- ✅ `ProfileContext` 생성 (`src/context/ProfileContext.tsx`)
  - ✅ 예산 (`budget`) AsyncStorage 저장, 기본값 3,000,000
  - ✅ 카드 목록 (`cards`) AsyncStorage 저장
- ✅ HomeScreen 하드코딩 제거 → 실제 월별 수입/지출 집계, ProfileContext 예산/카드 연동
- ✅ MyPage 카드 추가/삭제 → ProfileContext AsyncStorage 저장
- ✅ MyPage 예산 수정 바텀시트 → ProfileContext 저장 → HomeScreen 잔액 반영
- 🔲 이름/아이콘 하드코딩 `민지 & 준호` → Phase 2 (ProfileSetupScreen 온보딩 연동)

> ⚠️ 현재 데이터 저장소: AsyncStorage (로컬) — 기기 분실 시 소실
> Phase 3 Firebase 연동 시 Firestore로 교체 예정

---

### Phase 2 — 온보딩 플로우

- 🔲 CoupleIconScreen 아이콘 선택 → ProfileContext 저장
- 🔲 ProfileSetupScreen 이름/성별 → ProfileContext 저장
- 🔲 HouseholdNameScreen 가계명 → ProfileContext 저장
- 🔲 RenameHouseholdScreen 가계명 수정 저장
- 🔲 초대코드 랜덤 생성 + AsyncStorage 저장
- 🔲 온보딩 완료 플래그 (`@baebae_onboarded`) → 재시작 시 스킵
- 🔲 로그아웃 실제 동작 (AuthContext `signOut` + 플래그 초기화)

---

### Phase 3 — Firebase 연동 (커플 동기화 + 클라우드 백업)

- 🔲 Firebase 프로젝트 생성 + Expo 연결
- 🔲 Firestore 컬렉션 구조 생성 (users / households / transactions)
- 🔲 Google 로그인 → Firebase Auth 연동 (EAS Build 필요)
- 🔲 초대코드 → Firestore 커플 연결 로직
- 🔲 TransactionContext AsyncStorage → Firestore 교체 (파일 구조 유지)
- 🔲 거래 내역 실시간 동기화 (`onSnapshot`)
- 🔲 파트너 지출 시 푸시 알림 (`expo-notifications`)
- 🔲 **거래 내역 Excel/CSV 내보내기** (`expo-file-system` + `expo-sharing`)
  - 월별 또는 전체 거래 → CSV 파일 생성 → 공유 시트

---

### Phase 4 — 완성도 / 배포

- 🔲 해상도 대응 (`src/theme/responsive.ts` + `rw()` / `rf()` 적용)
- 🔲 공통 스타일 분리 (`src/theme/commonStyles.ts`)
- 🔲 거래 저장 성공 햅틱/토스트 피드백
- 🔲 예산 초과 경고 UI
- 🔲 거래 수정 기능 (HomeScreen 수정 모드)
- 🔲 거래 검색 기능 (HistoryScreen)
- 🔲 월간 리포트 — "이번 달 식비가 지난달보다 23% 늘었어요"
- 🔲 다크모드 대응
- 🚫 Google 로그인 개발 우회 버튼 제거 (배포 전 필수 — `__DEV__` 라 자동 제외됨)
- 🔲 EAS Build Android / iOS 배포 설정
- 🔲 App Store / Play Store 제출

---

## Google Client ID 설정 (필수)

로그인이 실제 작동하려면 아래 설정 필요:

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. APIs & Services → Credentials → OAuth 2.0 Client IDs
3. Android / iOS / Web 3개 생성
4. `src/screens/LoginScreen.tsx` 19~23번째 줄 ID 입력

```ts
const GOOGLE_CLIENT_IDS = {
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  iosClientId:     'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  webClientId:     'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
};
```
