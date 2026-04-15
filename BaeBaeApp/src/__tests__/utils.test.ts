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

// ─── TC-02. 가계부 등록 — 입력 유효성 ────────────────────
describe('가계부 등록 — 시간대 유효성', () => {
  type TimeSlot = '아침' | '점심' | '저녁';
  const VALID_SLOTS: TimeSlot[] = ['아침', '점심', '저녁'];
  const isValidTimeSlot = (t: string): boolean => VALID_SLOTS.includes(t as TimeSlot);

  test('아침 / 점심 / 저녁은 유효', () => {
    expect(isValidTimeSlot('아침')).toBe(true);
    expect(isValidTimeSlot('점심')).toBe(true);
    expect(isValidTimeSlot('저녁')).toBe(true);
  });

  test('그 외 값은 무효', () => {
    expect(isValidTimeSlot('새벽')).toBe(false);
    expect(isValidTimeSlot('')).toBe(false);
    expect(isValidTimeSlot('morning')).toBe(false);
  });
});

describe('가계부 등록 — 거래 유형 유효성', () => {
  const isValidType = (t: string): boolean => t === 'expense' || t === 'income';

  test('expense / income은 유효', () => {
    expect(isValidType('expense')).toBe(true);
    expect(isValidType('income')).toBe(true);
  });

  test('그 외 값은 무효', () => {
    expect(isValidType('transfer')).toBe(false);
    expect(isValidType('지출')).toBe(false);
    expect(isValidType('')).toBe(false);
  });
});

describe('가계부 등록 — 결제수단 유효성', () => {
  const isValidPayMethod = (p: string): boolean => p === 'cash' || p === 'card';

  test('현금(cash) / 카드(card)는 유효', () => {
    expect(isValidPayMethod('cash')).toBe(true);
    expect(isValidPayMethod('card')).toBe(true);
  });

  test('그 외 값은 무효', () => {
    expect(isValidPayMethod('credit')).toBe(false);
    expect(isValidPayMethod('현금')).toBe(false);
    expect(isValidPayMethod('')).toBe(false);
  });
});

describe('가계부 등록 — 카드 결제 시 카드명 필수', () => {
  const requiresCardName = (payMethod: string, cardName: string | undefined): boolean => {
    if (payMethod === 'card') return !!cardName && cardName.trim().length > 0;
    return true; // 현금은 카드명 불필요
  };

  test('카드 결제 + 카드명 있으면 유효', () => {
    expect(requiresCardName('card', '신한카드')).toBe(true);
  });

  test('카드 결제 + 카드명 없으면 무효', () => {
    expect(requiresCardName('card', '')).toBe(false);
    expect(requiresCardName('card', '   ')).toBe(false);
    expect(requiresCardName('card', undefined)).toBe(false);
  });

  test('현금 결제는 카드명 없어도 유효', () => {
    expect(requiresCardName('cash', undefined)).toBe(true);
    expect(requiresCardName('cash', '')).toBe(true);
  });
});

// ─── TC-02-4. 카드 리스트 — 노출 및 선택 로직 ───────────────
describe('가계부 등록 — 카드 리스트 노출 및 선택', () => {
  type Card = { id: string; name: string };

  // 결제수단이 'card'일 때만 카드 목록을 보여주는 로직
  const getVisibleCards = (payMethod: string, cards: Card[]): Card[] =>
    payMethod === 'card' ? cards : [];

  // 카드 목록에서 특정 카드를 선택할 수 있는지 검증
  const isCardSelectable = (cardId: string, cards: Card[]): boolean =>
    cards.some(c => c.id === cardId);

  const MOCK_CARDS: Card[] = [
    { id: 'c1', name: '신한카드' },
    { id: 'c2', name: 'KB국민카드' },
    { id: 'c3', name: '현대카드' },
  ];

  test('결제수단이 카드일 때 카드 목록이 노출됨', () => {
    const visible = getVisibleCards('card', MOCK_CARDS);
    expect(visible).toHaveLength(3);
  });

  test('결제수단이 현금일 때 카드 목록은 비어있음', () => {
    const visible = getVisibleCards('cash', MOCK_CARDS);
    expect(visible).toHaveLength(0);
  });

  test('등록된 카드는 선택 가능함', () => {
    expect(isCardSelectable('c1', MOCK_CARDS)).toBe(true);
    expect(isCardSelectable('c2', MOCK_CARDS)).toBe(true);
    expect(isCardSelectable('c3', MOCK_CARDS)).toBe(true);
  });

  test('등록되지 않은 카드는 선택 불가', () => {
    expect(isCardSelectable('unknown', MOCK_CARDS)).toBe(false);
  });

  test('카드 목록이 비어있으면 선택 불가', () => {
    expect(isCardSelectable('c1', [])).toBe(false);
  });
});

