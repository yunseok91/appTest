"""
HistoryPage — 내역 탭 (거래 목록 + 상세/수정/삭제)
"""

import time
import allure
from .base_page import BasePage


class HistoryPage(BasePage):

    @allure.step('내역 탭으로 이동')
    def navigate(self):
        from appium.webdriver.common.appiumby import AppiumBy

        # 1순위: accessibilityLabel 기반 (AppNavigator에 label 추가 후 OTA 배포 시 동작)
        try:
            self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, '내역').click()
            self.wait_text('거래 내역', timeout=5)
            return
        except Exception:
            pass

        # 2순위: 좌표 기반 (탭바 텍스트 없는 경우 fallback)
        # 5개 탭 중 2번째(내역) x 중앙 = 화면너비 / 5 * 1.5
        # y는 디바이스마다 달라 여러 비율 시도
        size = self.driver.get_window_size()
        w, h = size['width'], size['height']
        x = int(w / 5 * 1.5)

        for y_ratio in [0.97, 0.95, 0.93, 0.90]:
            self.driver.tap([(x, int(h * y_ratio))])
            time.sleep(0.5)
            if self.is_text_present('거래 내역', timeout=3):
                return

        raise TimeoutError('내역 탭 이동 실패 — 화면에서 "거래 내역" 헤더를 찾을 수 없음')

    @allure.step('금액 "{amount}" 항목 존재 여부 반환')
    def has_amount(self, amount: str) -> bool:
        """amount 문자열(예: "10,000")이 목록에 있으면 True"""
        return self.is_text_present(amount, timeout=8)

    @allure.step('메모 "{memo}" 항목 존재 여부 반환')
    def has_memo(self, memo: str) -> bool:
        return self.is_text_present(memo, timeout=8)

    @allure.step('"{memo}" 항목 클릭')
    def click_item(self, memo: str):
        self.wait_text(memo).click()
        time.sleep(1)

    @allure.step('수정 버튼 클릭')
    def click_edit(self):
        self.wait_text('수정').click()
        time.sleep(1)

    @allure.step('금액 수정: {new_amount}원')
    def update_amount(self, new_amount: str):
        field = self.get_edittext(0)
        field.clear()
        field.send_keys(new_amount)
        self.driver.hide_keyboard()
        time.sleep(0.3)
        try:
            self.wait_text('저장하기', timeout=3).click()
        except TimeoutError:
            self.wait_text('저장').click()
        time.sleep(0.5)
        self.confirm_dialog()
        time.sleep(1)

    @allure.step('삭제 버튼 클릭 후 확인')
    def delete_item(self):
        self.wait_text('삭제').click()
        time.sleep(0.5)
        self.confirm_dialog()
        time.sleep(1)
