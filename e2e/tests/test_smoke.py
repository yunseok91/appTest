"""
Smoke Test — BaeBaeApp 핵심 유저 시나리오
앱이 죽지 않고 실행되는지, 지출 등록 → 내역 검증 흐름이 동작하는지 확인

실행:
  pytest e2e/tests/test_smoke.py -v --alluredir=e2e/allure-results

리포트 열기:
  allure serve e2e/allure-results
"""

import allure
import pytest

from pages.home_page import HomePage
from pages.history_page import HistoryPage

AMOUNT    = '10000'   # 입력 금액 (send_keys용 숫자 문자열)
AMOUNT_FMT = '10,000'  # 내역에 표시되는 포맷 (검증용)
CATEGORY  = '식비'
MEMO      = 'lunch'   # 한글 send_keys Android 미지원 → 영문


# ── TC-SMOKE-01 ───────────────────────────────────────────────
@allure.feature('Smoke')
@allure.story('앱 실행 및 메인 화면 진입')
@allure.title('[TC-SMOKE-01] 앱 실행 — 홈 화면 정상 로드')
@allure.severity(allure.severity_level.BLOCKER)
def test_01_app_launch(driver):
    """
    앱이 죽지 않고 실행되어 홈(입력폼) 화면이 노출되는지 확인.
    시간대 버튼(아침/점심/저녁) 중 하나가 보이면 홈 화면 로드 성공.
    """
    home = HomePage(driver)

    with allure.step('홈 화면 로드 여부 확인'):
        loaded = home.is_loaded()

    assert loaded, '❌ 홈 화면이 로드되지 않음 — 앱 실행 실패 또는 로그인 필요'


# ── TC-SMOKE-02 ───────────────────────────────────────────────
@allure.feature('Smoke')
@allure.story('지출 등록 → 내역 탭 데이터 검증')
@allure.title('[TC-SMOKE-02] 지출 10,000원 등록 → 내역 목록 노출 검증')
@allure.severity(allure.severity_level.CRITICAL)
def test_02_expense_and_verify(driver):
    """
    홈 화면 입력 폼에서 지출 10,000원을 등록하고
    내역 탭으로 이동하여 금액과 메모가 목록에 정확히 표시되는지 검증.
    """
    home    = HomePage(driver)
    history = HistoryPage(driver)

    # ── Step 1: 거래 등록 ──────────────────────────────────────
    home.select_time_slot('점심')
    home.select_type('지출')
    home.enter_amount(AMOUNT)
    home.select_category(CATEGORY)
    home.enter_memo(MEMO)
    home.save()

    # ── Step 2: 내역 탭 이동 ───────────────────────────────────
    history.navigate()

    # ── Step 3: 데이터 검증 (Assertion) ───────────────────────
    with allure.step(f'금액 "{AMOUNT_FMT}" 노출 확인'):
        assert history.has_amount(AMOUNT_FMT), \
            f'❌ 내역 목록에 {AMOUNT_FMT}원이 표시되지 않음'

    with allure.step(f'메모 "{MEMO}" 노출 확인'):
        assert history.has_memo(MEMO), \
            f'❌ 내역 목록에 메모({MEMO})가 표시되지 않음'
