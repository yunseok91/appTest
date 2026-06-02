import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Modal, FlatList, TextInput, Image, Animated,
  Alert, ScrollView, Keyboard, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts } from '../theme/colors';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Category } from '../config/categoryIcons';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import {
  subscribeNotifications, markNotificationReadFS, markAllNotificationsReadFS,
  type AppNotification,
} from '../services/firestoreService';
import { extractAmountFromImage, GOOGLE_VISION_API_KEY } from '../services/ocrService';

type TimeSlot = 'morning' | 'lunch' | 'evening';
type TabType = 'expense' | 'income';
type PayMethod = 'cash' | 'card';




type Card = { id: string; name: string; color: string };

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getKoreanTimeSlot(): TimeSlot {
  const now = new Date();
  const koHour = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCHours();
  if (koHour >= 6 && koHour < 12) return 'morning';
  if (koHour >= 12 && koHour < 18) return 'lunch';
  return 'evening';
}

const TIME_LABEL: Record<TimeSlot, '아침' | '점심' | '저녁'> = {
  morning: '아침', lunch: '점심', evening: '저녁',
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { addTransaction, updateTransaction, transactions, checkAndAddRecurring } = useTransactions();
  const { user, householdName, partnerName, partnerGender } = useAuth();
  const { budget, cards: profileCards, myName, myGender, profilePhotoUri } = useProfile();

  // Map profile cards to local Card type (memoized to avoid effect loop)
  const cards = useMemo<Card[]>(
    () => profileCards.map(c => ({ id: c.id, name: c.alias, color: c.color })),
    [profileCards],
  );

  // Calculate real monthly income / expense
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyExpense = transactions
    .filter(tx => tx.type === 'expense' && tx.date.startsWith(monthStr))
    .reduce((s, tx) => s + tx.amount, 0);
  const monthlyIncome = transactions
    .filter(tx => tx.type === 'income' && tx.date.startsWith(monthStr))
    .reduce((s, tx) => s + tx.amount, 0);
  const hasBudget = budget > 0;
  const monthlyBalance = hasBudget ? budget - monthlyExpense : monthlyIncome - monthlyExpense;
  const isOverBudget = hasBudget && monthlyExpense > budget;

  const [showBalTooltip, setShowBalTooltip] = useState(false);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(getKoreanTimeSlot);
  const [tab, setTab] = useState<TabType>('expense');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [recurring, setRecurring] = useState<'monthly' | 'weekly' | null>(null);
  const [showRecurringManager, setShowRecurringManager] = useState(false);

  // 최초 1회 웰컴 팝업
  useEffect(() => {
    AsyncStorage.getItem('@baebae_welcome_shown').then(val => {
      if (!val) setShowWelcome(true);
    });
  }, []);

  // 예산 초과 알림 (80% / 100%)
  useEffect(() => {
    if (!hasBudget || budget === 0) return;
    const pct = monthlyExpense / budget;
    const key80 = `@budget_alert_80_${monthStr}`;
    const key100 = `@budget_alert_100_${monthStr}`;
    if (pct >= 1.0) {
      AsyncStorage.getItem(key100).then(v => {
        if (!v) {
          Alert.alert('예산 초과!', `이번 달 예산 ₩${budget.toLocaleString()}을 초과했어요.`);
          AsyncStorage.setItem(key100, '1');
        }
      });
    } else if (pct >= 0.8) {
      AsyncStorage.getItem(key80).then(v => {
        if (!v) {
          Alert.alert('예산 주의', `이번 달 예산의 80%를 사용했어요.\n남은 예산: ₩${(budget - monthlyExpense).toLocaleString()}`);
          AsyncStorage.setItem(key80, '1');
        }
      });
    }
  }, [monthlyExpense, budget, hasBudget, monthStr]);

  // 반복 거래 자동 등록 (transactions 로드 후 1회)
  const hasCheckedRecurring = useRef(false);
  useEffect(() => {
    if (hasCheckedRecurring.current || transactions.length === 0) return;
    hasCheckedRecurring.current = true;
    checkAndAddRecurring().then(count => {
      if (count > 0) {
        Alert.alert('반복 거래', `${count}건의 반복 거래가 자동 등록되었습니다.`);
      }
    });
  }, [transactions]);

  const handleCloseWelcome = async () => {
    await AsyncStorage.setItem('@baebae_welcome_shown', 'true');
    setShowWelcome(false);
  };

  // Sync selectedCard when profile cards update
  React.useEffect(() => {
    setSelectedCard(prev => {
      if (prev && cards.some(c => c.id === prev.id)) return prev;
      return cards[0] ?? null;
    });
  }, [cards]);

  const [isOcrLoading, setIsOcrLoading] = useState(false);

  // 파트너 알림 토스트
  const [toastMsg, setToastMsg] = useState('');
  const toastAnim = useRef(new Animated.Value(-80)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUnreadCount = useRef(-1);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: -80, duration: 250, useNativeDriver: true }).start(() => setToastMsg(''));
    }, 3500);
  };

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Firestore 알림 구독
  useEffect(() => {
    if (!user?.id) return;
    return subscribeNotifications(user.id, (notifs) => {
      setNotifications(notifs);
      const unread = notifs.filter(n => !n.read);
      if (prevUnreadCount.current !== -1 && unread.length > prevUnreadCount.current) {
        const newest = notifs.find(n => !n.read);
        if (newest) showToast(newest.message);
      }
      prevUnreadCount.current = unread.length;
    });
  }, [user?.id]);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pickerDate, setPickerDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });

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

  // 사진 첨부 — 갤러리에서 선택, OCR 없음
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

  // 영수증 촬영 — 카메라로 찍고 OCR 자동 실행
  const handleScanReceipt = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '카메라 접근 권한을 허용해 주세요.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      if (!GOOGLE_VISION_API_KEY) {
        Alert.alert('OCR 미설정', 'ocrService.ts에 GOOGLE_VISION_API_KEY를 입력해 주세요.');
        return;
      }
      setIsOcrLoading(true);
      const detected = await extractAmountFromImage(uri);
      setIsOcrLoading(false);
      if (detected) {
        setAmount(String(detected));
        showToast(`₩${detected.toLocaleString()} 금액을 자동 인식했어요`);
      } else {
        Alert.alert('인식 실패', '금액을 찾지 못했어요.\n영수증이 잘 보이도록 다시 촬영해 주세요.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent={false} />

      {/* 파트너 알림 토스트 */}
      {toastMsg !== '' && (
        <Animated.View style={[styles.toast, { top: insets.top + 8, transform: [{ translateY: toastAnim }] }]}>
          <Ionicons name="notifications" size={15} color="#fff" />
          <Text style={styles.toastText} numberOfLines={2}>{toastMsg}</Text>
        </Animated.View>
      )}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
      >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.relChip}>
                <Ionicons name="heart" size={11} color={colors.secondary} />
                <Text style={styles.relChipText}>연인</Text>
              </View>
              <Text style={styles.coupleName} allowFontScaling={false}>{householdName}</Text>
            </View>
            <TouchableOpacity testID="home-btn-notifications" onPress={() => setShowNotifications(true)} activeOpacity={0.7} style={{ position: 'relative' }}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {unreadCount > 0 && (
                <View style={styles.notiiBadge}>
                  <Text style={styles.notiiBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Avatar row */}
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircle, { backgroundColor: myGender === 'female' ? '#f2d9e1' : '#cbdfee' }]}>
              {profilePhotoUri ? (
                <Image source={{ uri: profilePhotoUri }} style={{ width: 30, height: 30, borderRadius: 15 }} resizeMode="cover" />
              ) : (
                <Image
                  source={myGender === 'female'
                    ? require('../../assets/avatars/HMHJX.png')
                    : require('../../assets/avatars/aRbFP.png')}
                  style={styles.avatarImg}
                  resizeMode="contain"
                />
              )}
            </View>
            <Text style={styles.avatarName}>{myName || '나'}</Text>
            <Ionicons name="heart" size={11} color={colors.secondary} />
            {partnerGender ? (
              <View style={[styles.avatarCircle, { backgroundColor: partnerGender === 'female' ? '#f2d9e1' : '#cbdfee' }]}>
                <Image
                  source={partnerGender === 'female'
                    ? require('../../assets/avatars/HMHJX.png')
                    : require('../../assets/avatars/aRbFP.png')}
                  style={styles.avatarImg}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: '#E8E8E8' }]}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} />
              </View>
            )}
            <Text style={styles.avatarName}>{partnerName || '파트너'}</Text>
          </View>

          {/* Balance */}
          <View style={styles.balance}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.balLbl}>이번 달 잔액</Text>
              <View>
                <TouchableOpacity testID="home-btn-balance-info" onPress={() => setShowBalTooltip(v => !v)} hitSlop={8}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <Modal
                  visible={showBalTooltip}
                  transparent
                  animationType="none"
                  onRequestClose={() => setShowBalTooltip(false)}
                >
                  <TouchableWithoutFeedback onPress={() => setShowBalTooltip(false)}>
                    <View style={{ flex: 1 }} />
                  </TouchableWithoutFeedback>
                </Modal>
                {showBalTooltip && (
                  <View style={styles.balTooltip}>
                    <View style={styles.balTooltipArrow} />
                    <Text style={styles.balTooltipText}>
                      {hasBudget
                        ? '이번달 예산 설정 금액 - 지출로\n계산됩니다.'
                        : '수입 - 지출로 계산됩니다.'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.balAmtRow}>
              <Text style={[styles.balAmt, isOverBudget && { color: colors.secondary }]} allowFontScaling={false}>
                <Text style={styles.wonSign}>₩</Text>{monthlyBalance.toLocaleString()}
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
                <Text style={[styles.statVal, { color: colors.primary }]} allowFontScaling={false}><Text style={styles.wonSign}>₩</Text>{monthlyIncome.toLocaleString()}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLbl}>지출</Text>
                <Text style={[styles.statVal, { color: colors.secondary }]} allowFontScaling={false}><Text style={styles.wonSign}>₩</Text>{monthlyExpense.toLocaleString()}</Text>
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
                  testID={`btn-time-${item.key}`}
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
                testID="btn-type-expense"
                style={[styles.typeTab, tab === 'expense' && styles.typeTabExpense]}
                onPress={() => { setTab('expense'); setSelectedCategory(null); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeTabText, tab === 'expense' && styles.typeTabTextActive]}>지출</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="btn-type-income"
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
                testID="btn-pay-cash"
                style={[styles.payMethodBtn, payMethod === 'cash' && styles.payMethodBtnActive]}
                onPress={() => setPayMethod('cash')}
                activeOpacity={0.8}
              >
                <Ionicons name="cash-outline" size={14} color={payMethod === 'cash' ? colors.white : colors.inactive} />
                <Text style={[styles.payMethodText, payMethod === 'cash' && styles.payMethodTextActive]}>현금</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="btn-pay-card"
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
                testID="home-btn-card-selector"
                style={styles.cardSelector}
                onPress={() => setShowCardPicker(true)}
                activeOpacity={0.8}
              >
                {selectedCard ? (
                  <>
                    <View style={[styles.cardDot, { backgroundColor: selectedCard.color }]} />
                    <Text style={styles.cardSelectorText}>{selectedCard.name}</Text>
                  </>
                ) : (
                  <Text style={[styles.cardSelectorText, { color: colors.inactive }]}>카드를 선택하세요</Text>
                )}
                <Ionicons name="chevron-down" size={14} color={colors.inactive} />
              </TouchableOpacity>
            )}

            {/* 금액 입력 */}
            <View style={styles.amountSection}>
              {!amount && <Text style={styles.amountHint}>금액을 입력하세요</Text>}
              <View style={styles.amountInputRow}>
                <Text style={[styles.amountPrefix, !amount && { color: colors.inactive }]}>₩</Text>
                <TextInput
                  testID="input-amount"
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
                testID="btn-category"
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
                testID="home-btn-date"
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
                testID="input-memo"
                style={styles.memoInput}
                value={memo}
                onChangeText={setMemo}
                placeholder="메모를 입력하세요"
                placeholderTextColor={colors.inactive}
                multiline
                textAlignVertical="top"
                returnKeyType="done"
                maxLength={50}
                onFocus={() => {
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
                }}
              />
              <Text style={styles.memoCount}>{memo.length}/50</Text>
            </View>

            {/* 반복 설정 */}
            <View style={styles.recurringRow}>
              <Ionicons name="repeat-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.recurringLabel}>반복</Text>
              {([['없음', null], ['매주', 'weekly'], ['매월', 'monthly']] as const).map(([label, val]) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.recurringChip, recurring === val && styles.recurringChipActive]}
                  onPress={() => setRecurring(val)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.recurringChipText, recurring === val && styles.recurringChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
              {transactions.some(tx => tx.recurring) && (
                <TouchableOpacity
                  style={styles.recurringManageBtn}
                  onPress={() => setShowRecurringManager(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.recurringManageBtnText}>관리</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 사진 버튼 행 */}
            <View style={styles.photoRow}>
              {/* 영수증 촬영 버튼 */}
              <TouchableOpacity
                testID="home-btn-receipt"
                style={[styles.photoBtn, { flex: 1 }, isOcrLoading && { opacity: 0.5 }]}
                onPress={handleScanReceipt}
                disabled={isOcrLoading}
                activeOpacity={0.8}
              >
                {isOcrLoading ? (
                  <View style={styles.photoBtnInner}>
                    <Ionicons name="scan-outline" size={16} color={colors.primary} />
                    <Text style={[styles.photoBtnText, { color: colors.primary }]}>인식 중...</Text>
                  </View>
                ) : (
                  <View style={styles.photoBtnInner}>
                    <Ionicons name="receipt-outline" size={16} color={colors.inactive} />
                    <View>
                      <Text style={styles.photoBtnText}>영수증 촬영</Text>
                      <Text style={styles.photoBtnHint}>금액 자동 인식</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>

              {/* 사진 첨부 버튼 */}
              <TouchableOpacity
                testID="home-btn-photo"
                style={[styles.photoBtn, { flex: 1 }]}
                onPress={handlePickPhoto}
                activeOpacity={0.8}
              >
                {photoUri ? (
                  <View style={styles.photoBtnInner}>
                    <Image source={{ uri: photoUri }} style={styles.photoThumb} />
                    <Text style={styles.photoBtnText} numberOfLines={1}>사진 선택됨</Text>
                  </View>
                ) : (
                  <View style={styles.photoBtnInner}>
                    <Ionicons name="camera-outline" size={16} color={colors.inactive} />
                    <Text style={styles.photoBtnText}>사진 첨부</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* 저장하기 버튼 행 */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                testID="btn-save"
                style={[styles.saveBtn, (!amount || !selectedCategory) && { opacity: 0.4 }]}
                activeOpacity={0.85}
                disabled={!amount || !selectedCategory}
                onPress={async () => {
                  if (!amount || !selectedCategory) return;
                  const y = selectedDate.getFullYear();
                  const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                  const d = String(selectedDate.getDate()).padStart(2, '0');
                  try {
                    await addTransaction({
                      type: tab === 'expense' ? 'expense' : 'income',
                      category: selectedCategory.label,
                      categoryKey: selectedCategory.key,
                      categoryIcon: selectedCategory.icon,
                      categoryIconColor: selectedCategory.iconColor,
                      categoryBgColor: selectedCategory.bgColor,
                      amount: Number(amount),
                      memo,
                      date: `${y}-${m}-${d}`,
                      time: TIME_LABEL[timeSlot],
                      person: myName || user?.name || '나',
                      payMethod,
                      cardName: payMethod === 'card' ? selectedCard?.name : undefined,
                      photoUri: photoUri ?? undefined,
                      recurring: recurring ?? null,
                    });
                    setAmount('');
                    setMemo('');
                    setPhotoUri(null);
                    setSelectedCategory(null);
                    setRecurring(null);
                    Alert.alert('저장했습니다', '내역이 성공적으로 저장되었습니다.');
                  } catch (err: any) {
                    Alert.alert(
                      '저장 실패',
                      `저장 중 오류가 발생했습니다.\n\n${err?.message ?? String(err)}`,
                    );
                  }
                }}
              >
                <Ionicons name="checkmark" size={16} color={colors.white} />
                <Text style={styles.saveBtnText}>저장하기</Text>
              </TouchableOpacity>
            </View>


          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* 반복 거래 관리 바텀시트 */}
      <Modal visible={showRecurringManager} transparent animationType="slide" onRequestClose={() => setShowRecurringManager(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowRecurringManager(false)} />
          <View style={[styles.recurringSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.recurringSheetHeader}>
              <Text style={styles.recurringSheetTitle}>반복 거래 관리</Text>
              <TouchableOpacity onPress={() => setShowRecurringManager(false)}>
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
            {(() => {
              const recurringTxs = transactions.filter(tx => tx.recurring);
              if (recurringTxs.length === 0) {
                return (
                  <View style={styles.recurringEmpty}>
                    <Ionicons name="repeat-outline" size={32} color={colors.border} />
                    <Text style={styles.recurringEmptyText}>등록된 반복 거래가 없어요</Text>
                  </View>
                );
              }
              return (
                <FlatList
                  data={recurringTxs}
                  keyExtractor={item => item.id}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }}
                  renderItem={({ item }) => (
                    <View style={styles.recurringItem}>
                      <View style={[styles.recurringItemIcon, { backgroundColor: item.categoryBgColor }]}>
                        <Ionicons name={item.categoryIcon as any} size={16} color={item.categoryIconColor} />
                      </View>
                      <View style={styles.recurringItemInfo}>
                        <Text style={styles.recurringItemCategory}>{item.category}</Text>
                        <Text style={styles.recurringItemMeta}>
                          {item.recurring === 'monthly' ? `매월 ${new Date(item.date).getDate()}일` : `매주 ${['일','월','화','수','목','금','토'][new Date(item.date).getDay()]}요일`}
                          {item.memo ? `  ·  ${item.memo}` : ''}
                        </Text>
                      </View>
                      <Text style={[styles.recurringItemAmt, { color: item.type === 'expense' ? colors.secondary : colors.primary }]} allowFontScaling={false}>
                        {item.type === 'expense' ? '-' : '+'}₩{item.amount.toLocaleString()}
                      </Text>
                      <TouchableOpacity
                        style={styles.recurringDeleteBtn}
                        onPress={() => {
                          Alert.alert(
                            '반복 해제',
                            `"${item.category}" 반복 거래를 해제할까요?\n(기존 내역은 유지됩니다)`,
                            [
                              { text: '취소', style: 'cancel' },
                              {
                                text: '해제',
                                style: 'destructive',
                                onPress: () => updateTransaction(item.id, { recurring: null }),
                              },
                            ],
                          );
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  )}
                />
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* 웰컴 팝업 — 최초 1회 */}
      <Modal visible={showWelcome} transparent animationType="fade" onRequestClose={handleCloseWelcome}>
        <View style={styles.welcomeOverlay}>
          <View style={styles.welcomeCard}>
            <Ionicons name="sparkles" size={56} color={colors.primary} />
            <Text style={styles.welcomeTitle} allowFontScaling={false}>우리 가계부 시작!</Text>
            <Text style={styles.welcomeSub}>
              {myName ? `${myName}의 첫 번째 날이에요\n` : ''}함께 기록을 시작해볼까요?
            </Text>
            <TouchableOpacity testID="home-btn-welcome-start" style={styles.welcomeBtn} onPress={handleCloseWelcome} activeOpacity={0.85}>
              <Text style={styles.welcomeBtnText}>시작하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                testID={`btn-cat-${item.key}`}
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
          {cards.length === 0 ? (
            <Text style={[styles.cardPickerName, { color: colors.textMuted, textAlign: 'center', paddingVertical: 20 }]}>
              마이페이지에서 카드를 추가해 주세요
            </Text>
          ) : (
            cards.map((card) => (
              <TouchableOpacity
                key={card.id}
                testID={`home-btn-card-${card.id}`}
                style={[styles.cardPickerItem, selectedCard?.id === card.id && styles.cardPickerItemActive]}
                onPress={() => { setSelectedCard(card); setShowCardPicker(false); }}
                activeOpacity={0.8}
              >
                <View style={[styles.cardPickerIcon, { backgroundColor: card.color }]}>
                  <Ionicons name="card" size={16} color="#fff" />
                </View>
                <View style={styles.cardPickerMeta}>
                  <Text style={styles.cardPickerName}>{card.name}</Text>
                </View>
                {selectedCard?.id === card.id && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </Modal>

      {/* 알림 팝업 */}
      <Modal visible={showNotifications} animationType="slide" transparent onRequestClose={() => setShowNotifications(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowNotifications(false)} />
        <View style={[styles.notiiSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.notiiHeader}>
            <Text style={styles.notiiTitle}>알림</Text>
            {unreadCount > 0 && (
              <TouchableOpacity testID="home-btn-notif-read-all" onPress={() => user && markAllNotificationsReadFS(user.id).catch(() => {})} activeOpacity={0.7}>
                <Text style={styles.notiiReadAll}>모두 읽음</Text>
              </TouchableOpacity>
            )}
          </View>
          {notifications.length === 0 ? (
            <View style={styles.notiiEmpty}>
              <Ionicons name="notifications-off-outline" size={36} color={colors.border} />
              <Text style={styles.notiiEmptyText}>새로운 알림이 없어요</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {notifications.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  testID={`home-btn-notif-${n.id}`}
                  style={[styles.notiiItem, !n.read && styles.notiiItemUnread]}
                  activeOpacity={0.7}
                  onPress={() => user && !n.read && markNotificationReadFS(user.id, n.id).catch(() => {})}
                >
                  <View style={[styles.notiiDot, { backgroundColor: n.read ? colors.border : colors.primary }]} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.notiiMsg, !n.read && { fontFamily: fonts.semiBold }]}>{n.message}</Text>
                    <Text style={styles.notiiTime}>{(() => {
                      const diff = Math.floor((Date.now() - new Date(n.createdAt).getTime()) / 1000);
                      if (diff < 60) return '방금';
                      if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
                      if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
                      return `${Math.floor(diff / 86400)}일 전`;
                    })()}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* 날짜 캘린더 */}
      <Modal visible={showDatePicker} animationType="slide" transparent onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowDatePicker(false)} />
        <View style={[styles.dateSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.dateHeader}>
            <TouchableOpacity testID="home-btn-date-prev" style={styles.dateNavBtn} onPress={() => setPickerDate(new Date(pickerYear, pickerMonth - 1, 1))}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.dateTitle}>{pickerYear}년 {pickerMonth + 1}월</Text>
            <TouchableOpacity testID="home-btn-date-next" style={styles.dateNavBtn} onPress={() => setPickerDate(new Date(pickerYear, pickerMonth + 1, 1))}>
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
                  testID={`home-btn-date-day-${day}`}
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
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 14,
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
  balance: { gap: 6 },
  balLbl: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  balTooltip: { position: 'absolute', top: -6, left: 22, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, zIndex: 100, minWidth: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 6 },
  balTooltipArrow: { position: 'absolute', top: 10, left: -5, width: 0, height: 0, borderTopWidth: 5, borderBottomWidth: 5, borderRightWidth: 5, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: '#fff' },
  balTooltipText: { fontFamily: fonts.regular, fontSize: 11, color: '#1A1918', lineHeight: 17 },
  balAmtRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  balAmt: { fontFamily: fonts.bold, fontSize: 26, color: colors.text, letterSpacing: 0 },
  wonSign: { fontFamily: undefined },  // Outfit폰트 ₩ 미지원 → 시스템 폰트로 렌더링, fontSize는 부모에서 상속
  overBudgetBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEE2E2', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
  },
  overBudgetText: { fontFamily: fonts.semiBold, fontSize: 11, color: '#E05C5C' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  statItem: { gap: 2 },
  statLbl: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  statVal: { fontFamily: fonts.semiBold, fontSize: 14 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },

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
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
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
  amountSection: { gap: 6, paddingTop: 4, paddingBottom: 0 },
  amountHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.inactive },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  amountPrefix: { fontFamily: undefined, fontSize: 34, color: colors.text, marginRight: 2, letterSpacing: 0 },
  amountInput: {
    flex: 1,
    fontFamily: fonts.bold, fontSize: 34, lineHeight: 42, color: colors.text,
    letterSpacing: 0, paddingHorizontal: 0, paddingVertical: 4, textAlignVertical: 'center',
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
    paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 52,
  },
  memoInput: {
    flex: 1,
    fontFamily: fonts.regular, fontSize: 13, color: colors.text,
    padding: 0, includeFontPadding: false,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  memoCount: {
    fontFamily: fonts.regular, fontSize: 11, color: colors.inactive,
    alignSelf: 'flex-end',
  },

  // 액션 행
  photoRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  actionRow: {},
  photoBtn: {
    backgroundColor: colors.background, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  photoBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoBtnText: { fontFamily: fonts.regular, fontSize: 13, color: colors.inactive },
  photoBtnHint: { fontFamily: fonts.regular, fontSize: 10, color: colors.primary, marginTop: 1 },
  photoThumb: { width: 44, height: 44, borderRadius: 8 },
  saveBtn: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 100, height: 46,
  },
  saveBtnText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.white },

  // OCR 버튼
  ocrBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.primary },
  ocrBtnText: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },

  // 파트너 알림 토스트
  toast: { position: 'absolute', left: 16, right: 16, zIndex: 999, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.text, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 },
  toastText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: '#fff', lineHeight: 18 },

  recurringRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  recurringLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginRight: 4 },
  recurringChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border },
  recurringChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  recurringChipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary },
  recurringChipTextActive: { color: '#FFFFFF' },
  recurringManageBtn: { marginLeft: 'auto' as any, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: colors.primary },
  recurringManageBtnText: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary },

  recurringSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  recurringSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48, paddingHorizontal: 20 },
  recurringSheetTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  recurringEmpty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  recurringEmptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  recurringItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  recurringItemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recurringItemInfo: { flex: 1 },
  recurringItemCategory: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  recurringItemMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  recurringItemAmt: { fontFamily: fonts.semiBold, fontSize: 14 },
  recurringDeleteBtn: { padding: 4 },

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

  // 알림 배지
  notiiBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notiiBadgeText: { fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF' },

  // 알림 시트
  notiiSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '75%', backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  notiiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44, marginBottom: 4 },
  notiiTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  notiiReadAll: { fontFamily: fonts.medium, fontSize: 13, color: colors.primary },
  notiiEmpty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  notiiEmptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  notiiItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  notiiItemUnread: { backgroundColor: '#F8FFF9', marginHorizontal: -20, paddingHorizontal: 20 },
  notiiDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  notiiMsg: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 20 },
  notiiTime: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },

  // 웰컴 팝업
  welcomeOverlay: {
    flex: 1, backgroundColor: 'rgba(26,25,24,0.55)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
  },
  welcomeCard: {
    width: '100%', backgroundColor: colors.white,
    borderRadius: 28, padding: 36, alignItems: 'center', gap: 14,
  },
  welcomeEmoji: { fontSize: 56, textAlign: 'center' },
  welcomeTitle: {
    fontFamily: fonts.bold, fontSize: 22, color: colors.text,
    letterSpacing: -0.5, textAlign: 'center',
  },
  welcomeSub: {
    fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  welcomeBtn: {
    width: '100%', height: 52, backgroundColor: colors.primary,
    borderRadius: 100, alignItems: 'center', justifyContent: 'center',
    marginTop: 6,
  },
  welcomeBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.white },
});
