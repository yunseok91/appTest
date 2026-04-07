// ─── 금액 포맷 함수 ───────────────────────────────────────
function formatW(amount: number): string {
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만`;
  if (amount >= 1000)  return `${(amount / 1000).toFixed(0)}천`;
  return `${amount}`;
}

describe('formatW — 금액 포맷', () => {
  test('만원 이상은 "N만" 형식', () => {
    expect(formatW(10000)).toBe('1만');
    expect(formatW(50000)).toBe('5만');
    expect(formatW(120000)).toBe('12만');
  });

  test('천원 이상 만원 미만은 "N천" 형식', () => {
    expect(formatW(1000)).toBe('1천');
    expect(formatW(5000)).toBe('5천');
    expect(formatW(9000)).toBe('9천');
  });

  test('천원 미만은 숫자 그대로', () => {
    expect(formatW(0)).toBe('0');
    expect(formatW(500)).toBe('500');
    expect(formatW(999)).toBe('999');
  });
});

// ─── 카테고리 ────────────────────────────────────────────
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../config/categoryIcons';

describe('EXPENSE_CATEGORIES', () => {
  test('19개 카테고리가 있어야 함', () => {
    expect(EXPENSE_CATEGORIES).toHaveLength(19);
  });

  test('모든 카테고리에 필수 필드가 있어야 함', () => {
    EXPENSE_CATEGORIES.forEach(cat => {
      expect(cat.key).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.icon).toBeTruthy();
      expect(cat.iconColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(cat.bgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  test('카테고리 key는 중복이 없어야 함', () => {
    const keys = EXPENSE_CATEGORIES.map(c => c.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  test('"기타" 카테고리가 존재해야 함', () => {
    const etc = EXPENSE_CATEGORIES.find(c => c.key === 'etc');
    expect(etc).toBeDefined();
    expect(etc?.label).toBe('기타');
  });
});

describe('INCOME_CATEGORIES', () => {
  test('5개 카테고리가 있어야 함', () => {
    expect(INCOME_CATEGORIES).toHaveLength(5);
  });

  test('급여 카테고리가 존재해야 함', () => {
    const salary = INCOME_CATEGORIES.find(c => c.key === 'salary');
    expect(salary?.label).toBe('급여');
  });
});

// ─── 메모 글자 수 제한 ────────────────────────────────────
describe('메모 글자 수 제한', () => {
  const MEMO_MAX = 50;

  test('50자 이하는 그대로 통과', () => {
    const memo = 'a'.repeat(50);
    expect(memo.length).toBeLessThanOrEqual(MEMO_MAX);
  });

  test('51자는 제한 초과', () => {
    const memo = 'a'.repeat(51);
    expect(memo.length).toBeGreaterThan(MEMO_MAX);
  });

  test('빈 메모는 허용', () => {
    expect(''.length).toBeLessThanOrEqual(MEMO_MAX);
  });
});

// ─── 거래 금액 유효성 ─────────────────────────────────────
describe('거래 금액 유효성', () => {
  const isValidAmount = (v: string) => {
    const n = Number(v);
    return !isNaN(n) && n > 0 && Number.isInteger(n);
  };

  test('양의 정수는 유효', () => {
    expect(isValidAmount('1000')).toBe(true);
    expect(isValidAmount('50000')).toBe(true);
  });

  test('0은 무효', () => {
    expect(isValidAmount('0')).toBe(false);
  });

  test('음수는 무효', () => {
    expect(isValidAmount('-1000')).toBe(false);
  });

  test('소수점은 무효', () => {
    expect(isValidAmount('1000.5')).toBe(false);
  });

  test('문자열은 무효', () => {
    expect(isValidAmount('abc')).toBe(false);
    expect(isValidAmount('')).toBe(false);
  });
});
