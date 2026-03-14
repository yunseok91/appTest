import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  Modal, FlatList, TextInput, Image,
  Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts } from '../theme/colors';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Category } from '../config/categoryIcons';

type TimeSlot = 'morning' | 'lunch' | 'evening';
type TabType = 'expense' | 'income';
type PayMethod = 'cash' | 'card';

type Card = { id: string; name: string; last4: string; color: string };

const MOCK_CARDS: Card[] = [
  { id: '1', name: '신한카드', last4: '1234', color: '#0046B0' },
  { id: '2', name: '국민카드', last4: '5678', color: '#FFB300' },
  { id: '3', name: '카카오뱅크', last4: '9012', color: '#3A1D96' },
];

const MONTHLY_BUDGET = 1_200_000;
const MONTHLY_SPEND  = 1_015_000;
const MONTHLY_INCOME = 2_300_000;
const MONTHLY_BALANCE = MONTHLY_INCOME - MONTHLY_SPEND;
const isOverBudget = MONTHLY_SPEND > MONTHLY_BUDGET;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const [timeSlot, setTimeSlot] = useState<TimeSlot>('morning');
  const [tab, setTab] = useState<TabType>('expense');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [selectedCard, setSelectedCard] = useState<Card>(MOCK_CARDS[0]);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCardPicker, setShowCardPicker] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date(2026, 2, 14));
  const [pickerDate, setPickerDate] = useState(new Date(2026, 2, 1));

  const categories = tab === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const TIME_ITEMS: { key: TimeSlot; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'morning', label: '아침', icon: 'sunny-outline' },
    { key: 'lunch',   label: '점심', icon: 'sunny' },
    { key: 'evening', label: '저녁', icon: 'moon-outline' },
  ];

  const formatDateLabel = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;

  const pickerYear = pickerDate.getFullYear();
  const pickerMonth = pickerDate.getMonth();
  const firstDay = new Date(pickerYear, pickerMonth, 1).getDay();
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const calCells = (() => {
    const arr: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  })();

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 접근 권한을 허용해 주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.relChip}>
                <Text style={styles.relChipEmoji}>💑</Text>
                <Text style={styles.relChipText}>연인</Text>
              </View>
              <Text style={styles.coupleName}>민지 &amp; 준호</Text>
            </View>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </View>

          {/* Avatar row */}
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircle, { backgroundColor: '#f2d9e1' }]}>
              <Image source={require('../../assets/avatars/HMHJX.png')} style={styles.avatarImg} resizeMode="contain" />
            </View>
            <Text style={styles.avatarName}>민지</Text>
            <Ionicons name="heart" size={11} color={colors.secondary} />
            <View style={[styles.avatarCircle, { backgroundColor: '#cbdfee' }]}>
              <Image source={require('../../assets/avatars/aRbFP.png')} style={styles.avatarImg} resizeMode="contain" />
            </View>
            <Text style={styles.avatarName}>준호</Text>
          </View>

          {/* Balance */}
          <View style={styles.balance}>
            <Text style={styles.balLbl}>이번 달 잔액</Text>
            <View style={styles.balAmtRow}>
              <Text style={[styles.balAmt, isOverBudget && { color: colors.secondary }]}>
                ₩{MONTHLY_BALANCE.toLocaleString()}
              </Text>
              {isOverBudget && (
                <View style={styles.overBudgetBubble}>
                  <Ionicons name="warning-outline" size={11} color="#E05C5C" />
                  <Text style={styles.overBudgetText}>이번 달 초과했는데요?</Text>
                </View>
              )}
            </View>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLbl}>수입</Text>
                <Text style={[styles.statVal, { color: colors.primary }]}>₩{MONTHLY_INCOME.toLocaleString()}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLbl}>지출</Text>
                <Text style={[styles.statVal, { color: colors.secondary }]}>₩{MONTHLY_SPEND.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Time selector */}
          <View style={styles.timeSelector}>
            {TIME_ITEMS.map((item) => {
              const active = timeSlot === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.timeBtn, active && styles.timeBtnActive]}
                  onPress={() => setTimeSlot(item.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={item.icon} size={13} color={active ? colors.white : colors.inactive} />
                  <Text style={[styles.timeBtnText, active && styles.timeBtnTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Input card ── */}
          <View style={styles.inputCard}>

            {/* 지출 / 수입 토글 */}
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeTab, tab === 'expense' && styles.typeTabExpense]}
                onPress={() => { setTab('expense'); setSelectedCategory(null); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeTabText, tab === 'expense' && styles.typeTabTextActive]}>지출</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeTab, tab === 'income' && styles.typeTabIncome]}
                onPress={() => { setTab('income'); setSelectedCategory(null); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeTabText, tab === 'income' && styles.typeTabTextActive]}>수입</Text>
              </TouchableOpacity>
            </View>

            {/* 결제수단 */}
            <View style={styles.payMethodRow}>
              <TouchableOpacity
                style={[styles.payMethodBtn, payMethod === 'cash' && styles.payMethodBtnActive]}
                onPress={() => setPayMethod('cash')}
                activeOpacity={0.8}
              >
                <Ionicons name="cash-outline" size={14} color={payMethod === 'cash' ? colors.white : colors.inactive} />
                <Text style={[styles.payMethodText, payMethod === 'cash' && styles.payMethodTextActive]}>현금</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payMethodBtn, payMethod === 'card' && styles.payMethodBtnActive]}
                onPress={() => setPayMethod('card')}
                activeOpacity={0.8}
              >
                <Ionicons name="card-outline" size={14} color={payMethod === 'card' ? colors.white : colors.inactive} />
                <Text style={[styles.payMethodText, payMethod === 'card' && styles.payMethodTextActive]}>카드</Text>
              </TouchableOpacity>
            </View>

            {/* 카드 선택 */}
            {payMethod === 'card' && (
              <TouchableOpacity
                style={styles.cardSelector}
                onPress={() => setShowCardPicker(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.cardDot, { backgroundColor: selectedCard.color }]} />
                <Text style={styles.cardSelectorText}>{selectedCard.name} ****{selectedCard.last4}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.inactive} />
              </TouchableOpacity>
            )}

            {/* 금액 입력 */}
            <View style={styles.amountSection}>
              {!amount && <Text style={styles.amountHint}>금액을 입력하세요</Text>}
              <View style={styles.amountInputRow}>
                <Text style={[styles.amountPrefix, !amount && { color: colors.inactive }]}>₩</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount ? Number(amount).toLocaleString('ko-KR') : ''}
                  onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.inactive}
                  returnKeyType="done"
                />
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* 카테고리 & 날짜 */}
            <View style={styles.fieldRow}>
              <TouchableOpacity
                style={[styles.fieldBtn, { flex: 1 }, selectedCategory && styles.fieldBtnSelected]}
                onPress={() => setShowCategoryPicker(true)}
                activeOpacity={0.8}
              >
                {selectedCategory ? (
                  <>
                    <View style={[styles.catBubble, { backgroundColor: selectedCategory.bgColor }]}>
                      <Ionicons name={selectedCategory.icon as any} size={12} color={selectedCategory.iconColor} />
                    </View>
                    <Text style={[styles.fieldBtnText, { color: colors.text }]}>{selectedCategory.label}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="pricetag-outline" size={14} color={colors.inactive} />
                    <Text style={styles.fieldBtnText}>카테고리</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fieldBtn, { flex: 1 }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.text} />
                <Text style={[styles.fieldBtnText, { color: colors.text }]}>{formatDateLabel(selectedDate)}</Text>
              </TouchableOpacity>
            </View>

            {/* 메모 */}
            <View style={styles.memoField}>
              <Ionicons name="chatbubble-outline" size={14} color={colors.inactive} style={{ marginTop: 2 }} />
              <TextInput
                style={styles.memoInput}
                value={memo}
                onChangeText={setMemo}
                placeholder="메모를 입력하세요"
                placeholderTextColor={colors.inactive}
                multiline
                textAlignVertical="top"
                returnKeyType="done"
              />
            </View>

            {/* 액션 버튼 */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoThumb} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={16} color={colors.inactive} />
                    <Text style={styles.photoBtnText}>사진 첨부</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85}>
                <Ionicons name="checkmark" size={16} color={colors.white} />
                <Text style={styles.saveBtnText}>저장하기</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>

      {/* 카테고리 피커 */}
      <Modal visible={showCategoryPicker} animationType="slide" transparent onRequestClose={() => setShowCategoryPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCategoryPicker(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{tab === 'expense' ? '지출 카테고리' : '수입 카테고리'}</Text>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.key}
            numColumns={4}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.catItem}
                onPress={() => { setSelectedCategory(item); setShowCategoryPicker(false); }}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.catCircle,
                  { backgroundColor: item.bgColor },
                  selectedCategory?.key === item.key && styles.catCircleSelected,
                ]}>
                  <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
                </View>
                <Text style={[styles.catLabel, selectedCategory?.key === item.key && { color: colors.primary }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* 카드 선택 */}
      <Modal visible={showCardPicker} animationType="slide" transparent onRequestClose={() => setShowCardPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCardPicker(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>카드 선택</Text>
          {MOCK_CARDS.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[styles.cardPickerItem, selectedCard.id === card.id && styles.cardPickerItemActive]}
              onPress={() => { setSelectedCard(card); setShowCardPicker(false); }}
              activeOpacity={0.8}
            >
              <View style={[styles.cardPickerIcon, { backgroundColor: card.color }]}>
                <Ionicons name="card" size={16} color="#fff" />
              </View>
              <View style={styles.cardPickerMeta}>
                <Text style={styles.cardPickerName}>{card.name}</Text>
                <Text style={styles.cardPickerNum}>****{card.last4}</Text>
              </View>
              {selectedCard.id === card.id && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* 날짜 캘린더 */}
      <Modal visible={showDatePicker} animationType="slide" transparent onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowDatePicker(false)} />
        <View style={[styles.dateSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.dateHeader}>
            <TouchableOpacity style={styles.dateNavBtn} onPress={() => setPickerDate(new Date(pickerYear, pickerMonth - 1, 1))}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.dateTitle}>{pickerYear}년 {pickerMonth + 1}월</Text>
            <TouchableOpacity style={styles.dateNavBtn} onPress={() => setPickerDate(new Date(pickerYear, pickerMonth + 1, 1))}>
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={d} style={[styles.weekDayText, i === 0 && { color: '#E05C5C' }, i === 6 && { color: '#4A90D9' }]}>{d}</Text>
            ))}
          </View>
          <View style={styles.calGrid}>
            {calCells.map((day, idx) => {
              if (!day) return <View key={`e-${idx}`} style={styles.calCell} />;
              const colIdx = idx % 7;
              const isSelected =
                selectedDate.getFullYear() === pickerYear &&
                selectedDate.getMonth() === pickerMonth &&
                selectedDate.getDate() === day;
              return (
                <TouchableOpacity
                  key={`d-${day}`}
                  style={styles.calCell}
                  onPress={() => { setSelectedDate(new Date(pickerYear, pickerMonth, day)); setShowDatePicker(false); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.calDayCircle, isSelected && styles.calDaySelected]}>
                    <Text style={[
                      styles.calDayNum,
                      colIdx === 0 && { color: '#E05C5C' },
                      colIdx === 6 && { color: '#4A90D9' },
                      isSelected && styles.calDayNumSelected,
                    ]}>{day}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  relChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EDF5F0', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
  },
  relChipEmoji: { fontSize: 12 },
  relChipText: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.primary },
  coupleName: { fontFamily: fonts.bold, fontSize: 19, color: colors.text, letterSpacing: -0.5 },

  // Avatar row
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  avatarCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 24, height: 24 },
  avatarName: { fontFamily: fonts.medium, fontSize: 11, color: colors.textSecondary },

  // Balance
  balance: { gap: 2 },
  balLbl: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  balAmtRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  balAmt: { fontFamily: fonts.bold, fontSize: 30, color: colors.text, letterSpacing: -1 },
  overBudgetBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEE2E2', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
  },
  overBudgetText: { fontFamily: fonts.semiBold, fontSize: 11, color: '#E05C5C' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 2 },
  statItem: { gap: 0 },
  statLbl: { fontFamily: fonts.regular, fontSize: 10, color: colors.textSecondary },
  statVal: { fontFamily: fonts.semiBold, fontSize: 12 },
  statDivider: { width: 1, height: 18, backgroundColor: colors.border },

  // Time selector
  timeSelector: { flexDirection: 'row', gap: 6 },
  timeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.card, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7,
  },
  timeBtnActive: { backgroundColor: colors.primary },
  timeBtnText: { fontFamily: fonts.medium, fontSize: 12, color: colors.inactive },
  timeBtnTextActive: { fontFamily: fonts.semiBold, color: colors.white },

  // Input card — 고정 높이 없음, 자연스럽게 내용에 맞게
  inputCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },

  // Type toggle
  typeToggle: { flexDirection: 'row', backgroundColor: colors.canvas, borderRadius: 100, height: 44, padding: 3 },
  typeTab: { flex: 1, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  typeTabExpense: { backgroundColor: colors.secondary },
  typeTabIncome: { backgroundColor: colors.primary },
  typeTabText: { fontFamily: fonts.medium, fontSize: 14, color: colors.inactive },
  typeTabTextActive: { fontFamily: fonts.semiBold, color: colors.white },

  // 결제수단
  payMethodRow: { flexDirection: 'row', gap: 8 },
  payMethodBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 100, paddingHorizontal: 16, paddingVertical: 9,
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
  },
  payMethodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  payMethodText: { fontFamily: fonts.medium, fontSize: 13, color: colors.inactive },
  payMethodTextActive: { fontFamily: fonts.semiBold, color: colors.white },

  // 카드 셀렉터
  cardSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.background, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: colors.primary,
  },
  cardDot: { width: 10, height: 10, borderRadius: 5 },
  cardSelectorText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.text },

  // 카드 피커
  cardPickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cardPickerItemActive: { backgroundColor: '#F0FAF4', borderRadius: 12, paddingHorizontal: 8 },
  cardPickerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardPickerMeta: { flex: 1, gap: 2 },
  cardPickerName: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  cardPickerNum: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },

  // 금액 입력
  amountSection: { gap: 0, paddingVertical: 4 },
  amountHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.inactive, marginBottom: 2 },
  amountInputRow: { flexDirection: 'row', alignItems: 'center' },
  amountPrefix: { fontFamily: fonts.bold, fontSize: 34, color: colors.text, marginRight: 2, letterSpacing: -1 },
  amountInput: {
    flex: 1,
    fontFamily: fonts.bold, fontSize: 34, color: colors.text,
    letterSpacing: -1, padding: 0, includeFontPadding: false,
  },

  cardDivider: { height: 1, backgroundColor: colors.border },

  // 필드 행
  fieldRow: { flexDirection: 'row', gap: 8 },
  fieldBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: colors.background, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  fieldBtnSelected: { backgroundColor: '#EDF5F0' },
  fieldBtnText: { fontFamily: fonts.regular, fontSize: 13, color: colors.inactive },
  catBubble: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // 메모
  memoField: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.background, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12,
    minHeight: 60,
  },
  memoInput: {
    flex: 1,
    fontFamily: fonts.regular, fontSize: 13, color: colors.text,
    padding: 0, includeFontPadding: false,
    textAlignVertical: 'top',
    lineHeight: 20,
  },

  // 액션 행
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingTop: 4 },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.background, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  photoBtnText: { fontFamily: fonts.regular, fontSize: 13, color: colors.inactive },
  photoThumb: { width: 44, height: 44, borderRadius: 8 },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 100, height: 46,
  },
  saveBtnText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.white },

  // 공통 시트
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text, marginBottom: 14 },
  catItem: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 5 },
  catCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  catCircleSelected: { borderWidth: 2, borderColor: colors.primary },
  catLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.textSecondary, textAlign: 'center' },

  // 날짜 시트
  dateSheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 12,
  },
  dateHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, marginBottom: 12,
  },
  dateNavBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  dateTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  weekRow: { flexDirection: 'row', marginBottom: 4, paddingHorizontal: 2 },
  weekDayText: { flex: 1, textAlign: 'center', fontFamily: fonts.semiBold, fontSize: 11, color: colors.textSecondary, paddingVertical: 6 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 2, paddingBottom: 8 },
  calCell: { width: '14.28%', alignItems: 'center', paddingVertical: 4 },
  calDayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calDaySelected: { backgroundColor: colors.primary },
  calDayNum: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  calDayNumSelected: { color: colors.white },
});
