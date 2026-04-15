# BaeBae App — Firebase REST API 테스트 가이드

## 사전 준비

### 1. Firebase 테스트 계정 생성
Firebase Console → Authentication → 사용자 → 사용자 추가
- 이메일: `test@baebae.com`
- 비밀번호: 원하는 값 설정

> 앱은 Google 로그인을 쓰지만, REST API 테스트용으로 이메일 계정을 별도 생성

---

### 2. Postman 환경변수 설정
Postman → Environments → New Environment → `BaeBae API`

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `PROJECT_ID` | `baebae-3cbbc` | Firebase 프로젝트 ID |
| `API_KEY` | `AIzaSyAd9jwhaifbGCXn7EmcwFl_3IKd812sX4Q` | Firebase API 키 |
| `BASE_URL` | `https://firestore.googleapis.com/v1/projects/baebae-3cbbc/databases/(default)/documents` | Firestore 기본 URL |
| `ID_TOKEN` | (자동 입력) | 로그인 후 자동 저장됨 |
| `HOUSEHOLD_ID` | (직접 입력) | Firebase Console에서 확인 |
| `TX_ID` | (자동 입력) | 거래 등록 후 자동 저장됨 |
| `COMMENT_ID` | (자동 입력) | 댓글 등록 후 자동 저장됨 |
| `TEST_EMAIL` | `test@baebae.com` | 테스트 계정 이메일 |
| `TEST_PASSWORD` | (설정한 비밀번호) | 테스트 계정 비밀번호 |

---

### 3. Postman Collection 가져오기
`BaeBae-API-Tests.postman_collection.json` 파일을 Postman에 Import

---

## 컬렉션 구조

```
📁 BaeBae API Tests
  📁 0. 인증
    POST  로그인 — ID Token 발급
  📁 1. 거래 (Transactions)
    GET   거래 목록 조회
    POST  거래 등록
    GET   등록된 거래 단건 조회
    PATCH 거래 수정
    DELETE 거래 삭제
  📁 2. 댓글 (Comments)
    GET   댓글 목록 조회
    POST  댓글 등록
    PATCH 댓글 수정
    DELETE 댓글 삭제
  📁 3. 유저 (Users)
    GET   유저 정보 조회
```

---

## 실행 순서

1. `0. 인증 > 로그인` 실행 → ID_TOKEN 자동 저장
2. `1. 거래 > 거래 등록` 실행 → TX_ID 자동 저장
3. 이후 나머지 순서대로 실행

또는 **Collection Runner**로 전체 순서 실행 가능

---

## Newman으로 CLI 실행

```bash
# Newman 설치
npm install -g newman newman-reporter-htmlextra

# 실행 + HTML 리포트 생성
newman run BaeBae-API-Tests.postman_collection.json \
  --environment BaeBae-API.postman_environment.json \
  --reporters htmlextra \
  --reporter-htmlextra-export ./test-report.html
```

---

## 포폴 활용 방법

- Postman 컬렉션 스크린샷 → 슬라이드에 삽입
- Newman HTML 리포트 → "TC X개, 통과율 100%" 표시
- 버그 재현 TC (댓글 id 누락 버그) → 수정 전/후 비교
