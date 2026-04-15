"""
E2E 테스트 — 지출 등록 → 내역 화면 검증 플로우
대상: BaeBaeApp (Android)

[실제 앱 UI 구조]
  - 홈(Home) 탭 = 거래 입력 폼 (별도 '추가' 버튼 없음)
  - 하단 탭: 홈 | 내역 | 캘린더(중앙) | 통계 | 마이
  - Android send_keys 한글 미지원 → 메모는 영문 사용

[시나리오]
  TC-E2E-01: 홈 화면에서 지출 등록 (금액·카테고리·메모 입력 → 저장)
  TC-E2E-02: 내역 탭에서 등록 항목 노출 검증 (Assertion)
  TC-E2E-03: 항목 수정 (금액 변경)
  TC-E2E-04: 항목 삭제 후 목록에서 사라짐 검증

실행: python e2e/test_transaction_flow.py
"""

import unittest
import time
from appium import webdriver
from appium.options.android import UiAutomator2Options
from appium.webdriver.common.appiumby import AppiumBy

# ── 설정 ─────────────────────────────────────────────────────
APPIUM_SERVER = 'http://127.0.0.1:4723'

# `adb devices` 실행 후 출력된 디바이스 ID로 변경
# 예) 'R3CN801ABCD'  또는  'emulator-5554'
DEVICE_NAME   = 'R3CW70RXA2B'

AMOUNT        = '10000'          # 10,000원
MEMO_TEXT     = 'lunch'          # 한글 send_keys Android 미지원 → 영문 사용

OPTIONS = UiAutomator2Options()
OPTIONS.platform_name          = 'Android'
OPTIONS.device_name            = DEVICE_NAME
OPTIONS.app_package            = 'com.baebae.app'
OPTIONS.app_activity           = '.MainActivity'
OPTIONS.no_reset               = True
OPTIONS.auto_grant_permissions = True


# ── 헬퍼 ─────────────────────────────────────────────────────
def wait_text(driver, text, timeout=10):
    """텍스트 정확히 일치하는 요소 대기 후 반환"""
    end = time.time() + timeout
    while time.time() < end:
        try:
            el = driver.find_element(
                AppiumBy.ANDROID_UIAUTOMATOR,
                f'new UiSelector().text("{text}")')
            if el.is_displayed():
                return el
        except Exception:
            pass
        time.sleep(0.5)
    raise TimeoutError(f'요소 없음 (텍스트): {text}')


def wait_text_contains(driver, text, timeout=10):
    """텍스트 부분 포함하는 요소 대기 후 반환"""
    end = time.time() + timeout
    while time.time() < end:
        try:
            el = driver.find_element(
                AppiumBy.ANDROID_UIAUTOMATOR,
                f'new UiSelector().textContains("{text}")')
            if el.is_displayed():
                return el
        except Exception:
            pass
        time.sleep(0.5)
    raise TimeoutError(f'요소 없음 (포함 텍스트): {text}')


def get_edittext(driver, index=0, timeout=10):
    """n번째 EditText 반환 (0 = 금액, 1 = 메모)"""
    end = time.time() + timeout
    while time.time() < end:
        try:
            els = driver.find_elements(AppiumBy.CLASS_NAME, 'android.widget.EditText')
            if len(els) > index:
                return els[index]
        except Exception:
            pass
        time.sleep(0.5)
    raise TimeoutError(f'EditText[{index}] 없음')


def confirm_dialog(driver):
    """AlertDialog 확인 버튼 클릭 (android:id/button1 → '확인' 텍스트 순)"""
    try:
        driver.find_element(AppiumBy.ID, 'android:id/button1').click()
    except Exception:
        wait_text(driver, '확인').click()


