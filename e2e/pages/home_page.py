"""
HomePage — 홈 탭 (거래 입력 폼)
앱 구조: 홈 탭 자체가 거래 등록 폼 (별도 '추가' 버튼 없음)
"""

import time
import allure
from .base_page import BasePage


class HomePage(BasePage):

    @allure.step('홈 탭 진입 확인')
    def is_loaded(self) -> bool:
        """홈 화면이 로드됐는지 확인 (시간대 버튼 노출 여부로 판단)"""
        for label in ['아침', '점심', '저녁']:
            if self.is_text_present(label, timeout=5):
                return True
        return False

    @allure.step('시간대 선택: {time_label}')
    def select_time_slot(self, time_label: str = '점심'):
        self.wait_text(time_label).click()
        time.sleep(0.3)

    @allure.step('거래 유형 선택: {tx_type}')
    def select_type(self, tx_type: str = '지출'):
        """지출 또는 수입 탭 클릭"""
        self.wait_text(tx_type).click()
        time.sleep(0.3)

    @allure.step('금액 입력: {amount}원')
    def enter_amount(self, amount: str):
        """금액 필드(첫 번째 EditText) 클릭 → 재탐색 → 입력"""
        self.get_edittext(0).click()
        time.sleep(0.3)
        self.get_edittext(0).send_keys(amount)
        self.driver.hide_keyboard()
        time.sleep(0.3)

    @allure.step('카테고리 선택: {category}')
    def select_category(self, category: str):
        """카테고리 버튼 → 피커 오픈 → 항목 선택"""
        self.wait_text('카테고리').click()
        time.sleep(0.8)
        self.wait_text(category).click()
        time.sleep(0.5)

    @allure.step('메모 입력: {memo}')
    def enter_memo(self, memo: str):
        """메모 필드(두 번째 EditText) 입력 — 한글 미지원으로 영문 사용"""
        self.get_edittext(1).send_keys(memo)
        self.driver.hide_keyboard()
        time.sleep(0.3)

    @allure.step('저장하기')
    def save(self):
        self.wait_text('저장하기').click()
        time.sleep(0.5)
        self.confirm_dialog()
        time.sleep(1)
