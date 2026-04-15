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

        # 1순위: accessibilityLabel 기반 (AppNavigator에 accessibilityLabel 추가 후 OTA 시 동작)
        try:
            self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, '내역').click()
            self.wait_text('거래 내역', timeout=5)
            return
        except Exception:
            pass

        # 2순위: 탭바 버튼 동적 탐색
        # — 탭바 아이콘은 content-desc="" 이라 텍스트/ID 탐색 불가
        # — 화면에서 클릭 가능한 요소 중 y좌표가 가장 아래에 몰려있는 그룹 = 탭바
        all_clickable = self.driver.find_elements(
            AppiumBy.ANDROID_UIAUTOMATOR,
            'new UiSelector().clickable(true)'
        )

        if not all_clickable:
            raise TimeoutError('클릭 가능한 요소를 찾을 수 없음')

        # 가장 아래쪽 y 기준으로 ±80px 범위 = 탭바 행
        max_y = max(e.location['y'] for e in all_clickable)
        tab_buttons = sorted(
            [e for e in all_clickable if abs(e.location['y'] - max_y) <= 80],
            key=lambda e: e.location['x']
        )

        # 5개 탭 중 2번째(내역) 클릭
        if len(tab_buttons) >= 2:
            tab_buttons[1].click()
            self.wait_text('거래 내역', timeout=8)
            return

        raise TimeoutError(
            f'내역 탭 이동 실패 — 탭바 후보 요소 {len(tab_buttons)}개 발견 '
            f'(최하단 y={max_y})'
        )

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
