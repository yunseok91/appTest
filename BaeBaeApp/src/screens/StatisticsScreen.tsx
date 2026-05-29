import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  ScrollView, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/colors';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import WheelPicker, { YEARS, MONTHS, ITEM_H } from '../components/WheelPicker';

function BarChart({ data, currentYear, currentMonth }: {
  data: { year: number; month: number; total: number }[];
  currentYear: number;
  currentMonth: number;
}) {
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const BAR_MAX_H = 90;

  return (
    <View style={{ width: '100%', flexDirection: 'row' }}>
      {data.map(({ year, month, total }) => {
        const isCurrent = year === currentYear && month === currentMonth;
        const barH = total > 0 ? Math.max(6, Math.round((total / maxVal) * BAR_MAX_H)) : 6;
        const amtText = total >= 10000 ? `${Math.round(total / 10000)}만` : total > 0 ? `${total}` : '';
        return (
          <View key={`${year}-${month}`} style={styles.barCol}>
            <Text style={[styles.barAmtText, isCurrent && styles.barAmtCurrent]}>{amtText}</Text>
            <View style={styles.barWrap}>
              <View style={[styles.bar, { height: barH, backgroundColor: isCurrent ? colors.primary : '#C5D9D0' }]} />
            </View>
            <Text style={[styles.barMonthText, isCurrent && styles.barMonthCurrent]}>{month}월</Text>
          </View>
        );
      })}
    </View>
  );
}

type CatItem = { label: string; amount: number; color: string; pct: number };

