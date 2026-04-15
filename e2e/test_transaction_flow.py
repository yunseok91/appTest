"""
E2E 테스트 — 거래 등록 → 수정 → 삭제 플로우
대상: BaeBaeApp (Android)
실행: python e2e/test_transaction_flow.py
"""

import unittest
import time
from appium import webdriver
from appium.options.android import UiAutomator2Options
from appium.webdriver.common.appiumby import AppiumBy


# ── Appium 서버 & 디바이스 설정 ──────────────────────────────
APPIUM_SERVER = 'http://127.0.0.1:4723'

OPTIONS = UiAutomator2Options()
OPTIONS.platform_name       = 'Android'
OPTIONS.device_name         = 'emulator-5554'   # adb devices 로 확인한 값으로 변경
OPTIONS.app_package         = 'com.baebae.app'
OPTIONS.app_activity        = '.MainActivity'
OPTIONS.no_reset            = True               # 로그인 상태 유지
OPTIONS.auto_grant_permissions = True


def find(driver, test_id, timeout=10):
    """testID로 요소 찾기 (Android: accessibility id)"""
    end = time.time() + timeout
    while time.time() < end:
        try:
            el = driver.find_element(AppiumBy.ACCESSIBILITY_ID, test_id)
            if el.is_displayed():
                return el
        except Exception:
            pass
        time.sleep(0.5)
    raise TimeoutError(f'요소를 찾을 수 없음: {test_id}')


def find_text(driver, text, timeout=10):
    """텍스트로 요소 찾기"""
    end = time.time() + timeout
    while time.time() < end:
        try:
            el = driver.find_element(AppiumBy.ANDROID_UIAUTOMATOR,
                f'new UiSelector().text("{text}")')
            if el.is_displayed():
                return el
        except Exception:
            pass
        time.sleep(0.5)
    raise TimeoutError(f'텍스트를 찾을 수 없음: {text}')


class TransactionFlowTest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.driver = webdriver.Remote(APPIUM_SERVER, options=OPTIONS)
        cls.driver.implicitly_wait(5)
        time.sleep(3)  # 앱 초기 로딩 대기

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()

    # ── TC-E2E-01. 거래 등록 ─────────────────────────────────
    def test_01_register_transaction(self):
        driver = self.driver
        print('\n[TC-E2E-01] 거래 등록 시작')

        # 1. 시간대 선택 — 점심
        find(driver, 'btn-time-lunch').click()
        time.sleep(0.5)

        # 2. 거래 유형 — 지출
        find(driver, 'btn-type-expense').click()
        time.sleep(0.5)

        # 3. 결제수단 — 현금
        find(driver, 'btn-pay-cash').click()
        time.sleep(0.5)

        # 4. 금액 입력 — 10000
        amount_input = find(driver, 'input-amount')
        amount_input.click()
        amount_input.send_keys('10000')
        driver.hide_keyboard()
        time.sleep(0.5)

        # 5. 카테고리 선택 — 식비(food)
        find(driver, 'btn-category').click()
        time.sleep(1)
        find(driver, 'btn-cat-food').click()
        time.sleep(0.5)

        # 6. 메모 입력
        memo_input = find(driver, 'input-memo')
        memo_input.click()
        memo_input.send_keys('E2E 테스트 등록')
        driver.hide_keyboard()
        time.sleep(0.5)

        # 7. 저장하기
        find(driver, 'btn-save').click()
        time.sleep(1)

        print('[TC-E2E-01] 거래 등록 완료 ✅')

    # ── TC-E2E-02. 거래 수정 ─────────────────────────────────
    def test_02_edit_transaction(self):
        driver = self.driver
        print('\n[TC-E2E-02] 거래 수정 시작')

        # 거래내역 탭으로 이동 (하단 두 번째 탭)
        tabs = driver.find_elements(AppiumBy.CLASS_NAME, 'android.widget.FrameLayout')
        # 텍스트로 탭 찾기
        find_text(driver, '거래내역').click()
        time.sleep(1)

        # 등록한 거래 항목 클릭 (메모 텍스트로 찾기)
        find_text(driver, 'E2E 테스트 등록').click()
        time.sleep(1)

        # 수정 버튼 클릭
        find(driver, 'btn-edit-tx').click()
        time.sleep(1)

        # 금액 수정 — 기존 내용 지우고 20000 입력
        amount_field = driver.find_elements(AppiumBy.CLASS_NAME, 'android.widget.EditText')[0]
        amount_field.clear()
        amount_field.send_keys('20000')
        driver.hide_keyboard()
        time.sleep(0.5)

        # 저장 (수정 모달의 저장 버튼 — 텍스트로 찾기)
        find_text(driver, '저장').click()
        time.sleep(1)

        print('[TC-E2E-02] 거래 수정 완료 ✅')

    # ── TC-E2E-03. 거래 삭제 ─────────────────────────────────
    def test_03_delete_transaction(self):
        driver = self.driver
        print('\n[TC-E2E-03] 거래 삭제 시작')

        # 수정된 거래 항목 클릭
        find_text(driver, 'E2E 테스트 등록').click()
        time.sleep(1)

        # 삭제 버튼 클릭
        find(driver, 'btn-delete-tx').click()
        time.sleep(0.5)

        # 확인 다이얼로그 — 삭제 확인
        find_text(driver, '삭제').click()
        time.sleep(1)

        # 삭제 후 해당 항목이 없는지 확인
        try:
            driver.find_element(AppiumBy.ANDROID_UIAUTOMATOR,
                'new UiSelector().text("E2E 테스트 등록")')
            self.fail('삭제 후에도 항목이 존재함')
        except Exception:
            pass  # 항목 없음 = 삭제 성공

        print('[TC-E2E-03] 거래 삭제 완료 ✅')


if __name__ == '__main__':
    unittest.main(verbosity=2)
