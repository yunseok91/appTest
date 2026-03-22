# BaeBaeApp 개발 계획

> 작성일: 2026-03-16 / 최종 업데이트: 2026-03-19 (Phase 4 버그수정·코드정리 진행 중)
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

### 데이터 흐름 (Phase 3 — Firestore 모드)

```
[HomeScreen]
  사용자 입력
  (카테고리·금액·메모·날짜·카드)
        │
        │ addTransaction()
        ▼
[TransactionContext]
  isFirestoreMode = !!householdId
        │
        ├─ householdId 있음 ──► Firestore addTransactionFS()
        │                             │
        │                    onSnapshot 실시간 구독
        │                             │
        │                             ▼
        │                   파트너 기기도 즉시 반영 ✅
        │
        └─ householdId 없음 ──► AsyncStorage 로컬 저장
                                   (단독 사용 / 오프라인 모드)

[ProfileContext]
  이름·성별·예산·카드
        │
        │ AsyncStorage '@baebae_profile'
        │
        ├──► [HomeScreen]  잔액 = 예산 - 지출합계
        └──► [MyPageScreen]  프로필 표시·수정

[AuthContext]
  user · isOnboarded · householdId · householdName
        │
        │ signIn() → syncUser() → Firestore users/{id}
        │ setHouseholdId() → AsyncStorage HOUSEHOLD_ID_KEY
        └──► AppNavigator: user+isOnboarded → MainTabs
                           user+!isOnboarded → 온보딩
                           !user → 로그인
```

---

### Firestore ERD

```
┌─────────────────────────────────┐
│  users/{userId}                 │
├─────────────────────────────────┤
│  PK  id (document path)         │
│      name         : string      │
│      gender       : male|female │
│  FK  householdId  : string|null │──────────┐
│      inviteCode   : string      │          │
│      createdAt    : Timestamp   │          │
└─────────────────────────────────┘          │
          │ (memberIds 배열로 역참조)          │
          │                                  ▼
          │          ┌──────────────────────────────────┐
          │          │  households/{householdId}         │
          │          ├──────────────────────────────────┤
          │          │  PK  id (document path)          │
          └─────────►│      memberIds : string[]        │
  (최대 2명)         │      name      : string          │
                     │      createdAt : Timestamp       │
                     └──────────────┬───────────────────┘
                                    │ 1 : N (서브컬렉션)
                                    ▼
                     ┌──────────────────────────────────┐
                     │  transactions/{txId}              │
                     │  (subcollection of households)    │
                     ├──────────────────────────────────┤
                     │  PK  id          : string        │
                     │      type        : expense|income│
                     │      category    : string        │
                     │      categoryKey : string        │
                     │      amount      : number        │
                     │      memo        : string        │
                     │      date        : YYYY-MM-DD    │
                     │      time        : 아침|점심|저녁 │
                     │      person      : string        │
                     │      payMethod   : cash|card     │
                     │      cardName?   : string        │
                     │      photoUri?   : string        │
                     │      createdAt   : ISO string    │
                     └──────────────────────────────────┘
```

**관계 요약**

| 관계 | 카디널리티 | 연결 방법 |
|------|-----------|----------|
| user → household | N:1 | `users.householdId` |
| household → users | 1:N (최대 2) | `households.memberIds[]` |
| household → transactions | 1:N | Firestore 서브컬렉션 |

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
    │   ├── PhotoViewerModal.tsx  ✅ 사진 전체화면 뷰어
    │   └── WheelPicker.tsx      ✅ 공유 휠피커 (3개 화면에서 사용)
    ├── config/
    │   ├── categoryIcons.ts
    │   └── firebase.ts              ✅ Firebase app + Firestore 초기화
    ├── services/
    │   └── firestoreService.ts      ✅ Firestore CRUD + 실시간 구독
    ├── context/            전역 상태
    │   ├── AuthContext.tsx         ✅ 완성
    │   ├── TransactionContext.tsx  ✅ 완성
    │   └── ProfileContext.tsx      ✅ 완성 (Phase 1)
    ├── navigation/
    │   ├── AppNavigator.tsx
    │   └── navigationRef.ts     ✅ 순환참조 방지용 ref 분리
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
        ├── colors.ts               ✅ 완성 (unused yellow 제거됨)
        └── commonStyles.ts         🔲 Phase 4 (공통 스타일)
