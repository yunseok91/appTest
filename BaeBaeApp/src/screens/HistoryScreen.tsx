import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  ScrollView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/colors';

const ME = 'minji'; // 로그인된 사용자

type TimeSlot = '아침' | '점심' | '저녁';
type Person = 'minji' | 'junho';

type Transaction = {
  id: number;
  category: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  memo: string;
  amount: number;
  dateGroup: string;
  time: TimeSlot;
  person: Person;
};

const DUMMY: Transaction[] = [
  { id: 1, category: '식비',     iconName: 'restaurant-outline', iconColor: '#D89575', iconBg: '#FFF3E8', memo: '스타벅스',      amount: -6500,    dateGroup: '오늘',    time: '아침', person: 'minji' },
  { id: 2, category: '교통',     iconName: 'bus-outline',        iconColor: '#4A90D9', iconBg: '#EBF4FF', memo: '버스 교통카드', amount: -1400,    dateGroup: '오늘',    time: '점심', person: 'junho' },
  { id: 3, category: '수입',     iconName: 'cash-outline',       iconColor: '#3D8A5A', iconBg: '#E8F5EC', memo: '급여 입금',     amount: 2300000,  dateGroup: '어제',    time: '아침', person: 'junho' },
  { id: 4, category: '문화/여가', iconName: 'film-outline',       iconColor: '#7B5FA0', iconBg: '#F0EBFF', memo: 'CGV',           amount: -25000,   dateGroup: '어제',    time: '저녁', person: 'minji' },
  { id: 5, category: '쇼핑',     iconName: 'bag-handle-outline', iconColor: '#C45FAA', iconBg: '#F5EDFF', memo: '올리브영',      amount: -45000,   dateGroup: '3월 13일', time: '점심', person: 'minji' },
  { id: 6, category: '교통',     iconName: 'bus-outline',        iconColor: '#4A90D9', iconBg: '#EBF4FF', memo: '택시',          amount: -9800,    dateGroup: '3월 12일', time: '저녁', person: 'junho' },
];

