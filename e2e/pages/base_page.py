"""
BasePage — 모든 Page Object가 상속하는 공통 헬퍼
"""

import time
from appium.webdriver.common.appiumby import AppiumBy


class BasePage:
    def __init__(self, driver):
        self.driver = driver

    # ── 요소 탐색 ─────────────────────────────────────────────

    def wait_text(self, text: str, timeout: int = 10):
        """텍스트 정확히 일치하는 요소 대기 후 반환"""
        end = time.time() + timeout
        while time.time() < end:
            try:
                el = self.driver.find_element(
                    AppiumBy.ANDROID_UIAUTOMATOR,
                    f'new UiSelector().text("{text}")')
                if el.is_displayed():
                    return el
            except Exception:
                pass
            time.sleep(0.5)
        raise TimeoutError(f'요소 없음 (텍스트): {text}')

    def wait_text_contains(self, text: str, timeout: int = 10):
        """텍스트 부분 포함하는 요소 대기 후 반환"""
        end = time.time() + timeout
        while time.time() < end:
            try:
                el = self.driver.find_element(
                    AppiumBy.ANDROID_UIAUTOMATOR,
                    f'new UiSelector().textContains("{text}")')
                if el.is_displayed():
                    return el
            except Exception:
                pass
            time.sleep(0.5)
        raise TimeoutError(f'요소 없음 (포함 텍스트): {text}')

    def is_text_present(self, text: str, timeout: int = 5) -> bool:
        """텍스트가 화면에 존재하면 True, 없으면 False"""
        try:
            self.wait_text(text, timeout=timeout)
            return True
        except TimeoutError:
            return False

    def get_edittext(self, index: int = 0, timeout: int = 10):
        """n번째 EditText 반환 (0 = 금액, 1 = 메모)"""
        end = time.time() + timeout
        while time.time() < end:
            try:
                els = self.driver.find_elements(
                    AppiumBy.CLASS_NAME, 'android.widget.EditText')
                if len(els) > index:
                    return els[index]
            except Exception:
                pass
            time.sleep(0.5)
        raise TimeoutError(f'EditText[{index}] 없음')

    # ── 공통 동작 ─────────────────────────────────────────────

    def confirm_dialog(self, timeout: int = 5):
        """AlertDialog 확인 버튼 클릭 (android:id/button1 → '확인' 텍스트 순)"""
        try:
            self.driver.find_element(AppiumBy.ID, 'android:id/button1').click()
        except Exception:
            self.wait_text('확인', timeout=timeout).click()