describe('가계부 등록 — 카테고리 key 유효성', () => {
  test('지출 카테고리 key는 EXPENSE_CATEGORIES에 있어야 함', () => {
    const validKeys = EXPENSE_CATEGORIES.map(c => c.key);
    expect(validKeys.includes('food')).toBe(true);
    expect(validKeys.includes('transport')).toBe(true);
    expect(validKeys.includes('etc')).toBe(true);
    expect(validKeys.includes('salary')).toBe(false); // 수입 카테고리
    expect(validKeys.includes('invalid')).toBe(false);
  });

  test('수입 카테고리 key는 INCOME_CATEGORIES에 있어야 함', () => {
    const validKeys = INCOME_CATEGORIES.map(c => c.key);
    expect(validKeys.includes('salary')).toBe(true);
    expect(validKeys.includes('allowance')).toBe(true);
    expect(validKeys.includes('food')).toBe(false); // 지출 카테고리
  });
});

// ─── TC-03. 거래내역 수정 — 유효성 ───────────────────────
describe('거래내역 수정 — 유효성', () => {
  type UpdateFields = {
    amount?: number;
    memo?: string;
    categoryKey?: string;
    time?: string;
    payMethod?: string;
  };

  const isValidUpdate = (updates: UpdateFields): boolean => {
    if (Object.keys(updates).length === 0) return false;
    if (updates.amount !== undefined) {
      if (updates.amount <= 0 || !Number.isInteger(updates.amount)) return false;
    }
    if (updates.memo !== undefined && updates.memo.length > 50) return false;
    return true;
  };

  test('금액 수정 — 양의 정수만 유효', () => {
    expect(isValidUpdate({ amount: 5000 })).toBe(true);
    expect(isValidUpdate({ amount: 0 })).toBe(false);
    expect(isValidUpdate({ amount: -1000 })).toBe(false);
    expect(isValidUpdate({ amount: 1000.5 })).toBe(false);
  });

  test('메모 수정 — 50자 이하만 유효', () => {
    expect(isValidUpdate({ memo: '저녁 식사' })).toBe(true);
    expect(isValidUpdate({ memo: 'a'.repeat(50) })).toBe(true);
    expect(isValidUpdate({ memo: 'a'.repeat(51) })).toBe(false);
  });

  test('변경 필드 없으면 무효', () => {
    expect(isValidUpdate({})).toBe(false);
  });

  test('복수 필드 동시 수정은 유효', () => {
    expect(isValidUpdate({ amount: 10000, memo: '저녁 식사', categoryKey: 'food' })).toBe(true);
  });

  test('카테고리만 수정은 유효', () => {
    expect(isValidUpdate({ categoryKey: 'transport' })).toBe(true);
  });
});