const TIME_SLOTS: TimeSlot[] = ['아침', '점심', '저녁'];
const TIME_EMOJI: Record<TimeSlot, string> = { 아침: '🌅', 점심: '☀️', 저녁: '🌙' };

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<'전체' | '지출' | '수입'>('전체');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(3);

  const filtered = DUMMY.filter(item => {
    if (activeFilter === '지출') return item.amount < 0;
    if (activeFilter === '수입') return item.amount > 0;
    return true;
  });

  const groups = filtered.reduce<Record<string, Transaction[]>>((acc, tx) => {
    (acc[tx.dateGroup] = acc[tx.dateGroup] ?? []).push(tx);
    return acc;
  }, {});

  const GROUP_ORDER = ['오늘', '어제', '3월 13일', '3월 12일'];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>거래 내역</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
          <Ionicons name="options-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {(['전체', '지출', '수입'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, activeFilter === f && styles.chipActive]}
            onPress={() => setActiveFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setMonth(m => m > 1 ? m - 1 : 12)} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{year}년 {month}월</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => setMonth(m => m < 12 ? m + 1 : 1)} activeOpacity={0.8}>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        {[
          { label: '수입', value: '+₩2,300,000', color: colors.primary },
          { label: '지출', value: '-₩77,900',    color: colors.secondary },
          { label: '잔액', value: '₩2,222,100',  color: colors.text },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.summaryDivider} />}
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLbl}>{s.label}</Text>
              <Text style={[styles.summaryVal, { color: s.color }]}>{s.value}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Transaction list */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {GROUP_ORDER.filter(g => groups[g]?.length).map((dateGroup) => (
          <View key={dateGroup}>
            <Text style={styles.dateHeader}>{dateGroup}</Text>
            {groups[dateGroup].map((tx) => (
              <TouchableOpacity
                key={tx.id}
                style={styles.txRow}
                onPress={() => setSelectedTx(tx)}
                activeOpacity={0.75}
              >
                <View style={[styles.txIconWrap, { backgroundColor: tx.iconBg }]}>
                  <Ionicons name={tx.iconName} size={18} color={tx.iconColor} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txMemo}>{tx.memo}</Text>
                  <View style={styles.txMeta}>
                    <Text style={styles.txMetaText}>{tx.time} · {tx.category} · </Text>
                    <Text style={[styles.txMetaName, { color: tx.person === 'minji' ? '#C4729A' : '#4A90D9' }]}>
                      {tx.person === 'minji' ? '민지' : '준호'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.txAmount, { color: tx.amount > 0 ? colors.primary : colors.secondary }]}>
                  {tx.amount > 0 ? '+' : ''}₩{Math.abs(tx.amount).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Transaction Detail Bottom Sheet */}
      <Modal visible={!!selectedTx} animationType="slide" transparent onRequestClose={() => setSelectedTx(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelectedTx(null)} />
        {selectedTx && (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            {/* Category chip + close */}
            <View style={styles.sheetTopRow}>
              <View style={[styles.catChip, { backgroundColor: selectedTx.iconBg }]}>
                <Ionicons name={selectedTx.iconName} size={14} color={selectedTx.iconColor} />
                <Text style={[styles.catChipText, { color: selectedTx.iconColor }]}>{selectedTx.category}</Text>
              </View>
              <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setSelectedTx(null)}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {/* Date + person */}
            <View style={styles.sheetMetaRow}>
              <View style={[styles.personBadge, { backgroundColor: selectedTx.person === 'minji' ? '#FDF0F6' : '#EBF0FF' }]}>
                <Text style={[styles.personBadgeText, { color: selectedTx.person === 'minji' ? '#C4729A' : '#4A90D9' }]}>
                  {selectedTx.person === 'minji' ? '민지' : '준호'}
                </Text>
              </View>
              <Text style={styles.sheetDate}>{selectedTx.dateGroup}</Text>
            </View>
            {/* Amount */}
            <Text style={[styles.sheetAmt, { color: selectedTx.amount > 0 ? colors.primary : colors.text }]}>
              {selectedTx.amount > 0 ? '+' : ''}₩{Math.abs(selectedTx.amount).toLocaleString()}
            </Text>
            {/* Time selector */}
            <View style={styles.timeRow}>
              {TIME_SLOTS.map((t) => (
                <View key={t} style={[styles.timeChip, selectedTx.time === t && styles.timeChipActive]}>
                  <Text style={[styles.timeChipText, selectedTx.time === t && styles.timeChipTextActive]}>
                    {TIME_EMOJI[t]} {t}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.sheetDivider} />
            {/* Memo */}
            <View style={styles.memoSec}>
              <Text style={styles.memoLbl}>메모</Text>
              <Text style={styles.memoTxt}>{selectedTx.memo}</Text>
            </View>
            <View style={styles.sheetDivider} />
            {/* Actions — only if my record */}
            {selectedTx.person === ME ? (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
                  <Text style={styles.editBtnText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} activeOpacity={0.8}>
                  <Text style={styles.delBtnText}>삭제</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.viewOnlyRow}>
                <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
                <Text style={styles.viewOnlyText}>파트너가 등록한 내역입니다</Text>
              </View>
            )}
          </View>
        )}
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} animationType="fade" transparent onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowDatePicker(false)} />
        <View style={styles.datePicker}>
          <View style={styles.datePickerHeader}>
            <Text style={styles.datePickerTitle}>날짜 선택</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.datePickerBody}>
            {/* Year */}
            <View style={styles.dateCol}>
              <TouchableOpacity onPress={() => setYear(y => y - 1)}>
                <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.dateSelBox}>
                <Text style={styles.dateSelText}>{year}</Text>
              </View>
              <TouchableOpacity onPress={() => setYear(y => y + 1)}>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.dateUnit}>년</Text>
            </View>
            {/* Month */}
            <View style={styles.dateCol}>
              <TouchableOpacity onPress={() => setMonth(m => m > 1 ? m - 1 : 12)}>
                <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.dateSelBox}>
                <Text style={styles.dateSelText}>{month}</Text>
              </View>
              <TouchableOpacity onPress={() => setMonth(m => m < 12 ? m + 1 : 1)}>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.dateUnit}>월</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.dateConfirmBtn} onPress={() => setShowDatePicker(false)} activeOpacity={0.85}>
            <Text style={styles.dateConfirmText}>확인</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 100, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 6 },
  navBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },

  summaryBar: { flexDirection: 'row', backgroundColor: colors.card, marginHorizontal: 20, borderRadius: 14, padding: 14, marginVertical: 8 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryLbl: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  summaryVal: { fontFamily: fonts.semiBold, fontSize: 13 },
  summaryDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

  list: { flex: 1, paddingHorizontal: 20 },
  dateHeader: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.text, paddingVertical: 8 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  txIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1, gap: 2 },
  txMemo: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  txMeta: { flexDirection: 'row', alignItems: 'center' },
  txMetaText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  txMetaName: { fontFamily: fonts.bold, fontSize: 12 },
  txAmount: { fontFamily: fonts.bold, fontSize: 15 },

  // --- Detail sheet ---
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  sheetTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  catChipText: { fontFamily: fonts.semiBold, fontSize: 13 },
  sheetCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  sheetMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  personBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  personBadgeText: { fontFamily: fonts.semiBold, fontSize: 11 },
  sheetDate: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  sheetAmt: { fontFamily: fonts.bold, fontSize: 34, marginBottom: 14 },
  timeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  timeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: colors.canvas },
  timeChipActive: { backgroundColor: colors.primary },
  timeChipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  timeChipTextActive: { color: '#FFFFFF' },
  sheetDivider: { height: 1, backgroundColor: colors.border, marginBottom: 14 },
  memoSec: { gap: 4, marginBottom: 14 },
  memoLbl: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  memoTxt: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  actionRow: { flexDirection: 'row', gap: 12 },
  editBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  delBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
  delBtnText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#E05C5C' },
  viewOnlyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  viewOnlyText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },

  // --- Date picker ---
  datePicker: {
    position: 'absolute', top: '30%', left: '10%', right: '10%',
    backgroundColor: colors.card, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  datePickerTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  datePickerBody: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 20 },
  dateCol: { alignItems: 'center', gap: 8 },
  dateUnit: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  dateSelBox: { width: 80, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  dateSelText: { fontFamily: fonts.bold, fontSize: 18, color: '#FFFFFF' },
  dateConfirmBtn: { backgroundColor: colors.primary, borderRadius: 100, height: 48, alignItems: 'center', justifyContent: 'center' },
  dateConfirmText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#FFFFFF' },
});