function DonutChart({ categories, totalLabel, totalAmt }: {
  categories: CatItem[];
  totalLabel: string;
  totalAmt: string;
}) {
  const SIZE = 160;
  const STROKE = 28;
  const INNER = SIZE - STROKE * 2;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: SIZE, height: SIZE, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2,
          borderWidth: STROKE,
          borderTopColor:    categories[0]?.color ?? '#EDECEA',
          borderRightColor:  categories[1]?.color ?? '#EDECEA',
          borderBottomColor: categories[2]?.color ?? '#EDECEA',
          borderLeftColor:   categories[3]?.color ?? '#EDECEA',
        }} />
        <View style={{ width: INNER, height: INNER, borderRadius: INNER / 2, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Text style={styles.donutAmt} allowFontScaling={false}>{totalAmt}</Text>
          <Text style={styles.donutLbl}>{totalLabel}</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {categories.map((c) => (
          <View key={c.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c.color }]} />
            <Text style={styles.legendText}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const { transactions } = useTransactions();
  const { user, partnerName } = useAuth();
  const { myName: profileName, budget } = useProfile();
  const [person, setPerson] = useState<'all' | 'me' | 'partner'>('all');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [chartType, setChartType] = useState<'donut' | 'bar'>('donut');
  const [showPicker, setShowPicker] = useState(false);
  const [pickYearIdx, setPickYearIdx] = useState(YEARS.indexOf(now.getFullYear()));
  const [pickMonthIdx, setPickMonthIdx] = useState(now.getMonth());

  const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const myName = profileName || user?.name || '나';

  const monthlyExpenses = useMemo(() =>
    transactions.filter(tx =>
      tx.type === txType &&
      tx.date.startsWith(monthStr) &&
      (person === 'all' ? true : person === 'me' ? tx.person === myName : tx.person !== myName)
    ), [transactions, monthStr, person, myName, txType]);

  const cats = useMemo(() => {
    const map: Record<string, { label: string; amount: number; color: string; icon: string; iconColor: string; bgColor: string }> = {};
    monthlyExpenses.forEach(tx => {
      if (!map[tx.category]) {
        map[tx.category] = { label: tx.category, amount: 0, color: tx.categoryIconColor, icon: tx.categoryIcon, iconColor: tx.categoryIconColor, bgColor: tx.categoryBgColor };
      }
      map[tx.category].amount += tx.amount;
    });
    const arr = Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 4);
    const total = arr.reduce((s, c) => s + c.amount, 0);
    return arr.map(c => ({ ...c, pct: total > 0 ? Math.round(c.amount / total * 100) : 0 }));
  }, [monthlyExpenses]);

  const totalSpend = cats.reduce((s, c) => s + c.amount, 0);

  const sixMonths = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      let y = currentYear;
      let m = currentMonth - i;
      if (m <= 0) { m += 12; y -= 1; }
      const str = `${y}-${String(m).padStart(2, '0')}`;
      const total = transactions
        .filter(tx =>
          tx.type === txType &&
          tx.date.startsWith(str) &&
          (person === 'all' ? true : person === 'me' ? tx.person === myName : tx.person !== myName)
        )
        .reduce((s, tx) => s + tx.amount, 0);
      result.push({ year: y, month: m, total });
    }
    return result;
  }, [transactions, currentYear, currentMonth, person, myName, txType]);

  // 연간 데이터 (12개월 전체)
  const yearlyMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const str = `${currentYear}-${String(m).padStart(2, '0')}`;
      const expense = transactions
        .filter(tx => tx.type === 'expense' && tx.date.startsWith(str) &&
          (person === 'all' ? true : person === 'me' ? tx.person === myName : tx.person !== myName))
        .reduce((s, tx) => s + tx.amount, 0);
      const income = transactions
        .filter(tx => tx.type === 'income' && tx.date.startsWith(str) &&
          (person === 'all' ? true : person === 'me' ? tx.person === myName : tx.person !== myName))
        .reduce((s, tx) => s + tx.amount, 0);
      return { month: m, expense, income };
    });
  }, [transactions, currentYear, person, myName]);

  const yearlyTotals = useMemo(() => {
    const totalExpense = yearlyMonths.reduce((s, m) => s + m.expense, 0);
    const totalIncome = yearlyMonths.reduce((s, m) => s + m.income, 0);
    return { totalExpense, totalIncome, net: totalIncome - totalExpense };
  }, [yearlyMonths]);

  // 연간 카테고리 top5
  const yearlyCats = useMemo(() => {
    const yearStr = String(currentYear);
    const map: Record<string, { label: string; amount: number; color: string }> = {};
    transactions
      .filter(tx => tx.type === txType && tx.date.startsWith(yearStr) &&
        (person === 'all' ? true : person === 'me' ? tx.person === myName : tx.person !== myName))
      .forEach(tx => {
        if (!map[tx.category]) map[tx.category] = { label: tx.category, amount: 0, color: tx.categoryIconColor };
        map[tx.category].amount += tx.amount;
      });
    return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [transactions, currentYear, txType, person, myName]);

  const openPicker = () => {
    setPickYearIdx(YEARS.indexOf(currentYear));
    setPickMonthIdx(currentMonth - 1);
    setShowPicker(true);
  };

  const confirmPicker = () => {
    setCurrentYear(YEARS[pickYearIdx]);
    setCurrentMonth(MONTHS[pickMonthIdx]);
    setShowPicker(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent={false} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} allowFontScaling={false}>통계</Text>
          <View style={styles.monthToggle}>
            <TouchableOpacity testID="stats-btn-month-prev" onPress={() => setCurrentMonth(m => m > 1 ? m - 1 : 12)} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity testID="stats-btn-month-select" style={styles.monthBtn} onPress={openPicker} activeOpacity={0.7}>
              <Text style={styles.headerMonth}>{currentYear}년 {currentMonth}월</Text>
              <Ionicons name="chevron-down" size={14} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity testID="stats-btn-month-next" onPress={() => setCurrentMonth(m => m < 12 ? m + 1 : 1)} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 월간 / 연간 토글 */}
        <View style={styles.viewModeToggle}>
          {(['monthly', 'yearly'] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.viewModeBtn, viewMode === mode && styles.viewModeBtnActive]}
              onPress={() => setViewMode(mode)}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewModeBtnText, viewMode === mode && styles.viewModeBtnTextActive]}>
                {mode === 'monthly' ? '월간' : '연간'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 지출 / 수입 탭 */}
        <View style={styles.txTypeToggle}>
          {(['expense', 'income'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.txTypeBtn, txType === t && (t === 'expense' ? styles.txTypeBtnExpense : styles.txTypeBtnIncome)]}
              onPress={() => setTxType(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.txTypeBtnText, txType === t && styles.txTypeBtnTextActive]}>
                {t === 'expense' ? '지출' : '수입'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 연간 리포트 ── */}
        {viewMode === 'yearly' && (() => {
          const maxVal = Math.max(...yearlyMonths.map(m => Math.max(m.expense, m.income)), 1);
          const BAR_MAX_H = 80;
          return (
            <>
              {/* 연간 요약 카드 */}
              <View style={styles.yearlySummary}>
                {[
                  { label: '총 수입', value: yearlyTotals.totalIncome, color: colors.primary },
                  { label: '총 지출', value: yearlyTotals.totalExpense, color: '#E05C5C' },
                  { label: '순이익', value: yearlyTotals.net, color: yearlyTotals.net >= 0 ? colors.primary : '#E05C5C' },
                ].map(({ label, value, color }) => (
                  <View key={label} style={styles.yearlySummaryItem}>
                    <Text style={styles.yearlySummaryLbl}>{label}</Text>
                    <Text style={[styles.yearlySummaryVal, { color }]} allowFontScaling={false}>
                      {value < 0 ? '-' : ''}₩{Math.abs(value).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>

              {/* 12개월 막대 차트 */}
              <View style={styles.chartCard}>
                <Text style={styles.chartLbl}>{currentYear}년 월별 추이</Text>
                <View style={{ width: '100%', flexDirection: 'row' }}>
                  {yearlyMonths.map(({ month, expense, income }) => {
                    const val = txType === 'expense' ? expense : income;
                    const barH = val > 0 ? Math.max(4, Math.round((val / maxVal) * BAR_MAX_H)) : 4;
                    const isCurrent = month === currentMonth && currentYear === now.getFullYear();
                    return (
                      <View key={month} style={styles.barCol}>
                        <View style={styles.barWrap}>
                          <View style={[styles.bar, { height: barH, backgroundColor: isCurrent ? colors.primary : '#C5D9D0' }]} />
                        </View>
                        <Text style={[styles.barMonthText, isCurrent && styles.barMonthCurrent]}>{month}월</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* 연간 카테고리 top5 */}
              <Text style={styles.catTitle}>{currentYear}년 카테고리별 {txType === 'expense' ? '지출' : '수입'} Top 5</Text>
              {yearlyCats.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="bar-chart-outline" size={36} color={colors.border} />
                  <Text style={styles.emptyText}>{currentYear}년 내역이 없어요</Text>
                </View>
              ) : (
                <View style={styles.catCard}>
                  {yearlyCats.map((cat, i) => (
                    <React.Fragment key={cat.label}>
                      {i > 0 && <View style={styles.catDivider} />}
                      <View style={styles.catRow}>
                        <Text style={styles.catRank}>{i + 1}</Text>
                        <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                        <Text style={styles.catLabel}>{cat.label}</Text>
                        <Text style={styles.catAmt} allowFontScaling={false}>
                          <Text style={{ fontFamily: undefined }}>₩</Text>{cat.amount.toLocaleString()}
                        </Text>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              )}
            </>
          );
        })()}

        {/* ── 월간 콘텐츠 ── */}
        {/* 예산 진행 바 (지출 탭 + 예산 설정된 경우) */}
        {viewMode === 'monthly' && txType === 'expense' && budget > 0 && (() => {
          const totalSpendAll = transactions
            .filter(tx => tx.type === 'expense' && tx.date.startsWith(monthStr))
            .reduce((s, tx) => s + tx.amount, 0);
          const pct = Math.min(totalSpendAll / budget, 1);
          const isOver = totalSpendAll > budget;
          return (
            <View style={styles.budgetCard}>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLbl}>이번 달 예산</Text>
                <Text style={[styles.budgetPct, isOver && { color: '#E05C5C' }]}>
                  {Math.round((totalSpendAll / budget) * 100)}%
                </Text>
              </View>
              <View style={styles.budgetBarBg}>
                <View style={[styles.budgetBarFill, { width: `${pct * 100}%` as any, backgroundColor: isOver ? '#E05C5C' : colors.primary }]} />
              </View>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetSub}>₩{totalSpendAll.toLocaleString()} 사용</Text>
                <Text style={styles.budgetSub}>₩{budget.toLocaleString()} 예산</Text>
              </View>
            </View>
          );
        })()}

        {/* Person toggle */}
        <View style={styles.personToggle}>
          {([{ key: 'all' as const, label: '전체' }, { key: 'me' as const, label: myName }, { key: 'partner' as const, label: partnerName || '파트너' }]).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              testID={`stats-btn-person-${key}`}
              style={[styles.personBtn, person === key && styles.personBtnActive]}
              onPress={() => setPerson(key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.personBtnText, person === key && styles.personBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 월간 차트 + 카테고리 */}
        {viewMode === 'monthly' && (
          <>
            <View style={styles.chartCard}>
              <Text style={styles.chartLbl}>{chartType === 'donut' ? `이번 달 ${txType === 'expense' ? '지출' : '수입'}` : `월별 ${txType === 'expense' ? '지출' : '수입'} 추이`}</Text>
              <View style={styles.chartToggle}>
                {(['donut', 'bar'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    testID={`stats-btn-chart-${type}`}
                    style={[styles.chartToggleBtn, chartType === type && styles.chartToggleBtnActive]}
                    onPress={() => setChartType(type)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chartToggleText, chartType === type && styles.chartToggleTextActive]}>
                      {type === 'donut' ? '도넛형' : '막대형'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {chartType === 'donut'
                ? <DonutChart categories={cats} totalLabel={txType === 'expense' ? '총 지출' : '총 수입'} totalAmt={`₩${totalSpend.toLocaleString()}`} />
                : <BarChart data={sixMonths} currentYear={currentYear} currentMonth={currentMonth} />
              }
            </View>

            <Text style={styles.catTitle}>카테고리별 {txType === 'expense' ? '지출' : '수입'}</Text>
            {cats.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="bar-chart-outline" size={36} color={colors.border} />
                <Text style={styles.emptyText}>이번 달 {txType === 'expense' ? '지출' : '수입'} 내역이 없어요</Text>
              </View>
            ) : (
              <View style={styles.catCard}>
                {cats.map((cat, i) => (
                  <React.Fragment key={cat.label}>
                    {i > 0 && <View style={styles.catDivider} />}
                    <View style={styles.catRow}>
                      <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                      <Text style={styles.catLabel}>{cat.label}</Text>
                      <Text style={styles.catPct}>{cat.pct}%</Text>
                      <Text style={styles.catAmt} allowFontScaling={false}><Text style={{ fontFamily: undefined }}>₩</Text>{cat.amount.toLocaleString()}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            )}
          </>
        )}

      </ScrollView>


      {/* 년도/월 선택 바텀시트 (AGs1J) */}
      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={() => setShowPicker(false)}>
        <View style={styles.ymModalWrap}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowPicker(false)} />
          <View style={[styles.ymSheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.ymHeader}>
            <Text style={styles.ymTitle}>날짜 선택</Text>
            <TouchableOpacity testID="stats-btn-picker-close" onPress={() => setShowPicker(false)}>
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.ymDivider} />

          <View style={styles.ymPickerRow}>
            <WheelPicker
              items={YEARS}
              selectedIndex={pickYearIdx}
              onSelect={setPickYearIdx}
            />
            <WheelPicker
              items={MONTHS}
              selectedIndex={pickMonthIdx}
              onSelect={setPickMonthIdx}
              format={(v) => `${v}월`}
            />
          </View>

          <TouchableOpacity testID="stats-btn-picker-confirm" style={styles.ymConfirmBtn} onPress={confirmPicker} activeOpacity={0.85}>
            <Text style={styles.ymConfirmText}>확인</Text>
          </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 30, color: colors.text },
  headerMonth: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  monthBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.canvas },
  monthToggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  viewModeToggle: { flexDirection: 'row', backgroundColor: colors.canvas, marginHorizontal: 20, borderRadius: 100, padding: 4, gap: 2, height: 40, marginBottom: 12 },
  viewModeBtn: { flex: 1, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  viewModeBtnActive: { backgroundColor: colors.text },
  viewModeBtnText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
  viewModeBtnTextActive: { color: '#FFFFFF', fontFamily: fonts.semiBold },

  yearlySummary: { flexDirection: 'row', marginHorizontal: 20, gap: 8, marginBottom: 12 },
  yearlySummaryItem: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  yearlySummaryLbl: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  yearlySummaryVal: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },

  catRank: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSecondary, width: 18, textAlign: 'center' },

  txTypeToggle: { flexDirection: 'row', backgroundColor: colors.canvas, marginHorizontal: 20, borderRadius: 100, padding: 4, gap: 2, height: 40, marginBottom: 12 },
  txTypeBtn: { flex: 1, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  txTypeBtnExpense: { backgroundColor: colors.secondary },
  txTypeBtnIncome: { backgroundColor: colors.primary },
  txTypeBtnText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
  txTypeBtnTextActive: { color: '#FFFFFF', fontFamily: fonts.semiBold },

  budgetCard: { backgroundColor: colors.card, marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 12, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetLbl: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text },
  budgetPct: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  budgetBarBg: { height: 8, backgroundColor: colors.canvas, borderRadius: 4, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: 4 },
  budgetSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },

  personToggle: { flexDirection: 'row', backgroundColor: colors.canvas, marginHorizontal: 20, borderRadius: 100, padding: 4, gap: 2, height: 40, marginBottom: 16 },
  personBtn: { flex: 1, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  personBtnActive: { backgroundColor: colors.primary },
  personBtnText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
  personBtnTextActive: { color: '#FFFFFF', fontFamily: fonts.semiBold },

  chartCard: { backgroundColor: colors.card, marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 16, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  chartLbl: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  chartToggle: { flexDirection: 'row', backgroundColor: '#EDECEA', borderRadius: 8, padding: 4, gap: 4, height: 36 },
  chartToggleBtn: { flex: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  chartToggleBtnActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  chartToggleText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  chartToggleTextActive: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barAmtText: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted, height: 14 },
  barAmtCurrent: { fontFamily: fonts.semiBold, color: colors.primary },
  barWrap: { width: '100%', height: 90, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: 24, borderRadius: 4 },
  barMonthText: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  barMonthCurrent: { fontFamily: fonts.semiBold, color: colors.text },
  donutAmt: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  donutLbl: { fontFamily: fonts.regular, fontSize: 10, color: colors.textSecondary },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.regular, fontSize: 11, color: colors.text },

  catTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text, paddingHorizontal: 20, marginBottom: 10 },
  catCard: { backgroundColor: colors.card, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  emptyWrap: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  catDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.canvas },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  catPct: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, width: 36, textAlign: 'right' },
  catAmt: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text, width: 90, textAlign: 'right' },

  // 바텀시트
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  ymModalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  ymSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  ymHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48, paddingHorizontal: 20 },
  ymTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  ymDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },

  ymPickerRow: { flexDirection: 'row', height: ITEM_H * 5, marginTop: 8 },

  ymConfirmBtn: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  ymConfirmText: { fontFamily: fonts.semiBold, fontSize: 16, color: '#FFFFFF' },
});