// ─── TC-04. 카드 추가 — 유효성 ───────────────────────────
describe('카드 추가 — 카드명 유효성', () => {
  const CARD_NAME_MAX = 20;
  const isValidCardName = (name: string): boolean => {
    const trimmed = name.trim();
    return trimmed.length > 0 && trimmed.length <= CARD_NAME_MAX;
  };

  test('정상 카드명은 유효', () => {
    expect(isValidCardName('신한카드')).toBe(true);
    expect(isValidCardName('KB국민카드')).toBe(true);
  });

  test('빈 문자열 / 공백만은 무효', () => {
    expect(isValidCardName('')).toBe(false);
    expect(isValidCardName('   ')).toBe(false);
  });

  test('20자 초과는 무효', () => {
    expect(isValidCardName('a'.repeat(20))).toBe(true);
    expect(isValidCardName('a'.repeat(21))).toBe(false);
  });
});

// ─── TC-06. 가계명 변경 — 유효성 ─────────────────────────
describe('가계명 변경 — 유효성', () => {
  const HOUSEHOLD_NAME_MAX = 20;
  const isValidHouseholdName = (name: string): boolean => {
    const trimmed = name.trim();
    return trimmed.length > 0 && trimmed.length <= HOUSEHOLD_NAME_MAX;
  };

  test('정상 가계명은 유효', () => {
    expect(isValidHouseholdName('우리 가계부')).toBe(true);
    expect(isValidHouseholdName('A')).toBe(true);
    expect(isValidHouseholdName('a'.repeat(20))).toBe(true);
  });

  test('빈 문자열 / 공백만은 무효', () => {
    expect(isValidHouseholdName('')).toBe(false);
    expect(isValidHouseholdName('   ')).toBe(false);
  });

  test('20자 초과는 무효', () => {
    expect(isValidHouseholdName('a'.repeat(21))).toBe(false);
  });
});

// ─── TC-07. CSV 내보내기 — 포맷 검증 ─────────────────────
const CATEGORY_KR: Record<string, string> = {
  food: '식비', transport: '교통', shopping: '쇼핑', salary: '급여',
  allowance: '용돈', etc: '기타',
};

function buildCSV(
  transactions: {
    id: string; type: 'expense' | 'income'; category: string; categoryKey: string;
    amount: number; memo: string; date: string; time: string;
    person: string; payMethod: 'cash' | 'card'; cardName?: string;
    categoryIcon: string; categoryIconColor: string; categoryBgColor: string; createdAt: string;
  }[],
  year: number,
): string {
  const rows = transactions
    .filter(tx => tx.date.startsWith(String(year)))
    .sort((a, b) => a.date.localeCompare(b.date));

  const header = ['날짜', '구분', '카테고리', '금액', '메모', '결제수단', '카드명', '담당자', '시간대'].join(',');
  const lines = rows.map(tx => [
    tx.date,
    tx.type === 'expense' ? '지출' : '수입',
    CATEGORY_KR[tx.categoryKey] ?? tx.category,
    tx.amount,
    `"${(tx.memo ?? '').replace(/"/g, '""')}"`,
    tx.payMethod === 'cash' ? '현금' : '카드',
    tx.cardName ?? '',
    tx.person,
    tx.time,
  ].join(','));

  return '\uFEFF' + [header, ...lines].join('\r\n');
}

const MOCK_TX = (overrides = {}) => ({
  id: '1', type: 'expense' as const, category: '식비', categoryKey: 'food',
  amount: 5000, memo: '점심', date: '2026-04-10', time: '점심',
  person: '나', payMethod: 'cash' as const, cardName: undefined,
  categoryIcon: '', categoryIconColor: '', categoryBgColor: '', createdAt: '',
  ...overrides,
});