```

---

## 현재 상태 요약

| 구분 | 완성도 | 비고 |
|------|--------|------|
| UI/UX 디자인 | 98% | 모든 화면 구현 완료, 성별 활성/비활성 처리, Pencil 싱크 |
| 데이터 저장 | 95% | Firestore + AsyncStorage 이중 지원, CSV 내보내기 완료 |
| 백엔드 연동 | 90% | Firebase Auth + Firestore 연동 완료, 푸시알림 남음 |
| 커플 동기화 | 90% | 초대코드·가계 연결·실시간 onSnapshot·Firebase Auth 완료 |
| 코드 품질 | 90% | 불필요 파일 제거, WheelPicker 추출, 중복 코드 정리 완료 |
| 버그 수정 | 95% | 네비게이션·로그아웃·키보드·예산 버그 해결 |
| 배포 준비 | 0% | EAS Build + 스토어 제출 필요 |

### 화면별 구현 상태

| 화면 | UI | 데이터 | 저장 | 비고 |
|------|-----|--------|------|------|
| LoginScreen | ✅ | ✅ | ✅ | Google OAuth 코드 완성 (EAS Build 후 실 테스트 필요) |
| CoupleIconScreen | ✅ | ✅ | ✅ | ProfileContext 성별 저장 |
| ProfileSetupScreen | ✅ | ✅ | ✅ | ProfileContext 이름/성별 저장 |
| InviteCodeScreen | ✅ | ✅ | ✅ | 랜덤 코드 생성·저장·Firestore 연결 |
| HouseholdNameScreen | ✅ | ✅ | ✅ | Firestore household 생성 + completeOnboarding |
| HomeScreen | ✅ | ✅ | ✅ | TransactionContext 저장 완료 |
| HistoryScreen | ✅ | ✅ | ✅ | 실제 데이터 연동 + 삭제 작동 |
| CalendarScreen | ✅ | ✅ | ✅ | 실제 데이터 연동 + 삭제 작동 |
| StatisticsScreen | ✅ | ✅ | ✅ | 실제 집계 연동 |
| MyPageScreen | ✅ | ✅ | ✅ | ProfileContext 연동 완료 |

### 잔여 하드코딩 제거 대상

- ~~부부 이름 `민지 & 준호`~~ ✅ ProfileContext myName/myGender 연동 완료
- ~~초대코드 `'BF-2847-XK'`~~ ✅ 랜덤 생성 + AsyncStorage + Firestore 저장 완료
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

## Phase 2 — 온보딩 플로우 완성 ✅ 완료

> **목표**: 회원가입부터 가계 설정까지 흐름 완성
> **완료일**: 2026-03-17

### 2-1. 온보딩 데이터 저장 ✅

- CoupleIconScreen → `setMyGender(selected)` → ProfileContext 저장
- ProfileSetupScreen → `setMyName(name)` + `setMyGender(gender)` → ProfileContext 저장
- HouseholdNameScreen → `setHouseholdName()` + Firestore household 생성
- RenameHouseholdScreen → AuthContext + Firestore 실시간 반영 (Phase 1에서 완료)

### 2-2. 초대코드 로직 ✅

- 앱 설치 후 랜덤 코드 생성: `AB-1234-XY` 형식 (대문자 2 + 숫자 4 + 대문자 2)
- AsyncStorage `@baebae_invite_code` 저장
- Firestore `users/{id}.inviteCode` 동기화 (syncUser 호출 시)
- Phase 3에서 실제 Firestore 조회로 커플 연결 완성

### 2-3. 온보딩 완료 플래그 ✅

- `completeOnboarding()` → AsyncStorage `@baebae_onboarded: true`
- AppNavigator: `user && isOnboarded` → MainTabs 자동 라우팅 (navigate 불필요)
- 앱 재시작 시 온보딩 스킵 → 바로 메인 탭

### 2-4. 예산 설정 ✅

- MyPage 예산 수정 바텀시트 → ProfileContext 저장 (Phase 1에서 완료)
- HomeScreen 잔액 = 예산 - 이번달 실제 지출

---

## Phase 3 — 백엔드 연동 (커플 실시간 동기화) ✅ 대부분 완료

> **목표**: 두 기기에서 데이터 실시간 공유
> **시작일**: 2026-03-17
> **스택**: Firebase JS SDK (Expo Go 호환) — `firebase/app`, `firebase/firestore`

### Firebase 선택 이유

| 항목 | 설명 |
|------|------|
| Firestore | 실시간 DB — 한 명 입력 시 상대방 즉시 반영 |
| Firebase Auth | Google 로그인 연동 간단 |
| 비용 | 개인 프로젝트 규모는 무료 |
| Expo 호환 | JS SDK → Expo Go에서 즉시 사용 가능 |

### 3-1. Firebase 설정 ✅

- `src/config/firebase.ts` 생성 — Firebase app + Firestore 인스턴스 초기화
- Firebase 프로젝트: `baebae-3cbbc`
- JS SDK 사용 (`firebase` npm 패키지) — Expo Go 호환, EAS 불필요

### 3-2. Firestore 데이터 구조 ✅

```
users/{userId}
  name: string
  gender: 'male' | 'female'
  householdId: string | null
  inviteCode: string          ← 랜덤 생성 코드 (AB-1234-XY)
  createdAt: Timestamp

