"""
HomePage — 홈 탭 (거래 입력 폼)

testID → content-desc 매핑 규칙:
  TextInput (자식 없음) : testID = content-desc → ACCESSIBILITY_ID 사용 가능
  TouchableOpacity + Text 자식 : content-desc = 텍스트 내용 → wait_text 사용
  TouchableOpacity + Icon만 : accessibilityLabel 설정 시 ACCESSIBILITY_ID 사용

testID 목록 (HomeScreen.tsx):
  input-amount      TextInput  → ACCESSIBILITY_ID
  input-memo        TextInput  → ACCESSIBILITY_ID
  btn-type-expense  Text='지출' → wait_text('지출')
  btn-type-income   Text='수입' → wait_text('수입')
  btn-category      Text='카테고리' → wait_text('카테고리')
  btn-save          Text='저장하기' → wait_text('저장하기')
  btn-time-*        Text='아침/점심/저녁' → wait_text
"""

import time
import allure
from appium.webdriver.common.appiumby import AppiumBy
from .base_page import BasePage


class HomePage(BasePage):

    @allure.step('홈 탭 진입 확인')
    def is_loaded(self) -> bool:
        """시간대 버튼 텍스트(아침/점심/저녁)로 홈 화면 로드 확인"""
        for label in ['아침', '점심', '저녁']:
            if self.is_text_present(label, timeout=5):
                return True
        return False

    @allure.step('시간대 선택: {time_label}')
    def select_time_slot(self, time_label: str = '점심'):
        """텍스트 기반 — TouchableOpacity+Text 구조라 content-desc = 텍스트"""
        self.wait_text(time_label).click()
        time.sleep(0.3)

    @allure.step('거래 유형 선택: {tx_type}')
    def select_type(self, tx_type: str = '지출'):
        self.wait_text(tx_type).click()
        time.sleep(0.3)

    @allure.step('금액 입력: {amount}원')
    def enter_amount(self, amount: str):
        """TextInput이므로 ACCESSIBILITY_ID(testID) 사용 가능"""
        try:
            field = self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, 'input-amount')
            field.click()
            time.sleep(0.3)
            self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, 'input-amount').send_keys(amount)
        except Exception:
            self.get_edittext(0).click()
            time.sleep(0.3)
            self.get_edittext(0).send_keys(amount)
        self.driver.hide_keyboard()
        time.sleep(0.3)

    @allure.step('카테고리 선택: {category}')
    def select_category(self, category: str):
        self.wait_text('카테고리').click()
        time.sleep(0.8)
        self.wait_text(category).click()
        time.sleep(0.5)

    @allure.step('메모 입력: {memo}')
    def enter_memo(self, memo: str):
        """TextInput이므로 ACCESSIBILITY_ID(testID) 사용 가능"""
        try:
            self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, 'input-memo').send_keys(memo)
        except Exception:
            self.get_edittext(1).send_keys(memo)
        self.driver.hide_keyboard()
        time.sleep(0.3)

    @allure.step('저장하기')
    def save(self):
        self.wait_text('저장하기').click()
        time.sleep(0.5)
        self.confirm_dialog()
        time.sleep(1)