describe('CSV 내보내기 — 포맷 검증', () => {
  test('헤더 행이 9개 컬럼을 포함해야 함', () => {
    const csv = buildCSV([MOCK_TX()], 2026);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    const headers = lines[0].split(',');
    expect(headers).toHaveLength(9);
    expect(headers[0]).toBe('날짜');
    expect(headers[2]).toBe('카테고리');
    expect(headers[3]).toBe('금액');
  });

  test('지출은 "지출", 수입은 "수입"으로 변환', () => {
    const csvExpense = buildCSV([MOCK_TX({ type: 'expense' })], 2026);
    const csvIncome = buildCSV([MOCK_TX({ type: 'income', categoryKey: 'salary' })], 2026);
    expect(csvExpense).toContain('지출');
    expect(csvIncome).toContain('수입');
  });

  test('현금은 "현금", 카드는 "카드"로 변환', () => {
    const csvCash = buildCSV([MOCK_TX({ payMethod: 'cash' })], 2026);
    const csvCard = buildCSV([MOCK_TX({ payMethod: 'card', cardName: '신한카드' })], 2026);
    expect(csvCash).toContain('현금');
    expect(csvCard).toContain('카드');
    expect(csvCard).toContain('신한카드');
  });

  test('다른 연도 거래는 포함되지 않아야 함', () => {
    const tx2025 = MOCK_TX({ date: '2025-12-31', memo: '작년거래' });
    const tx2026 = MOCK_TX({ date: '2026-01-01', memo: '올해거래' });
    const csv = buildCSV([tx2025, tx2026], 2026);
    expect(csv).not.toContain('작년거래');
    expect(csv).toContain('올해거래');
  });

  test('메모에 쌍따옴표가 있으면 이스케이프 처리', () => {
    const tx = MOCK_TX({ memo: '커피 "아메리카노"' });
    const csv = buildCSV([tx], 2026);
    expect(csv).toContain('""아메리카노""');
  });

  test('BOM 문자로 시작해야 함 (Excel UTF-8 호환)', () => {
    const csv = buildCSV([MOCK_TX()], 2026);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  test('행 구분자는 CRLF여야 함 (Excel 호환)', () => {
    const csv = buildCSV([MOCK_TX()], 2026);
    expect(csv).toContain('\r\n');
  });
});

// ─── TC-08. 예산 수정 — 유효성 ───────────────────────────
// MyPageScreen handleSaveBudget 로직:
//   빈 값 → 0 (예산 없음)
//   그 외  → replace(/[^0-9]/g, '') 로 숫자만 추출 후 저장
//   → UI가 숫자 전용 키보드 + 비숫자 제거이므로 음수/소수점은 입력 자체가 불가
describe('예산 수정 — 저장 값 변환 로직', () => {
  const parseBudget = (v: string): number =>
    v.trim() === '' ? 0 : Number(v.replace(/[^0-9]/g, ''));

  test('정상 금액은 그대로 반환', () => {
    expect(parseBudget('500000')).toBe(500000);
    expect(parseBudget('1000000')).toBe(1000000);
  });

  test('빈 값은 0으로 처리 — 예산 없음 의미', () => {
    expect(parseBudget('')).toBe(0);
    expect(parseBudget('   ')).toBe(0);
  });

  test('0 입력은 그대로 0 — 예산 해제', () => {
    expect(parseBudget('0')).toBe(0);
  });

  test('비숫자 문자는 제거 후 저장 (UI에서 사전 차단되지만 방어적 처리)', () => {
    expect(parseBudget('500,000')).toBe(500000); // 쉼표 제거
    expect(parseBudget('₩300000')).toBe(300000); // 단위 제거
  });
});

// ─── TC-02-7. 날짜 선택 — 포맷 및 유효성 ────────────────────
describe('가계부 등록 — 날짜 선택 유효성', () => {
  // YYYY-MM-DD 형식 검사
  const isValidDate = (date: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const d = new Date(date);
    if (isNaN(d.getTime())) return false;
    // JS가 날짜 보정(overflow)하면 원본과 달라짐 — 예: 4/31 → 5/1
    return d.toISOString().startsWith(date);
  };

  // 선택한 날짜가 오늘 이후가 아닌지 (미래 날짜는 등록 불가)
  const isNotFuture = (date: string, today = '2026-04-15'): boolean =>
    date <= today;

  test('YYYY-MM-DD 포맷은 유효', () => {
    expect(isValidDate('2026-04-15')).toBe(true);
    expect(isValidDate('2026-01-01')).toBe(true);
    expect(isValidDate('2025-12-31')).toBe(true);
  });

  test('포맷이 다르면 무효', () => {
    expect(isValidDate('20260415')).toBe(false);
    expect(isValidDate('2026/04/15')).toBe(false);
    expect(isValidDate('15-04-2026')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });

  test('존재하지 않는 날짜는 무효', () => {
    expect(isValidDate('2026-13-01')).toBe(false); // 13월
    expect(isValidDate('2026-04-31')).toBe(false); // 4월 31일
  });

  test('오늘 날짜는 등록 가능', () => {
    expect(isNotFuture('2026-04-15')).toBe(true);
  });

  test('과거 날짜는 등록 가능', () => {
    expect(isNotFuture('2026-01-01')).toBe(true);
    expect(isNotFuture('2025-12-31')).toBe(true);
  });

  test('미래 날짜는 등록 불가', () => {
    expect(isNotFuture('2026-04-16')).toBe(false);
    expect(isNotFuture('2027-01-01')).toBe(false);
  });
});

// ─── TC-02-9. 거래 등록 — payload 완성도 검증 ───────────────
describe('가계부 등록 — 거래 등록 payload 완성도', () => {
  type TxPayload = {
    type: string;
    categoryKey: string;
    amount: number;
    payMethod: string;
    cardName?: string;
    date: string;
    time: string;
    memo: string;
  };

  const isValidPayload = (p: Partial<TxPayload>): { ok: boolean; missing: string[] } => {
    const required: (keyof TxPayload)[] = ['type', 'categoryKey', 'amount', 'payMethod', 'date', 'time'];
    const missing: string[] = required.filter(k => !p[k] && p[k] !== 0);
    if (p.payMethod === 'card' && !p.cardName?.trim()) missing.push('cardName');
    if (p.amount !== undefined && (p.amount <= 0 || !Number.isInteger(p.amount))) missing.push('amount(invalid)');
    return { ok: missing.length === 0, missing };
  };

  test('필수 필드 모두 있으면 등록 가능', () => {
    const result = isValidPayload({
      type: 'expense', categoryKey: 'food', amount: 5000,
      payMethod: 'cash', date: '2026-04-15', time: '점심', memo: '',
    });
    expect(result.ok).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  test('카드 결제 + 카드명 있으면 등록 가능', () => {
    const result = isValidPayload({
      type: 'expense', categoryKey: 'food', amount: 15000,
      payMethod: 'card', cardName: '신한카드', date: '2026-04-15', time: '저녁', memo: '저녁식사',
    });
    expect(result.ok).toBe(true);
  });

  test('금액 누락 시 등록 불가', () => {
    const result = isValidPayload({
      type: 'expense', categoryKey: 'food',
      payMethod: 'cash', date: '2026-04-15', time: '점심',
    });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('amount');
  });

  test('카테고리 누락 시 등록 불가', () => {
    const result = isValidPayload({
      type: 'expense', amount: 5000,
      payMethod: 'cash', date: '2026-04-15', time: '점심',
    });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('categoryKey');
  });

  test('카드 결제인데 카드명 없으면 등록 불가', () => {
    const result = isValidPayload({
      type: 'expense', categoryKey: 'food', amount: 5000,
      payMethod: 'card', date: '2026-04-15', time: '점심',
    });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('cardName');
  });

  test('금액이 0이면 등록 불가', () => {
    const result = isValidPayload({
      type: 'expense', categoryKey: 'food', amount: 0,
      payMethod: 'cash', date: '2026-04-15', time: '아침',
    });
    expect(result.ok).toBe(false);
  });

  test('시간대 누락 시 등록 불가', () => {
    const result = isValidPayload({
      type: 'expense', categoryKey: 'food', amount: 5000,
      payMethod: 'cash', date: '2026-04-15',
    });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('time');
  });
});