households/{householdId}
  name: string
  memberIds: string[]         ← [userId_A, userId_B]
  createdAt: Timestamp

households/{householdId}/transactions/{txId}
  (Transaction 타입 전체 필드)
```

### 3-3. 커플 연결 ✅

- 로그인 시 `syncUser()` → Firestore `users/{id}` 생성/업데이트, 기존 householdId 복원
- 초대코드 입력 → `joinHouseholdByCode()` → `users` 컬렉션에서 `inviteCode` 쿼리 → household 합류
- 연결 성공 시 `setHouseholdId(hId)` → AsyncStorage + Context 동시 저장

### 3-4. 실시간 동기화 ✅

- `TransactionContext`: `householdId` 있으면 `subscribeTransactions()` → `onSnapshot` 구독
- `unsubscribeRef` (useRef)로 cleanup 관리
- 로컬 데이터 → Firestore 자동 마이그레이션 (최초 1회, `@baebae_migrated` 플래그)
- 한 명이 추가/수정/삭제 → 상대방 화면 자동 업데이트

### 3-5. Google Login → Firebase Auth 연동 ✅

- `firebase/auth` `initializeAuth` + `getReactNativePersistence(AsyncStorage)` — 세션 영속화
- `expo-auth-session` Google 토큰 → `signInWithCredential(GoogleAuthProvider.credential)` → Firebase UID 사용
- `onAuthStateChanged` — 앱 재시작 시 Firebase 세션 자동 복원
- `signOut` — Firebase Auth + AsyncStorage 동시 초기화
- Google Cloud Console: baebae 프로젝트 OAuth 동의화면 설정 + 테스트 사용자 등록 완료
- Firestore Rules 임시 `allow read, write: if true` (배포 전 인증 기반으로 교체 필요)

### 3-6. 푸시 알림 🔲

```
npx expo install expo-notifications
```

- 파트너가 지출 입력 시 → 알림 전송
- "준호가 스타벅스에서 6,500원 지출했어요 ☕"
- EAS Build + FCM 설정 필요

### 3-7. CSV/Excel 내보내기 ✅

- `expo-file-system` (v2 File/Paths API) + `expo-sharing` 설치 완료
- MyPage → "내역 내보내기 (CSV)" 메뉴 추가
- 연도 선택 (3개년) → CSV 생성 (BOM 포함, Excel 한글 호환) → 공유 시트
- 카테고리 한국어 변환, 날짜순 정렬

---

## Phase 4 — 완성도 향상 🔄 진행 중

> **목표**: 사용성 개선, 버그 수정, 코드 정리
> **시작일**: 2026-03-19

### 버그 수정 (2026-03-19 완료)

- [x] GO_BACK 네비게이션 에러 — navigationRef 분리 + useEffect 기반 reset dispatch
- [x] CoupleIconScreen 뒤로가기 → Login 화면으로 복귀 (signOut + reset)
- [x] 로그아웃 시 데이터 완전 초기화 (AsyncStorage 12개 키 + DataProviders key 리마운트)
- [x] InviteCode 키보드 겹침 (Galaxy/Android) — KeyboardAvoidingView behavior="padding"
- [x] HouseholdName "연결 성공" 항상 표시 → isConnected 파라미터로 조건부 분기
- [x] 예산 기본값 0으로 변경, 0으로 설정 가능하도록 수정
- [x] "이번달 초과" 메시지 — budget > 0 && monthlyExpense > budget 조건 추가
- [x] 하드코딩 날짜 `new Date(2026, 2, 14)` → `new Date()` 동적 처리
- [x] 성별 선택 시 아바타 활성/비활성 표시 (CoupleIcon, ProfileSetup, HouseholdName)
- [x] HouseholdName에 gender 파라미터 전달 — 내 성별 아바타 활성화, 상대방 비활성화

### 코드 정리 (2026-03-19 완료)

- [x] 불필요 파일 삭제 — `Won.tsx`, `responsive.ts`
- [x] 미사용 색상 제거 — `colors.ts`에서 `yellow` 삭제
- [x] WheelPicker 공통 컴포넌트 추출 — Calendar, History, Statistics 3개 화면 중복 제거
- [x] CalendarScreen 깨진 import 순서 수정 (코드 뒤에 import 배치되어 있던 문제)
- [x] 미사용 import 정리 — useEffect, useRef 등 불필요 import 제거
- [x] 중복 wheel 스타일 제거 — 3개 화면의 StyleSheet에서 wheel 관련 스타일 제거
- [x] MyPage "파트너 초대" → PartnerInvite 라우트명으로 변경 (스택 충돌 방지)

### UX 개선

- [x] 예산 초과 시 경고 UI ("이번달 초과" 뱃지)
- [ ] 빈 상태 UI — 거래 없을 때 "아직 기록이 없어요" 화면
- [ ] 거래 저장 성공 피드백 (토스트 or 햅틱)
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
  AuthContext.tsx          ✅ 완성 — Google 로그인 + isOnboarded + householdId + signOut
                                     signIn() → syncUser() → Firestore users/{id}
  TransactionContext.tsx   ✅ 완성 — Firestore onSnapshot 실시간 구독 + AsyncStorage 로컬 폴백
                                     householdId 있으면 Firestore 모드, 없으면 로컬 모드
  ProfileContext.tsx        ✅ 완성 — myName + myGender + 예산 + 카드 목록 AsyncStorage

src/services/
  firestoreService.ts      ✅ 완성 — syncUser / createHousehold / joinHouseholdByCode
                                     addTransactionFS / updateTransactionFS / deleteTransactionFS
                                     subscribeTransactions / migrateLocalToFirestore

src/config/
  firebase.ts              ✅ 완성 — Firebase JS SDK 초기화 (baebae-3cbbc 프로젝트)
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
- ✅ Google 로그인 → Firebase Auth 연동 완료 (expo-auth-session + signInWithCredential)

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
- ✅ StatisticsScreen 도넛형/막대형 차트 토글 추가 (세그먼트 컨트롤)
- ✅ StatisticsScreen 막대형 차트 구현 — 최근 6개월 월별 지출, 현재달 초록 강조
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

### Phase 2 — 온보딩 플로우 ✅ 완료

- ✅ CoupleIconScreen 아이콘 선택 → ProfileContext `myGender` 저장
- ✅ ProfileSetupScreen 이름/성별 → ProfileContext `myName` + `myGender` 저장
- ✅ HouseholdNameScreen 가계명 → AuthContext + Firestore household 생성
- ✅ RenameHouseholdScreen 가계명 수정 저장 (Phase 1에서 완료)
- ✅ 초대코드 랜덤 생성 (`AB-1234-XY`) + AsyncStorage 저장
- ✅ 온보딩 완료 플래그 (`@baebae_onboarded`) → 재시작 시 스킵
- ✅ 로그아웃 실제 동작 (`signOut` → user/onboarded/householdId 초기화)
- ✅ AppNavigator 3분기 조건 라우팅 (로그인+온보딩/로그인+온보딩미완/미로그인)

---

### Phase 3 — Firebase 연동 (커플 동기화 + 클라우드 백업)

- ✅ Firebase JS SDK 설치 + `src/config/firebase.ts` 생성
- ✅ Firestore 컬렉션 구조 구현 (users / households / households/{id}/transactions)
- ✅ `src/services/firestoreService.ts` — 전체 CRUD + 구독 함수
- ✅ 초대코드 → Firestore 커플 연결 (`joinHouseholdByCode`)
- ✅ TransactionContext Firestore 모드 추가 (householdId 유무로 자동 전환)
- ✅ 거래 내역 실시간 동기화 (`onSnapshot` + `unsubscribeRef`)
- ✅ 로컬 데이터 → Firestore 자동 마이그레이션 (최초 1회)
- ✅ 오프라인 폴백 — Firestore 실패 시 로컬 모드 유지
- ✅ Google 로그인 → Firebase Auth 연동 (`signInWithCredential` + `onAuthStateChanged`)
- ✅ **거래 내역 CSV 내보내기** (`expo-file-system` + `expo-sharing`) — 연도별, 공유 시트
- 🔲 파트너 지출 시 푸시 알림 (`expo-notifications` + FCM — EAS Build 필요)
- ⚠️ Firestore Rules 임시 `allow read, write: if true` → 배포 전 인증 기반으로 교체 필수

---

### Phase 4 — 완성도 / 배포

#### ✅ 완료 (2026-03-19)

- ✅ 네비게이션 버그 전면 수정 (GO_BACK, CoupleIcon 뒤로가기, 스택 충돌)
- ✅ 로그아웃 시 전체 데이터 초기화 (AsyncStorage 12개 키 + Context 리마운트)
- ✅ 키보드 겹침 수정 (InviteCode Galaxy)
- ✅ 예산 0 설정 허용 + 초과 경고 UI
- ✅ 성별 기반 아바타 활성/비활성 (CoupleIcon, ProfileSetup, HouseholdName)
- ✅ 코드 정리 — 불필요 파일 삭제, WheelPicker 추출, 중복 제거, import 정리
- ✅ Pencil 디자인 싱크 (mOeDR 커플아바타, A6OHm 미연결 뱃지)

#### 🔲 미완료

- 🔲 공통 스타일 분리 (`src/theme/commonStyles.ts`)
- 🔲 거래 저장 성공 햅틱/토스트 피드백
- 🔲 거래 수정 기능 (HomeScreen 수정 모드)
- 🔲 거래 검색 기능 (HistoryScreen)
- 🔲 월간 리포트 — "이번 달 식비가 지난달보다 23% 늘었어요"
- 🔲 다크모드 대응
- 🚫 Google 로그인 개발 우회 버튼 제거 (배포 전 필수 — `__DEV__` 라 자동 제외됨)
- 🔲 EAS Build Android / iOS 배포 설정
- 🔲 App Store / Play Store 제출

---

## Phase 5 — 프로덕션 배포

> **목표**: App Store / Play Store 배포 후 실제 사용자 공유

### 배포 전 필수 체크리스트

| 항목 | 상태 | 작업 내용 |
|------|------|----------|
| Firestore Rules 교체 | 🚫 필수 | `allow read, write: if true` → 인증 기반 rules로 교체 |
| Google OAuth 동의화면 게시 | 🚫 필수 | 테스트 → 프로덕션 게시 (Google 검수 약 1주) |
| Android Client ID 추가 | 🚫 필수 | EAS Build 후 SHA-1 지문으로 Android OAuth 클라이언트 생성 |
| 개발 우회 버튼 | ✅ 자동 | `__DEV__` 조건부라 프로덕션 빌드에서 자동 제거됨 |
| 앱 아이콘 / 스플래시 | ✅ 완료 | assets/ 설정 완료 |

---

### Step 1 — EAS CLI 설치 및 설정

```bash
npm install -g eas-cli
eas login                     # Expo 계정 로그인
eas build:configure           # eas.json 자동 생성
```

---

### Step 2 — Android 빌드 (APK / AAB)

```bash
# 테스트용 APK (내부 배포)
eas build --platform android --profile preview

