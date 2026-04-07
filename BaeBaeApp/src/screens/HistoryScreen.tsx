import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  ScrollView, Modal, Alert, TextInput, KeyboardAvoidingView, Platform, Image,
  useWindowDimensions,
} from 'react-native';
const MEMO_MAX = 50;
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/colors';
import { useTransactions, type Transaction } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import PhotoViewerModal from '../components/PhotoViewerModal';
import WheelPicker, { YEARS, MONTHS, ITEM_H } from '../components/WheelPicker';
import TxCommentSection from '../components/TxCommentSection';

type TimeSlot = '아침' | '점심' | '저녁';
const TIME_SLOTS: TimeSlot[] = ['아침', '점심', '저녁'];
const TIME_EMOJI: Record<TimeSlot, string> = { 아침: '🌅', 점심: '☀️', 저녁: '🌙' };

function getDateLabel(dateStr: string): string {
  const today = new Date();
  const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === t) return '오늘';
  if (dateStr === y) return '어제';
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

function TxRow({ tx, onPress }: { tx: Transaction; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.txRow} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.txIconWrap, { backgroundColor: tx.categoryBgColor }]}>
        <Ionicons name={tx.categoryIcon as any} size={18} color={tx.categoryIconColor} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txMemo} numberOfLines={1} ellipsizeMode="tail">{tx.memo || tx.category}</Text>
        <View style={styles.txMeta}>
          <Text style={styles.txMetaText}>{tx.time} · {tx.category} · </Text>
          <Text style={[styles.txMetaName, { color: colors.primary }]}>{tx.person}</Text>
          <Text style={styles.txMetaText}> · </Text>
          <View style={[styles.payBadge, { backgroundColor: tx.payMethod === 'cash' ? '#F0F4FF' : '#FFF0F6' }]}>
            <Text style={[styles.payBadgeText, { color: tx.payMethod === 'cash' ? '#4A6CF7' : '#E05C9C' }]}>
              {tx.payMethod === 'cash' ? '현금' : tx.cardName ? tx.cardName : '카드'}
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.txAmount, { color: tx.type === 'income' ? colors.primary : colors.secondary }]} allowFontScaling={false}>
        {tx.type === 'income' ? '+' : '-'}₩{tx.amount.toLocaleString()}
      </Text>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = windowHeight - insets.top - 24;
  const { transactions, deleteTransaction, updateTransaction } = useTransactions();
  const { user, partnerName, householdId, partnerId } = useAuth();
  const { myName: profileName } = useProfile();
  const [activeFilter, setActiveFilter] = useState<'전체' | '지출' | '수입'>('전체');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const [editTime, setEditTime] = useState<'아침' | '점심' | '저녁'>('아침');
  const [viewPhotoUri, setViewPhotoUri] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [sortOrder, setSortOrder] = useState<'recent' | 'high' | 'low'>('recent');
  const [personFilter, setPersonFilter] = useState<'전체' | '나' | '파트너'>('전체');
  const [payFilter, setPayFilter] = useState<'전체' | '현금' | '카드'>('전체');

  const myName = profileName || user?.name || '나';
  const isFilterActive = sortOrder !== 'recent' || (partnerName ? personFilter !== '전체' : false) || payFilter !== '전체';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [pickYearIdx, setPickYearIdx] = useState(YEARS.indexOf(now.getFullYear()));
  const [pickMonthIdx, setPickMonthIdx] = useState(now.getMonth());

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (!tx.date.startsWith(monthStr)) return false;
      if (activeFilter === '지출' && tx.type !== 'expense') return false;
      if (activeFilter === '수입' && tx.type !== 'income') return false;
      if (personFilter === '나' && tx.person !== myName) return false;
      if (personFilter === '파트너' && tx.person === myName) return false;
      if (payFilter === '현금' && tx.payMethod !== 'cash') return false;
      if (payFilter === '카드' && tx.payMethod !== 'card') return false;
      return true;
    });
  }, [transactions, monthStr, activeFilter, personFilter, myName]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortOrder === 'high') return b.amount - a.amount;
      if (sortOrder === 'low') return a.amount - b.amount;
      return b.date.localeCompare(a.date);
    });
  }, [filtered, sortOrder]);

  const groups = useMemo(() => {
    if (sortOrder !== 'recent') return null;
    const map: Record<string, Transaction[]> = {};
    sortedFiltered.forEach(tx => {
      const label = getDateLabel(tx.date);
      (map[label] = map[label] ?? []).push(tx);
    });
    return map;
  }, [sortedFiltered, sortOrder]);

  const GROUP_ORDER = groups ? Object.keys(groups) : [];

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} allowFontScaling={false}>거래 내역</Text>
        <TouchableOpacity
          style={[styles.iconBtn, isFilterActive && styles.iconBtnActive]}
          onPress={() => setShowFilterSheet(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={20} color={isFilterActive ? '#FFFFFF' : colors.text} />
          {isFilterActive && <View style={styles.filterBadge} />}
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
        <TouchableOpacity
          style={styles.monthBtn}
          onPress={() => {
            setPickYearIdx(YEARS.indexOf(year));
            setPickMonthIdx(month - 1);
            setShowDatePicker(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.monthLabel}>{year}년 {month}월</Text>
          <Ionicons name="chevron-down" size={14} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setMonth(m => m < 12 ? m + 1 : 1)} activeOpacity={0.8}>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        {[
          { label: '수입', value: `+₩${totalIncome.toLocaleString()}`,   color: colors.primary },
          { label: '지출', value: `-₩${totalExpense.toLocaleString()}`,  color: colors.secondary },
          { label: '잔액', value: `₩${balance.toLocaleString()}`,        color: colors.text },
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
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {sortedFiltered.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={40} color={colors.border} />
            <Text style={styles.emptyText}>이번 달 거래 내역이 없어요</Text>
          </View>
        )}
        {groups !== null
          ? GROUP_ORDER.filter(g => groups[g]?.length).map((dateGroup) => (
            <View key={dateGroup}>
              <Text style={styles.dateHeader}>{dateGroup}</Text>
              {groups[dateGroup].map((tx) => <TxRow key={tx.id} tx={tx} onPress={() => setSelectedTx(tx)} />)}
            </View>
          ))
          : sortedFiltered.map((tx) => <TxRow key={tx.id} tx={tx} onPress={() => setSelectedTx(tx)} />)
        }
      </ScrollView>

      {/* Transaction Detail Bottom Sheet */}
      <Modal visible={!!selectedTx} animationType="slide" transparent onRequestClose={() => setSelectedTx(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelectedTx(null)} />
        {selectedTx && (
          <KeyboardAvoidingView
            style={styles.sheetKav}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[styles.sheet, { height: sheetHeight }]}>
              <View style={styles.sheetHandle} />
                <View style={styles.sheetTopRow}>
                  <View style={[styles.catChip, { backgroundColor: selectedTx.categoryBgColor }]}>
                    <Ionicons name={selectedTx.categoryIcon as any} size={14} color={selectedTx.categoryIconColor} />
                    <Text style={[styles.catChipText, { color: selectedTx.categoryIconColor }]}>{selectedTx.category}</Text>
                  </View>
                  <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setSelectedTx(null)}>
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.sheetMetaRow}>
                  <View style={[styles.personBadge, { backgroundColor: colors.primaryLighter }]}>
                    <Text style={[styles.personBadgeText, { color: colors.primary }]}>{selectedTx.person}</Text>
                  </View>
                  <View style={[styles.payBadge, { backgroundColor: selectedTx.payMethod === 'cash' ? '#F0F4FF' : '#FFF0F6' }]}>
                    <Text style={[styles.payBadgeText, { color: selectedTx.payMethod === 'cash' ? '#4A6CF7' : '#E05C9C' }]}>
                      {selectedTx.payMethod === 'cash' ? '현금' : selectedTx.cardName ? selectedTx.cardName : '카드'}
                    </Text>
                  </View>
                  <Text style={styles.sheetDate}>{getDateLabel(selectedTx.date)}</Text>
                </View>
                <Text style={[styles.sheetAmt, { color: selectedTx.type === 'income' ? colors.primary : colors.text }]} allowFontScaling={false}>
                  {selectedTx.type === 'income' ? '+' : '-'}₩{selectedTx.amount.toLocaleString()}
                </Text>
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
                <View style={styles.memoSec}>
                  <Text style={styles.memoLbl}>메모</Text>
                  <ScrollView style={styles.memoScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    <Text style={styles.memoTxt}>{selectedTx.memo || '(메모 없음)'}</Text>
                  </ScrollView>
                </View>
                {selectedTx.photoUri && (
                  <>
                    <View style={styles.sheetDivider} />
                    <View style={styles.photoSec}>
                      <Text style={styles.memoLbl}>첨부 사진</Text>
                      <TouchableOpacity
                        onPress={() => {
                          const uri = selectedTx.photoUri!;
                          setSelectedTx(null);
                          setViewPhotoUri(uri);
                        }}
                        activeOpacity={0.85}
                      >
                        <Image source={{ uri: selectedTx.photoUri }} style={styles.txPhoto} resizeMode="cover" />
                        <View style={styles.photoExpandBtn}>
                          <Ionicons name="expand-outline" size={16} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                <View style={styles.sheetDivider} />
                <View style={{ flex: 1 }}>
                  <TxCommentSection
                    txId={selectedTx.id}
                    householdId={householdId}
                    userId={user?.id ?? ''}
                    userName={myName}
                    partnerUserId={partnerId ?? undefined}
                  />
                  {/* 수정/삭제 — 내 거래만, 시트 하단 고정 */}
                  {selectedTx.person === myName ? (
                    <View style={[styles.actionRow, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                      <TouchableOpacity
                        style={styles.editBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          setEditTx(selectedTx);
                          setEditAmount(String(selectedTx.amount));
                          setEditMemo(selectedTx.memo);
                          setEditTime(selectedTx.time);
                          setSelectedTx(null);
                        }}
                      >
                        <Text style={styles.editBtnText}>수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.delBtn}
                        activeOpacity={0.8}
                        onPress={() => Alert.alert('삭제', '이 내역을 삭제할까요?', [
                          { text: '취소', style: 'cancel' },
                          { text: '삭제', style: 'destructive', onPress: () => { deleteTransaction(selectedTx.id); setSelectedTx(null); }},
                        ])}
                      >
                        <Text style={styles.delBtnText}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.viewOnlyRow, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                      <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
                      <Text style={styles.viewOnlyText}>{selectedTx.person}이(가) 등록한 내역입니다</Text>
                    </View>
                  )}
                </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* Filter Bottom Sheet */}
      <Modal visible={showFilterSheet} animationType="slide" transparent onRequestClose={() => setShowFilterSheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowFilterSheet(false)} />
        <View style={[styles.filterSheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.filterSheetHeader}>
            <Text style={styles.filterSheetTitle}>필터</Text>
            <TouchableOpacity
              onPress={() => { setSortOrder('recent'); if (partnerName) setPersonFilter('전체'); setPayFilter('전체'); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.filterResetText}>초기화</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.filterSectionLabel}>정렬</Text>
          <View style={styles.filterChipRow}>
            {([
              { key: 'recent', label: '최신순' },
              { key: 'high',   label: '최고금액순' },
              { key: 'low',    label: '최저금액순' },
            ] as const).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, sortOrder === key && styles.filterChipActive]}
                onPress={() => setSortOrder(key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, sortOrder === key && styles.filterChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {partnerName && (
            <>
              <Text style={styles.filterSectionLabel}>대상</Text>
              <View style={styles.filterChipRow}>
                {(['전체', '나', '파트너'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.filterChip, personFilter === p && styles.filterChipActive]}
                    onPress={() => setPersonFilter(p)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterChipText, personFilter === p && styles.filterChipTextActive]}>{p === '나' ? myName : p === '파트너' ? partnerName : p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.filterSectionLabel}>결제수단</Text>
          <View style={styles.filterChipRow}>
            {(['전체', '현금', '카드'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.filterChip, payFilter === p && styles.filterChipActive]}
                onPress={() => setPayFilter(p)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, payFilter === p && styles.filterChipTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.filterConfirmBtn} onPress={() => setShowFilterSheet(false)} activeOpacity={0.85}>
            <Text style={styles.filterConfirmText}>적용</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Edit Transaction Bottom Sheet */}
      <Modal visible={!!editTx} animationType="slide" transparent onRequestClose={() => setEditTx(null)}>
        <KeyboardAvoidingView style={styles.editModalWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setEditTx(null)} />
          {editTx && (
            <View style={[styles.editSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.editHeader}>
                <Text style={styles.editTitle}>내역 수정</Text>
                <TouchableOpacity onPress={() => setEditTx(null)}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* 금액 */}
              <Text style={styles.editLabel}>금액</Text>
              <TextInput
                style={styles.editInput}
                value={editAmount}
                onChangeText={(v) => setEditAmount(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                placeholder="금액 입력"
                placeholderTextColor={colors.inactive}
              />

              {/* 메모 */}
              <Text style={styles.editLabel}>메모</Text>
              <TextInput
                style={styles.editInput}
                value={editMemo}
                onChangeText={setEditMemo}
                placeholder="메모 입력"
                placeholderTextColor={colors.inactive}
                maxLength={MEMO_MAX}
              />

              {/* 시간대 */}
              <Text style={styles.editLabel}>시간대</Text>
              <View style={styles.timeRow}>
                {TIME_SLOTS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, editTime === t && styles.timeChipActive]}
                    onPress={() => setEditTime(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.timeChipText, editTime === t && styles.timeChipTextActive]}>
                      {TIME_EMOJI[t]} {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 저장 */}
              <TouchableOpacity
                style={styles.editSaveBtn}
                activeOpacity={0.85}
                onPress={async () => {
                  const amt = parseInt(editAmount, 10);
                  if (!amt || amt <= 0) { Alert.alert('알림', '올바른 금액을 입력해주세요.'); return; }
                  await updateTransaction(editTx.id, { amount: amt, memo: editMemo, time: editTime });
                  setEditTx(null);
                  Alert.alert('수정 완료', '내역이 수정되었습니다.');
                }}
              >
                <Text style={styles.editSaveBtnText}>저장하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      <PhotoViewerModal uri={viewPhotoUri} onClose={() => setViewPhotoUri(null)} />

      {/* Date Picker Bottom Sheet */}
      <Modal visible={showDatePicker} animationType="slide" transparent onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.ymModalWrap}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowDatePicker(false)} />
          <View style={[styles.ymSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.ymHeader}>
              <Text style={styles.ymTitle}>날짜 선택</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
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
            <TouchableOpacity
              style={styles.ymConfirmBtn}
              onPress={() => {
                setYear(YEARS[pickYearIdx]);
                setMonth(MONTHS[pickMonthIdx]);
                setShowDatePicker(false);
              }}
              activeOpacity={0.85}
            >
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
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { backgroundColor: colors.primary },
  filterBadge: { position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B6B' },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 100, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 6 },
  navBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  monthBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.canvas },
  monthLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },

  summaryBar: { flexDirection: 'row', backgroundColor: colors.card, marginHorizontal: 20, borderRadius: 14, padding: 14, marginVertical: 8 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryLbl: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  summaryVal: { fontFamily: fonts.semiBold, fontSize: 13 },
  summaryDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 },

  list: { flex: 1, paddingHorizontal: 20 },
  emptyWrap: { alignItems: 'center', gap: 12, paddingTop: 60 },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  dateHeader: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.text, paddingVertical: 8 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  txIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1, gap: 2 },
  txMemo: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  txMeta: { flexDirection: 'row', alignItems: 'center' },
  txMetaText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  txMetaName: { fontFamily: fonts.bold, fontSize: 12 },
  txAmount: { fontFamily: fonts.bold, fontSize: 15 },
  payBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  payBadgeText: { fontFamily: fonts.semiBold, fontSize: 10 },

  // --- Detail sheet ---
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheetKav: { position: 'absolute', bottom: 0, left: 0, right: 0, justifyContent: 'flex-end' },
  sheet: {
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
  sheetAmt: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 42, marginBottom: 14 },
  timeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  timeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: colors.canvas },
  timeChipActive: { backgroundColor: colors.primary },
  timeChipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  timeChipTextActive: { color: '#FFFFFF' },
  sheetDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginBottom: 14 },
  memoSec: { gap: 4, marginBottom: 14 },
  memoLbl: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  memoScroll: { maxHeight: 72 },
  memoTxt: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 22 },
  photoSec: { gap: 8, marginBottom: 14 },
  txPhoto: { width: '100%', height: 120, borderRadius: 12 },
  photoExpandBtn: {
    position: 'absolute', bottom: 8, right: 8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  actionRow: { flexDirection: 'row', gap: 12 },
  editBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  delBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
  delBtnText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#E05C5C' },
  viewOnlyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  viewOnlyText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },

  // --- Date picker bottom sheet ---
  ymModalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  ymSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  ymHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48, paddingHorizontal: 20 },
  ymTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  ymDivider: { height: 1, backgroundColor: colors.border },
  ymPickerRow: { flexDirection: 'row', height: ITEM_H * 5, marginTop: 8 },
  ymConfirmBtn: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  ymConfirmText: { fontFamily: fonts.semiBold, fontSize: 16, color: '#FFFFFF' },

  // --- Filter bottom sheet ---
  filterSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20 },
  filterSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 52 },
  filterSheetTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  filterResetText: { fontFamily: fonts.medium, fontSize: 13, color: colors.primary },
  filterSectionLabel: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textSecondary, marginBottom: 10, marginTop: 16 },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
  filterChipTextActive: { color: '#FFFFFF', fontFamily: fonts.semiBold },
  filterConfirmBtn: { marginTop: 24, backgroundColor: colors.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  filterConfirmText: { fontFamily: fonts.semiBold, fontSize: 16, color: '#FFFFFF' },

  // --- Edit sheet ---
  editModalWrap: { flex: 1, justifyContent: 'flex-end' },
  editSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48, marginBottom: 4 },
  editTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  editLabel: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textSecondary, marginBottom: 8, marginTop: 14 },
  editInput: { backgroundColor: colors.canvas, borderRadius: 12, borderWidth: 1, borderColor: colors.border, height: 48, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  editSaveBtn: { marginTop: 20, backgroundColor: colors.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  editSaveBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: '#FFFFFF' },

  // --- Wheel picker ---
  // WheelPicker styles are in ../components/WheelPicker.tsx
});