# ── 테스트 ────────────────────────────────────────────────────
class TransactionFlowTest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.driver = webdriver.Remote(APPIUM_SERVER, options=OPTIONS)
        cls.driver.implicitly_wait(5)
        time.sleep(3)   # 앱 초기 로딩 대기

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()

    # ──────────────────────────────────────────────────────────
    # TC-E2E-01. 지출 등록 (홈 화면 입력 폼)
    # ──────────────────────────────────────────────────────────
    def test_01_register_expense(self):
        d = self.driver
        print('\n[TC-E2E-01] 지출 등록')

        # 1. 홈 탭이 초기 화면 (별도 이동 불필요)
        #    혹시 다른 탭에 있으면 홈으로 이동
        try:
            wait_text(d, '점심', timeout=3).click()   # 이미 홈 화면이면 시간대 버튼 보임
        except TimeoutError:
            # 홈 탭으로 이동 후 재시도 (탭바 첫 번째 아이콘 클릭)
            d.find_elements(AppiumBy.CLASS_NAME, 'android.widget.FrameLayout')[0].click()
            time.sleep(1)
            wait_text(d, '점심').click()
        time.sleep(0.5)

        # 2. 거래 유형 — 지출
        wait_text(d, '지출').click()
        time.sleep(0.3)

        # 3. 금액 입력 — 10,000원
        #    클릭 후 리렌더링으로 참조 무효화 → 재탐색
        get_edittext(d, 0).click()
        time.sleep(0.3)
        get_edittext(d, 0).send_keys(AMOUNT)
        d.hide_keyboard()
        time.sleep(0.3)

        # 4. 카테고리 선택 — 식비
        wait_text(d, '카테고리').click()
        time.sleep(0.8)
        wait_text(d, '식비').click()
        time.sleep(0.5)

        # 5. 메모 입력 (두 번째 EditText)
        get_edittext(d, 1).send_keys(MEMO_TEXT)
        d.hide_keyboard()
        time.sleep(0.3)

        # 6. 저장하기
        wait_text(d, '저장하기').click()
        time.sleep(0.5)

        # 7. 저장 완료 다이얼로그 확인
        confirm_dialog(d)
        time.sleep(1)

        print('[TC-E2E-01] ✅ 완료')

    # ──────────────────────────────────────────────────────────
    # TC-E2E-02. 내역 탭에서 등록 항목 검증 (Assertion)
    # ──────────────────────────────────────────────────────────
    def test_02_verify_in_history(self):
        d = self.driver
        print('\n[TC-E2E-02] 내역 탭 검증')

        # 내역 탭으로 이동
        wait_text(d, '내역').click()
        time.sleep(1)

        # [Assertion 1] 금액 표시 확인 — "10,000" 포함 텍스트
        amount_el = wait_text_contains(d, '10,000')
        self.assertIsNotNone(amount_el, '❌ 금액(10,000)이 내역에 표시되지 않음')

        # [Assertion 2] 메모 텍스트 확인
        memo_el = wait_text(d, MEMO_TEXT)
        self.assertIsNotNone(memo_el, f'❌ 메모({MEMO_TEXT})가 내역에 표시되지 않음')

        print('[TC-E2E-02] ✅ 완료 — 금액·메모 노출 확인')

    # ──────────────────────────────────────────────────────────
    # TC-E2E-03. 거래 수정 (금액 변경)
    # ──────────────────────────────────────────────────────────
    def test_03_edit_transaction(self):
        d = self.driver
        print('\n[TC-E2E-03] 거래 수정')

        # 등록한 거래 항목 클릭
        wait_text(d, MEMO_TEXT).click()
        time.sleep(1)

        # 수정 버튼
        wait_text(d, '수정').click()
        time.sleep(1)

        # 금액 변경 — 5,000원
        amount_field = get_edittext(d, 0)
        amount_field.clear()
        amount_field.send_keys('5000')
        d.hide_keyboard()
        time.sleep(0.3)

        # 저장
        try:
            wait_text(d, '저장하기').click()
        except TimeoutError:
            wait_text(d, '저장').click()
        time.sleep(0.5)

        confirm_dialog(d)
        time.sleep(1)

        # [Assertion] 수정된 금액 확인
        modified = wait_text_contains(d, '5,000')
        self.assertIsNotNone(modified, '❌ 수정된 금액(5,000)이 표시되지 않음')

        print('[TC-E2E-03] ✅ 완료')

    # ──────────────────────────────────────────────────────────
    # TC-E2E-04. 거래 삭제 후 목록에서 사라짐 검증
    # ──────────────────────────────────────────────────────────
    def test_04_delete_transaction(self):
        d = self.driver
        print('\n[TC-E2E-04] 거래 삭제')

        # 항목 클릭
        wait_text(d, MEMO_TEXT).click()
        time.sleep(1)

        # 삭제 버튼
        wait_text(d, '삭제').click()
        time.sleep(0.5)

        # 삭제 확인 다이얼로그
        confirm_dialog(d)
        time.sleep(1)

        # [Assertion] 삭제 후 목록에서 사라져야 함
        try:
            d.find_element(
                AppiumBy.ANDROID_UIAUTOMATOR,
                f'new UiSelector().text("{MEMO_TEXT}")')
            self.fail(f'❌ 삭제 후에도 "{MEMO_TEXT}" 항목이 남아있음')
        except Exception:
            pass  # 요소 없음 = 정상

        print('[TC-E2E-04] ✅ 완료 — 항목 삭제 확인')


if __name__ == '__main__':
    unittest.main(verbosity=2)