# Play Store 제출용 AAB
eas build --platform android --profile production
```

빌드 완료 후 → **SHA-1 지문** 확인:
```bash
eas credentials
```
→ Google Cloud Console → baebae 프로젝트 → 클라이언트 → Android 클라이언트 추가 → SHA-1 입력
→ `LoginScreen.tsx`의 `androidClientId` 값 업데이트

---

### Step 3 — iOS 빌드

```bash
eas build --platform ios --profile production
```

- Apple Developer Program 가입 필요 ($99/년)
- `app.json`의 `bundleIdentifier: "com.baebae.app"` 사용

---

### Step 4 — Firestore Rules 교체 (배포 직전)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /households/{householdId} {
      allow read, write: if request.auth != null
        && request.auth.uid in resource.data.memberIds;
      match /transactions/{txId} {
        allow read, write: if request.auth != null
          && request.auth.uid in get(/databases/$(database)/documents/households/$(householdId)).data.memberIds;
      }
    }
  }
}
```

---

### Step 5 — Google OAuth 동의화면 게시

Google Cloud Console → baebae → 대상 → **앱 게시** 클릭
→ Google 검수 신청 (약 1~7일 소요)
→ 검수 완료 전까지는 테스트 사용자만 로그인 가능

---

### Step 6 — 스토어 제출

