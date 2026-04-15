"""
HistoryPage — 내역 탭 (거래 목록 + 상세/수정/삭제)

testID 매핑 (HistoryScreen.tsx 기준):
  탭 이동          : accessibilityLabel='내역'  (AppNavigator.tsx)
  거래 행          : history-btn-tx-{tx.id}
  필터 버튼        : history-btn-filter
  수정 버튼        : btn-edit-tx
  삭제 버튼        : btn-delete-tx
  전체/지출/수입   : history-btn-type-{f}
  이전/다음 월     : history-btn-month-prev / history-btn-month-next
  필터 적용        : history-btn-filter-confirm
"""

import time
import allure
from appium.webdriver.common.appiumby import AppiumBy
from .base_page import BasePage


class HistoryPage(BasePage):

    # ── 탭 이동 ───────────────────────────────────────────────

    @allure.step('내역 탭으로 이동')
    def navigate(self):
        # AppNavigator.tsx에 accessibilityLabel='내역' 추가됨
        # → OTA 배포 후 ACCESSIBILITY_ID로 안정적으로 탐색
        try:
            self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, '내역').click()
            self.wait_text('거래 내역', timeout=5)
            return
        except Exception:
            pass

        # Fallback: 탭바 버튼 동적 탐색
        # (OTA 미배포 시 content-desc="" → 가장 아래 클릭 가능 요소 그룹에서 2번째)
        all_clickable = self.driver.find_elements(
            AppiumBy.ANDROID_UIAUTOMATOR,
            'new UiSelector().clickable(true)'
        )
        if not all_clickable:
            raise TimeoutError('클릭 가능한 요소를 찾을 수 없음')

        max_y = max(e.location['y'] for e in all_clickable)
        tab_buttons = sorted(
            [e for e in all_clickable if abs(e.location['y'] - max_y) <= 80],
            key=lambda e: e.location['x']
        )
        if len(tab_buttons) >= 2:
            tab_buttons[1].click()
            self.wait_text('거래 내역', timeout=8)
            return

        raise TimeoutError(
            f'내역 탭 이동 실패 — 탭바 후보 {len(tab_buttons)}개 발견 (최하단 y={max_y})'
        )

    # ── 목록 검증 ─────────────────────────────────────────────

    @allure.step('금액 "{amount}" 항목 존재 여부 확인')
    def has_amount(self, amount: str) -> bool:
        # 실제 표시: "-₩10,000" 또는 "+₩10,000" → 부분 일치로 탐색
        try:
            self.wait_text_contains(amount, timeout=8)
            return True
        except TimeoutError:
            return False

    @allure.step('메모 "{memo}" 항목 존재 여부 확인')
    def has_memo(self, memo: str) -> bool:
        return self.is_text_present(memo, timeout=8)

    # ── 항목 선택 ─────────────────────────────────────────────

    @allure.step('"{memo}" 항목 클릭')
    def click_item(self, memo: str):
        self.wait_text(memo).click()
        time.sleep(1)

    # ── 수정 ──────────────────────────────────────────────────

    @allure.step('수정 버튼 클릭 (testID: btn-edit-tx)')
    def click_edit(self):
        try:
            self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, 'btn-edit-tx').click()
        except Exception:
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

    # ── 삭제 ──────────────────────────────────────────────────

    @allure.step('삭제 버튼 클릭 후 확인 (testID: btn-delete-tx)')
    def delete_item(self):
        try:
            self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, 'btn-delete-tx').click()
        except Exception:
            self.wait_text('삭제').click()
        time.sleep(0.5)
        self.confirm_dialog()
        time.sleep(1)
