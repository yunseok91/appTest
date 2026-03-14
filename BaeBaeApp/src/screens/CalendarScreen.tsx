import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  Modal, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/colors';
import { EXPENSE_CATEGORIES } from '../config/categoryIcons';

const ME = 'minji'; // 로그인 사용자

type Person = 'all' | 'minji' | 'junho';

type Transaction = {
  id: string;
  person: 'minji' | 'junho';
  amount: number;
  category: string;
  memo: string;
};

type DayData = {
  minji: number;   // 총 지출 (빨강)
  junho: number;   // 총 지출 (파랑)
  transactions: Transaction[];
};

// Mock data (2026년 3월)
const MOCK: Record<string, DayData> = {
  '2026-03-01': { minji: 12000, junho: 0, transactions: [{ id:'1', person:'minji', amount:12000, category:'식비', memo:'스타벅스' }] },
  '2026-03-03': { minji: 45000, junho: 32000, transactions: [
    { id:'2', person:'minji', amount:45000, category:'쇼핑', memo:'올리브영' },
    { id:'3', person:'junho', amount:32000, category:'식비', memo:'저녁 치킨' },
  ]},
  '2026-03-05': { minji: 0, junho: 8500, transactions: [{ id:'4', person:'junho', amount:8500, category:'교통', memo:'지하철 충전' }] },
  '2026-03-07': { minji: 78000, junho: 0, transactions: [{ id:'5', person:'minji', amount:78000, category:'미용/관리', memo:'헤어 커트' }] },
  '2026-03-10': { minji: 15000, junho: 55000, transactions: [
    { id:'6', person:'minji', amount:15000, category:'식비', memo:'점심 혼밥' },
    { id:'7', person:'junho', amount:55000, category:'문화/여가', memo:'영화+팝콘' },
  ]},
  '2026-03-13': { minji: 23000, junho: 12000, transactions: [
    { id:'8', person:'minji', amount:23000, category:'식비', memo:'카페 디저트' },
    { id:'9', person:'junho', amount:12000, category:'식비', memo:'편의점' },
  ]},
  '2026-03-14': { minji: 120000, junho: 68000, transactions: [
    { id:'10', person:'minji', amount:120000, category:'쇼핑', memo:'옷 구매' },
    { id:'11', person:'junho', amount:68000, category:'식비', memo:'데이트 저녁' },
  ]},
  '2026-03-17': { minji: 0, junho: 35000, transactions: [{ id:'12', person:'junho', amount:35000, category:'운동', memo:'헬스장 1개월' }] },
  '2026-03-20': { minji: 9800, junho: 0, transactions: [{ id:'13', person:'minji', amount:9800, category:'교통', memo:'택시' }] },
  '2026-03-22': { minji: 44000, junho: 44000, transactions: [
    { id:'14', person:'minji', amount:44000, category:'식비', memo:'한식 외식' },
    { id:'15', person:'junho', amount:44000, category:'식비', memo:'한식 외식' },
  ]},
  '2026-03-25': { minji: 15000, junho: 8000, transactions: [
    { id:'16', person:'minji', amount:15000, category:'통신', memo:'앱 구독' },
    { id:'17', person:'junho', amount:8000, category:'식비', memo:'아이스크림' },
  ]},
  '2026-03-28': { minji: 62000, junho: 0, transactions: [{ id:'18', person:'minji', amount:62000, category:'선물/경조사', memo:'친구 생일 선물' }] },
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatW(amount: number) {
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}천`;
  return `${amount}`;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const today = new Date(2026, 2, 14); // 2026-03-14
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1));
  const [filter, setFilter] = useState<Person>('all');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showYMPicker, setShowYMPicker] = useState(false);
  const [pickYear, setPickYear] = useState(2026);
  const [pickMonth, setPickMonth] = useState(3);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-based

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const dateKey = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const cells = useMemo(() => {
    const arr: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [firstDay, daysInMonth]);

  const dayTotal = (day: number): number => {
    const data = MOCK[dateKey(day)];
    if (!data) return 0;
    if (filter === 'minji') return data.minji;
    if (filter === 'junho') return data.junho;
    return data.minji + data.junho;
  };

  const selectedData = selectedDay ? MOCK[selectedDay] : null;
  const filteredTx = selectedData?.transactions.filter(tx =>
    filter === 'all' || tx.person === filter
  ) ?? [];

  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.monthTitleBtn}
          onPress={() => { setPickYear(year); setPickMonth(month + 1); setShowYMPicker(true); }}
          activeOpacity={0.8}
        >
          <Text style={styles.monthTitle}>{year}년 {month + 1}월</Text>
          <Ionicons name="chevron-down" size={14} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {([['all', '전체'], ['minji', '민지'], ['junho', '준호']] as [Person, string][]).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, filter === key && filterChipActive(key)]}
            onPress={() => setFilter(key)}
            activeOpacity={0.8}
          >
            {key !== 'all' && (
              <View style={[styles.dot, { backgroundColor: key === 'minji' ? '#C4729A' : '#4A90D9' }]} />
            )}
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={d} style={[styles.weekDay, i === 0 && { color: '#E05C5C' }, i === 6 && { color: '#4A90D9' }]}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <ScrollView style={styles.grid} showsVerticalScrollIndicator={false}>
        <View style={styles.gridInner}>
          {cells.map((day, idx) => {
            if (!day) return <View key={`e-${idx}`} style={styles.cell} />;
            const key = dateKey(day);
            const data = MOCK[key];
            const total = dayTotal(day);
            const colIdx = idx % 7;

            return (
              <TouchableOpacity
                key={key}
                style={[styles.cell, isToday(day) && styles.cellToday]}
                onPress={() => data && setSelectedDay(key)}
                activeOpacity={data ? 0.7 : 1}
              >
                <Text style={[
                  styles.dayNum,
                  colIdx === 0 && { color: '#E05C5C' },
                  colIdx === 6 && { color: '#4A90D9' },
                  isToday(day) && styles.dayNumToday,
                ]}>{day}</Text>
                {total > 0 && (
                  <Text style={styles.dayTotal}>{formatW(total)}</Text>
                )}
                {data && (
                  <View style={styles.dotRow}>
                    {(filter === 'all' || filter === 'minji') && data.minji > 0 && (
                      <View style={[styles.personDot, { backgroundColor: '#C4729A' }]} />
                    )}
                    {(filter === 'all' || filter === 'junho') && data.junho > 0 && (
                      <View style={[styles.personDot, { backgroundColor: '#4A90D9' }]} />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Day detail modal */}
      <Modal visible={!!selectedDay} animationType="slide" transparent onRequestClose={() => setSelectedDay(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelectedDay(null)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          {selectedDay && (
            <>
              <Text style={styles.sheetTitle}>
                {month + 1}월 {selectedDay.split('-')[2]}일 지출 내역
              </Text>
              {filteredTx.length === 0 ? (
                <Text style={styles.emptyText}>해당 조건의 내역이 없습니다</Text>
              ) : (
                filteredTx.map((tx) => (
                  <TouchableOpacity
                    key={tx.id}
                    style={styles.txRow}
                    activeOpacity={0.7}
                    onPress={() => { setSelectedTx(tx); }}
                  >
                    <View style={[styles.personBadge, { backgroundColor: tx.person === 'minji' ? '#FDF0F6' : '#EBF0FF' }]}>
                      <View style={[styles.dot, { backgroundColor: tx.person === 'minji' ? '#C4729A' : '#4A90D9' }]} />
                      <Text style={[styles.personName, { color: tx.person === 'minji' ? '#C4729A' : '#4A90D9' }]}>
                        {tx.person === 'minji' ? '민지' : '준호'}
                      </Text>
                    </View>
                    <View style={styles.txMeta}>
                      <Text style={styles.txCategory}>{tx.category}</Text>
                      <Text style={styles.txMemo}>{tx.memo}</Text>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={styles.txAmount}>₩{tx.amount.toLocaleString()}</Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.inactive} />
                    </View>
                  </TouchableOpacity>
                ))
              )}
              <View style={styles.sheetTotal}>
                <Text style={styles.sheetTotalLabel}>합계</Text>
                <Text style={styles.sheetTotalVal}>
                  ₩{filteredTx.reduce((s, t) => s + t.amount, 0).toLocaleString()}
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* 거래 상세 시트 (tcF6p) */}
      <Modal visible={!!selectedTx} animationType="slide" transparent onRequestClose={() => setSelectedTx(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelectedTx(null)} />
        {selectedTx && (() => {
          const catInfo = EXPENSE_CATEGORIES.find(c => c.label === selectedTx.category);
          const isMe = selectedTx.person === ME;
          const personColor = selectedTx.person === 'minji' ? '#C4729A' : '#4A90D9';
          const personBg = selectedTx.person === 'minji' ? '#FDF0F6' : '#EBF0FF';
          return (
            <View style={[styles.detailSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.sheetHandle} />

              {/* 헤더: 카테고리 칩 + 닫기 */}
              <View style={styles.detailHeader}>
                <View style={[styles.catChip, { backgroundColor: catInfo?.bgColor ?? colors.canvas }]}>
                  <Ionicons name={(catInfo?.icon ?? 'ellipsis-horizontal-outline') as any} size={14} color={catInfo?.iconColor ?? colors.textSecondary} />
                  <Text style={[styles.catChipText, { color: catInfo?.iconColor ?? colors.textSecondary }]}>{selectedTx.category}</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedTx(null)}>
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* 금액 */}
              <View style={styles.detailAmtSec}>
                <View style={styles.detailTypeRow}>
                  <View style={styles.expenseTag}>
                    <Text style={styles.expenseTagText}>지출</Text>
                  </View>
                </View>
                <Text style={styles.detailAmt}>₩{selectedTx.amount.toLocaleString()}</Text>
              </View>

              <View style={styles.detailDivider} />

              {/* 메모 */}
              <View style={styles.detailMemoRow}>
                <Ionicons name="chatbubble-outline" size={14} color={colors.inactive} />
                <Text style={styles.detailMemoText}>{selectedTx.memo || '메모 없음'}</Text>
              </View>

              <View style={styles.detailDivider} />

              {/* 기록자 */}
              <View style={styles.detailRecorderRow}>
                <Text style={styles.detailRecorderLabel}>기록자</Text>
                <View style={[styles.recorderBadge, { backgroundColor: personBg }]}>
                  <View style={[styles.dot, { backgroundColor: personColor }]} />
                  <Text style={[styles.recorderName, { color: personColor }]}>
                    {selectedTx.person === 'minji' ? '민지' : '준호'}
                  </Text>
                </View>
              </View>

              {/* 수정/삭제 버튼 — 내 거래만 */}
              {isMe && (
                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedTx(null);
                      Alert.alert('수정', `"${selectedTx.memo}" 내역을 수정합니다.`);
                    }}
                  >
                    <Ionicons name="pencil-outline" size={16} color={colors.text} />
                    <Text style={styles.editBtnText}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      Alert.alert('삭제', `"${selectedTx.memo}" 내역을 삭제할까요?`, [
                        { text: '취소', style: 'cancel' },
                        { text: '삭제', style: 'destructive', onPress: () => setSelectedTx(null) },
                      ]);
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#E05C5C" />
                    <Text style={styles.deleteBtnText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })()}
      </Modal>

      {/* Year/Month Picker Modal */}
      <Modal visible={showYMPicker} animationType="fade" transparent onRequestClose={() => setShowYMPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowYMPicker(false)} />
        <View style={styles.ymCard}>
          <View style={styles.ymHeader}>
            <Text style={styles.ymTitle}>날짜 선택</Text>
            <TouchableOpacity onPress={() => setShowYMPicker(false)}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.ymBody}>
            <View style={styles.ymCol}>
              <TouchableOpacity onPress={() => setPickYear(y => y - 1)}>
                <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.ymSelBox}><Text style={styles.ymSelText}>{pickYear}</Text></View>
              <TouchableOpacity onPress={() => setPickYear(y => y + 1)}>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.ymUnit}>년</Text>
            </View>
            <View style={styles.ymCol}>
              <TouchableOpacity onPress={() => setPickMonth(m => m > 1 ? m - 1 : 12)}>
                <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.ymSelBox}><Text style={styles.ymSelText}>{pickMonth}</Text></View>
              <TouchableOpacity onPress={() => setPickMonth(m => m < 12 ? m + 1 : 1)}>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.ymUnit}>월</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.ymConfirmBtn}
            onPress={() => { setCurrentDate(new Date(pickYear, pickMonth - 1, 1)); setShowYMPicker(false); }}
            activeOpacity={0.85}
          >
            <Text style={styles.ymConfirmText}>확인</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper style function
const filterChipActive = (key: Person) => {
  if (key === 'minji') return { backgroundColor: '#FDF0F6', borderColor: '#C4729A' };
  if (key === 'junho') return { backgroundColor: '#EBF0FF', borderColor: '#4A90D9' };
  return { backgroundColor: colors.primary, borderColor: colors.primary };
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  monthTitleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.canvas },
  monthTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: {} as any,
  filterText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary },
  filterTextActive: { fontFamily: fonts.semiBold, color: colors.text },

  weekRow: { flexDirection: 'row', paddingHorizontal: 4, marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', fontFamily: fonts.semiBold, fontSize: 11, color: colors.textSecondary },

  grid: { flex: 1 },
  gridInner: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4 },
  cell: {
    width: '14.28%', minHeight: 68, padding: 5,
    borderTopWidth: 1, borderTopColor: colors.border,
    alignItems: 'flex-start',
  },
  cellToday: { backgroundColor: '#EDF5F0' },
  dayNum: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text, marginBottom: 2 },
  dayNumToday: { color: colors.primary },
  dayTotal: { fontFamily: fonts.regular, fontSize: 10, color: colors.textSecondary, marginBottom: 3 },
  dotRow: { flexDirection: 'row', gap: 3 },
  personDot: { width: 6, height: 6, borderRadius: 3 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '60%',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, marginBottom: 14 },
  emptyText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 },

  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  personBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  personName: { fontFamily: fonts.semiBold, fontSize: 11 },
  txMeta: { flex: 1 },
  txCategory: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.text },
  txMemo: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  txEditBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.canvas },
  txEditText: { fontFamily: fonts.medium, fontSize: 10, color: colors.primary },

  // Year/Month picker
  ymCard: {
    position: 'absolute', top: '30%', left: '10%', right: '10%',
    backgroundColor: colors.card, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  ymHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  ymTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  ymBody: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 20 },
  ymCol: { alignItems: 'center', gap: 8 },
  ymUnit: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  ymSelBox: { width: 80, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  ymSelText: { fontFamily: fonts.bold, fontSize: 18, color: '#FFFFFF' },
  ymConfirmBtn: { backgroundColor: colors.primary, borderRadius: 100, height: 48, alignItems: 'center', justifyContent: 'center' },
  ymConfirmText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#FFFFFF' },

  sheetTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  sheetTotalLabel: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textSecondary },
  sheetTotalVal: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },

  // 거래 상세 시트 (tcF6p)
  detailSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 52 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  catChipText: { fontFamily: fonts.semiBold, fontSize: 13 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  detailAmtSec: { gap: 4, paddingVertical: 8, paddingHorizontal: 4 },
  detailTypeRow: { flexDirection: 'row' },
  expenseTag: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  expenseTagText: { fontFamily: fonts.medium, fontSize: 11, color: '#E05C5C' },
  detailAmt: { fontFamily: fonts.bold, fontSize: 34, color: colors.text, letterSpacing: -1 },
  detailDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  detailMemoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  detailMemoText: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, flex: 1 },
  detailRecorderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  detailRecorderLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  recorderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  recorderName: { fontFamily: fonts.semiBold, fontSize: 12 },
  detailActions: { flexDirection: 'row', gap: 12, paddingTop: 8, paddingBottom: 24 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 12, backgroundColor: colors.canvas },
  editBtnText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  deleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 12, backgroundColor: '#FFF0F0' },
  deleteBtnText: { fontFamily: fonts.semiBold, fontSize: 14, color: '#E05C5C' },
});