**Android (Play Store)**
```bash
eas submit --platform android
```
- Google Play Console 계정 필요 ($25 일회성)
- AAB 파일 업로드 → 내부 테스트 → 프로덕션

**iOS (App Store)**
```bash
eas submit --platform ios
```
- App Store Connect 업로드
- Apple 심사 약 1~3일 소요

---

### 비용 요약

| 항목 | 비용 |
|------|------|
| Apple Developer Program | $99/년 (₩135,000) |
| Google Play Console | $25 일회성 (₩34,000) |
| Firebase (Firestore) | 무료 (Spark 플랜 — 소규모 충분) |
| EAS Build | 무료 (월 30빌드) |

---

## Google Client ID 설정 (필수)

로그인이 실제 작동하려면 아래 설정 필요:

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. APIs & Services → Credentials → OAuth 2.0 Client IDs
3. Android / iOS / Web 3개 생성
4. `src/screens/LoginScreen.tsx` 19~23번째 줄 ID 입력

```ts
const GOOGLE_CLIENT_IDS = {
  androidClientId: '476537137658-qublbd9a0nvq76j5hi472gi42qt4oqr9.apps.googleusercontent.com',
  iosClientId:     '476537137658-iko16ukbpt14to4ot4enkeotbrlrjbtn.apps.googleusercontent.com',
  webClientId:     '476537137658-v8a134ljp7fkkgivbpg1vk2bg58vltb0.apps.googleusercontent.com',
};
```
