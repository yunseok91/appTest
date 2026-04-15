"""
pytest 공용 fixture — Appium 드라이버 세션 관리
세션 단위(scope='session')로 드라이버를 한 번만 생성하여 전체 테스트가 공유
"""

import time
import pytest
from appium import webdriver
from appium.options.android import UiAutomator2Options

# ── 설정 ─────────────────────────────────────────────────────
APPIUM_SERVER = 'http://127.0.0.1:4723'
DEVICE_NAME   = 'R3CW70RXA2B'   # adb devices 로 확인한 실제 디바이스 ID


@pytest.fixture(scope='session')
def driver():
    options = UiAutomator2Options()
    options.platform_name          = 'Android'
    options.device_name            = DEVICE_NAME
    options.app_package            = 'com.baebae.app'
    options.app_activity           = '.MainActivity'
    options.no_reset               = True
    options.auto_grant_permissions = True

    drv = webdriver.Remote(APPIUM_SERVER, options=options)
    drv.implicitly_wait(5)
    time.sleep(3)  # 앱 초기 로딩 대기

    yield drv

    drv.quit()
