import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Modal, ScrollView, Alert, TextInput, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
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

type PersonFilter = 'all' | 'me' | 'partner';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatW(amount: number) {
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}천`;
  return `${amount}`;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { transactions, deleteTransaction, updateTransaction } = useTransactions();
  const { user, partnerName, householdId, partnerId } = useAuth();
  const { myName: profileName } = useProfile();
  const myName = profileName || user?.name || '나';
  const detailScrollRef = useRef<import('react-native').ScrollView>(null);

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [filter, setFilter] = useState<PersonFilter>('all');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [viewPhotoUri, setViewPhotoUri] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const [editTime, setEditTime] = useState<TimeSlot>('아침');
  const [showYMPicker, setShowYMPicker] = useState(false);
  const [gridHeight, setGridHeight] = useState(0);
  const [pickYearIdx, setPickYearIdx] = useState(YEARS.indexOf(today.getFullYear()));
  const [pickMonthIdx, setPickMonthIdx] = useState(today.getMonth());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const dateKey = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  // 이번 달 지출 거래만 추출
  const monthlyExpenses = useMemo(() =>
    transactions.filter(tx => tx.type === 'expense' && tx.date.startsWith(monthStr)),
    [transactions, monthStr]
  );

  const cells = useMemo(() => {
    const arr: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [firstDay, daysInMonth]);

  const dayTransactions = (day: number): Transaction[] => {
    const key = dateKey(day);
    return monthlyExpenses.filter(tx => {
      if (tx.date !== key) return false;
      if (filter === 'me') return tx.person === myName;
      if (filter === 'partner') return tx.person !== myName;
      return true;
    });
  };

  const dayTotal = (day: number) =>
    dayTransactions(day).reduce((s, t) => s + t.amount, 0);

  const filteredTx = selectedDay ? monthlyExpenses.filter(tx => {
    if (tx.date !== selectedDay) return false;
    if (filter === 'me') return tx.person === myName;
    if (filter === 'partner') return tx.person !== myName;
    return true;
  }) : [];

  const hasMe = (day: number) => dayTransactions(day).some(t => t.person === myName);
  const hasPartner = (day: number) => dayTransactions(day).some(t => t.person !== myName);

  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.monthTitleBtn}
          onPress={() => { setPickYearIdx(YEARS.indexOf(year)); setPickMonthIdx(month); setShowYMPicker(true); }}
          activeOpacity={0.8}
        >
          <Text style={styles.monthTitle} allowFontScaling={false}>{year}년 {month + 1}월</Text>
          <Ionicons name="chevron-down" size={14} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {([['all', '전체'], ['me', myName], ['partner', partnerName || '파트너']] as [PersonFilter, string][]).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, filter === key && filterChipActive(key)]}
            onPress={() => setFilter(key)}
            activeOpacity={0.8}
          >
            {key !== 'all' && (
              <View style={[styles.dot, { backgroundColor: key === 'me' ? '#C4729A' : '#4A90D9' }]} />
            )}
            <Text style={[
              styles.filterText,
              filter === key && { fontFamily: fonts.semiBold,
                color: key === 'all' ? '#FFFFFF' : key === 'me' ? '#C4729A' : '#4A90D9' },
            ]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={d} style={[styles.weekDay, i === 0 && { color: '#E05C5C' }, i === 6 && { color: '#4A90D9' }]}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid — rows fill available height evenly */}
      <View style={styles.grid} onLayout={(e) => setGridHeight(e.nativeEvent.layout.height)}>
        {Array.from({ length: cells.length / 7 }, (_, wi) => (
          <View key={wi} style={[styles.weekRowGrid, gridHeight > 0 && { height: gridHeight / (cells.length / 7) }]}>
            {cells.slice(wi * 7, wi * 7 + 7).map((day, di) => {
              const idx = wi * 7 + di;
              if (!day) return <View key={`e-${idx}`} style={styles.cell} />;
              const key = dateKey(day);
              const total = dayTotal(day);
              const hasTx = total > 0;

              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.cell, isToday(day) && styles.cellToday]}
                  onPress={() => hasTx && setSelectedDay(key)}
                  activeOpacity={hasTx ? 0.7 : 1}
                >
                  <Text style={[
                    styles.dayNum,
                    di === 0 && { color: '#E05C5C' },
                    di === 6 && { color: '#4A90D9' },
                    isToday(day) && styles.dayNumToday,
                  ]}>{day}</Text>
                  {total > 0 && (
                    <Text style={styles.dayTotal}>{formatW(total)}</Text>
                  )}
                  {hasTx && (
                    <View style={styles.dotRow}>
                      {(filter === 'all' || filter === 'me') && hasMe(day) && (
                        <View style={[styles.personDot, { backgroundColor: '#C4729A' }]} />
                      )}
                      {(filter === 'all' || filter === 'partner') && hasPartner(day) && (
                        <View style={[styles.personDot, { backgroundColor: '#4A90D9' }]} />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

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
                filteredTx.map((tx) => {
                  const isMe = tx.person === myName;
                  return (
                  <TouchableOpacity
                    key={tx.id}
                    style={styles.txRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedDay(null);
                      setSelectedTx(tx);
                    }}
                  >
                    <View style={[styles.personBadge, { backgroundColor: isMe ? '#FDF0F6' : '#EBF0FF' }]}>
                      <View style={[styles.dot, { backgroundColor: isMe ? '#C4729A' : '#4A90D9' }]} />
                      <Text style={[styles.personName, { color: isMe ? '#C4729A' : '#4A90D9' }]}>{tx.person}</Text>
                    </View>
                    <View style={styles.txMeta}>
                      <Text style={styles.txCategory}>{tx.category}</Text>
                      <Text style={styles.txMemo}>{tx.memo}</Text>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={styles.txAmount} allowFontScaling={false}>₩{tx.amount.toLocaleString()}</Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.inactive} />
                    </View>
                  </TouchableOpacity>
                  );
                })
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
          const isMe = selectedTx.person === myName;
          const personColor = isMe ? '#C4729A' : '#4A90D9';
          const personBg = isMe ? '#FDF0F6' : '#EBF0FF';
          return (
            <KeyboardAvoidingView
              style={styles.detailSheetKav}
              behavior="padding"
            >
              <View style={styles.detailSheet}>
                <View style={styles.sheetHandle} />
                <ScrollView
                  ref={detailScrollRef}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                >
                  {/* 헤더: 카테고리 칩 + 닫기 */}
                  <View style={styles.detailHeader}>
                    <View style={[styles.catChip, { backgroundColor: selectedTx.categoryBgColor }]}>
                      <Ionicons name={selectedTx.categoryIcon as any} size={14} color={selectedTx.categoryIconColor} />
                      <Text style={[styles.catChipText, { color: selectedTx.categoryIconColor }]}>{selectedTx.category}</Text>
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
                    <Text style={styles.detailAmt} allowFontScaling={false}>₩{selectedTx.amount.toLocaleString()}</Text>
                  </View>

                  <View style={styles.detailDivider} />

                  {/* 메모 */}
                  <View style={styles.detailMemoRow}>
                    <Ionicons name="chatbubble-outline" size={14} color={colors.inactive} />
                    <Text style={styles.detailMemoText}>{selectedTx.memo || '메모 없음'}</Text>
                  </View>

                  {selectedTx.photoUri && (
                    <>
                      <View style={styles.detailDivider} />
                      <TouchableOpacity
                        onPress={() => {
                          const uri = selectedTx.photoUri!;
                          setSelectedTx(null);
                          setViewPhotoUri(uri);
                        }}
                        activeOpacity={0.85}
                      >
                        <Image source={{ uri: selectedTx.photoUri }} style={styles.detailPhoto} resizeMode="cover" />
                        <View style={styles.photoExpandBtn}>
                          <Ionicons name="expand-outline" size={16} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    </>
                  )}

                  <View style={styles.detailDivider} />

                  {/* 기록자 */}
                  <View style={styles.detailRecorderRow}>
                    <Text style={styles.detailRecorderLabel}>기록자</Text>
                    <View style={[styles.recorderBadge, { backgroundColor: personBg }]}>
                      <View style={[styles.dot, { backgroundColor: personColor }]} />
                      <Text style={[styles.recorderName, { color: personColor }]}>{selectedTx.person}</Text>
                    </View>
                  </View>

                  {/* 수정/삭제 버튼 — 내 거래만 */}
                  {isMe && (
                    <View style={styles.detailActions}>
                      <TouchableOpacity
                        style={styles.editBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          const tx = selectedTx;
                          setSelectedTx(null);
                          setSelectedDay(null);
                          setEditTx(tx);
                          setEditAmount(String(tx.amount));
                          setEditMemo(tx.memo);
                          setEditTime(tx.time as TimeSlot);
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
                            { text: '삭제', style: 'destructive', onPress: () => {
                              deleteTransaction(selectedTx.id);
                              setSelectedTx(null);
                              setSelectedDay(null);
                            }},
                          ]);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#E05C5C" />
                        <Text style={styles.deleteBtnText}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.detailDivider} />
                  <TxCommentSection
                    txId={selectedTx.id}
                    householdId={householdId}
                    userId={user?.id ?? ''}
                    userName={myName}
                    partnerUserId={partnerId ?? undefined}
                    onInputFocus={() => detailScrollRef.current?.scrollToEnd({ animated: true })}
                  />
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          );
        })()}
      </Modal>

      {/* Edit Transaction Modal */}
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
              <Text style={styles.editLabel}>금액</Text>
              <TextInput
                style={styles.editInput}
                value={editAmount}
                onChangeText={(v) => setEditAmount(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                placeholder="금액 입력"
                placeholderTextColor={colors.inactive}
              />
              <Text style={styles.editLabel}>메모</Text>
              <TextInput
                style={styles.editInput}
                value={editMemo}
                onChangeText={setEditMemo}
                placeholder="메모 입력"
                placeholderTextColor={colors.inactive}
              />
              <Text style={styles.editLabel}>시간대</Text>
              <View style={styles.timeChipRow}>
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

      {/* Year/Month Picker Modal */}
      <Modal visible={showYMPicker} animationType="slide" transparent onRequestClose={() => setShowYMPicker(false)}>
        <View style={styles.ymModalWrap}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowYMPicker(false)} />
          <View style={[styles.ymSheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.ymHeader}>
            <Text style={styles.ymTitle}>날짜 선택</Text>
            <TouchableOpacity onPress={() => setShowYMPicker(false)}>
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.ymDivider} />
          <View style={styles.ymPickerRow}>
            <WheelPicker items={YEARS} selectedIndex={pickYearIdx} onSelect={setPickYearIdx} />
            <WheelPicker items={MONTHS} selectedIndex={pickMonthIdx} onSelect={setPickMonthIdx} format={(v) => `${v}월`} />
          </View>
          <TouchableOpacity
            style={styles.ymConfirmBtn}
            onPress={() => { setCurrentDate(new Date(YEARS[pickYearIdx], MONTHS[pickMonthIdx] - 1, 1)); setShowYMPicker(false); }}
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

// Helper style function
const filterChipActive = (key: PersonFilter) => {
  if (key === 'me')      return { backgroundColor: '#FDF0F6', borderColor: '#C4729A' };
  if (key === 'partner') return { backgroundColor: '#EBF0FF', borderColor: '#4A90D9' };
  return { backgroundColor: colors.primary, borderColor: colors.primary };
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  monthTitleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.canvas },
  monthTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24, color: colors.text },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: {} as any,
  filterText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary },

  weekRow: { flexDirection: 'row', paddingHorizontal: 4, marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', fontFamily: fonts.semiBold, fontSize: 11, color: colors.textSecondary },

  grid: { flex: 1 },
  weekRowGrid: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  cell: {
    flex: 1, padding: 5,
    alignItems: 'flex-start',
  },
  cellToday: { backgroundColor: '#EDF5F0' },
  dayNum: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text, marginBottom: 2 },
  dayNumToday: { color: colors.primary },
  dayTotal: { fontFamily: fonts.regular, fontSize: 10, color: colors.textSecondary, marginBottom: 3 },
  dotRow: { flexDirection: 'row', gap: 3 },
  personDot: { width: 6, height: 6, borderRadius: 3 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '65%',
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

  // Edit modal
  editModalWrap: { flex: 1, justifyContent: 'flex-end' },
  editSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48, marginBottom: 4 },
  editTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  editLabel: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textSecondary, marginBottom: 8, marginTop: 14 },
  editInput: { backgroundColor: colors.canvas, borderRadius: 12, borderWidth: 1, borderColor: colors.border, height: 48, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  timeChipRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  timeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: colors.canvas },
  timeChipActive: { backgroundColor: colors.primary },
  timeChipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  timeChipTextActive: { color: '#FFFFFF' },
  editSaveBtn: { marginTop: 20, backgroundColor: colors.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  editSaveBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: '#FFFFFF' },

  // Year/Month picker bottom sheet
  ymModalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  ymSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  ymHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48, paddingHorizontal: 20 },
  ymTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  ymDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  ymPickerRow: { flexDirection: 'row', height: ITEM_H * 5, marginTop: 8 },
  ymConfirmBtn: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  ymConfirmText: { fontFamily: fonts.semiBold, fontSize: 16, color: '#FFFFFF' },

  // Wheel picker
  // WheelPicker styles are in ../components/WheelPicker.tsx

  filterTextActive: {} as any,

  sheetTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  sheetTotalLabel: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textSecondary },
  sheetTotalVal: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },

  // 거래 상세 시트 (tcF6p)
  detailSheetKav: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  detailSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, maxHeight: '92%' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 52 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  catChipText: { fontFamily: fonts.semiBold, fontSize: 13 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  detailAmtSec: { gap: 4, paddingVertical: 8, paddingHorizontal: 4 },
  detailTypeRow: { flexDirection: 'row' },
  expenseTag: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  expenseTagText: { fontFamily: fonts.medium, fontSize: 11, color: '#E05C5C' },
  detailAmt: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 42, color: colors.text, letterSpacing: -1 },
  detailDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 },
  detailPhoto: { width: '100%', height: 180, borderRadius: 12, marginVertical: 4 },
  photoExpandBtn: {
    position: 'absolute', bottom: 12, right: 8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
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
