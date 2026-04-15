import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  ScrollView, Switch, Image, Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { colors, fonts } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../context/TransactionContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORY_KR: Record<string, string> = {
  // expense
  food: '식비', transport: '교통', shopping: '쇼핑', health: '의료/건강',
  culture: '문화/여가', travel: '여행', utility: '공과금', education: '교육',
  insurance: '보험', beauty: '미용/관리', exercise: '운동', pet: '반려동물',
  gift: '선물/경조사', telecom: '통신', housing: '주거', daily: '생활/생필품',
  savings: '저축/투자', childcare: '육아/자녀', etc: '기타',
  // income
  salary: '급여', allowance: '용돈', part_time: '부업', transfer: '이체',
  // 구버전 데이터 호환
  cafe: '카페', entertainment: '여가', home: '주거',
};

function buildCSV(transactions: import('../context/TransactionContext').Transaction[], year: number): string {
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

  return '\uFEFF' + [header, ...lines].join('\r\n'); // BOM + CRLF for Excel UTF-8
}

export default function MyPageScreen() {
  const insets = useSafeAreaInsets();
  // Android 하단 네비게이션바 높이 (edge-to-edge에서 insets.bottom이 0으로 오는 경우 대비)
  const sheetBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 24 : Math.max(insets.bottom, 16) + 20;
  const navigation = useNavigation<Nav>();
  const { budget, setBudget, cards, addCard, deleteCard, myName, myGender } = useProfile();
  const { signOut, deleteAccount, disconnectPartner, householdId, partnerName, partnerGender, partnerSince } = useAuth();
  const { transactions } = useTransactions();
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyExpense = transactions
    .filter(tx => tx.type === 'expense' && tx.date.startsWith(monthStr))
    .reduce((s, tx) => s + tx.amount, 0);
  const isOverBudget = budget > 0 && monthlyExpense > budget;
  const [notifOn, setNotifOn] = useState(true);
  const [showCardAdd, setShowCardAdd] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const csv = buildCSV(transactions, exportYear);
      const fileName = `baebae_${exportYear}.csv`;

      // TextEncoder로 JS 문자열 → UTF-8 바이트 변환 후 base64로 파일 쓰기
      // (writeAsStringAsync의 플랫폼별 인코딩 불일치 문제 회피)
      const encoder = new TextEncoder();
      const bytes = encoder.encode(csv);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      if (Platform.OS === 'android') {
        // Android: 다운로드 폴더에 직접 저장
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          setExporting(false);
          return;
        }
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          fileName,
          'text/csv',
        );
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        Alert.alert('저장 완료', `${fileName} 파일이 선택한 폴더에 저장되었습니다.`);
      } else {
        // iOS: 공유 시트
        const path = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(path, {
          mimeType: 'text/csv',
          dialogTitle: `BaeBae ${exportYear}년 거래내역`,
          UTI: 'public.comma-separated-values-text',
        });
      }
      setShowExport(false);
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '내보내기 중 오류가 발생했습니다.');
    }
    setExporting(false);
  };

  const CARD_MAX = 5;

  const handleAddCard = async () => {
    if (!newAlias.trim()) return;
    if (cards.length >= CARD_MAX) {
      Alert.alert('카드 최대 개수 초과', `카드는 최대 ${CARD_MAX}개까지 추가할 수 있어요.`);
      return;
    }
    await addCard(newAlias.trim());
    setNewAlias('');
    setShowCardAdd(false);
  };

  const handleSaveBudget = async () => {
    const v = budgetInput.trim() === '' ? 0 : Number(budgetInput.replace(/[^0-9]/g, ''));
    await setBudget(v);
    setShowBudgetEdit(false);
    Alert.alert('완료', `이번 달 예산이 ₩${v.toLocaleString()}으로 설정되었습니다.`);
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHdrWrap}>
      <Text style={styles.sectionHdr}>{title}</Text>
    </View>
  );

  const MenuItem = ({
    icon, label, right, onPress, disabled, color, testID,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    right?: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    color?: string;
    testID?: string;
  }) => (
    <TouchableOpacity
      testID={testID}
      style={[styles.menuItem, disabled && styles.menuItemDisabled]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Ionicons name={icon} size={20} color={disabled ? colors.textMuted : (color ?? colors.text)} style={{ width: 24 }} />
      <Text style={[styles.menuLabel, disabled && { color: colors.textMuted }, color ? { color } : {}]}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={16} color={disabled ? colors.border : colors.textMuted} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent={false} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>

        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle} allowFontScaling={false}>마이페이지</Text>
        </View>

        {/* Couple card */}
        <View style={styles.coupleCard}>
          <View style={styles.avatarsRow}>
            <View style={[styles.bigAv, { backgroundColor: myGender === 'female' ? '#f2d9e1' : '#cbdfee' }]}>
              <Image
                source={myGender === 'female'
                  ? require('../../assets/avatars/HMHJX.png')
                  : require('../../assets/avatars/aRbFP.png')}
                style={styles.avImg}
                resizeMode="contain"
              />
            </View>
            <Ionicons name="heart" size={16} color={colors.secondary} />
            {partnerGender ? (
              <View style={[styles.bigAv, { backgroundColor: partnerGender === 'female' ? '#f2d9e1' : '#cbdfee' }]}>
                <Image
                  source={partnerGender === 'female'
                    ? require('../../assets/avatars/HMHJX.png')
                    : require('../../assets/avatars/aRbFP.png')}
                  style={styles.avImg}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={[styles.bigAv, { backgroundColor: '#E8E8E8' }]}>
                <Ionicons name="person-outline" size={24} color={colors.textMuted} />
              </View>
            )}
          </View>
          <Text style={styles.coupleName} allowFontScaling={false}>{myName || '나'} & {partnerName || '파트너'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons
              name={partnerName ? 'heart' : 'heart-outline'}
              size={13}
              color={partnerName ? colors.secondary : colors.textMuted}
            />
            <Text style={styles.coupleSub}>
              {partnerName
                ? (partnerSince
                  ? (() => { const d = new Date(partnerSince); return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일부터 함께`; })()
                  : `${partnerName}님과 함께 기록 중이에요`)
                : '파트너와 연결하면 함께 관리해요'}
            </Text>
          </View>
        </View>

        {/* Budget card */}
        <View style={styles.budgetCard}>
          <View style={styles.budgetLeft}>
            <Text style={styles.budgetLbl}>이번 달 예산</Text>
            {budget === 0 ? (
              <Text style={[styles.budgetAmt, { color: colors.inactive }]} allowFontScaling={false}>미설정</Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.budgetAmt} allowFontScaling={false}>₩{budget.toLocaleString()}</Text>
                {isOverBudget && (
                  <View style={styles.overBudgetBadge}>
                    <Text style={styles.overBudgetBadgeText}>이번달 초과</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <TouchableOpacity
            testID="mypage-btn-budget-edit"
            style={styles.budgetEditBtn}
            activeOpacity={0.8}
            onPress={() => { setBudgetInput(budget > 0 ? String(budget) : ''); setShowBudgetEdit(true); }}
          >
            <Text style={styles.budgetEditText}>수정</Text>
          </TouchableOpacity>
        </View>

        {/* 내 카드 */}
        <View style={styles.sectionCard}>
          <SectionHeader title="내 카드 (최대 5개 등록 가능합니다)" />
          {cards.map((card, i) => (
            <React.Fragment key={card.id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.menuItem}>
                <Ionicons name="card-outline" size={20} color={colors.text} style={{ width: 24 }} />
                <Text style={[styles.menuLabel]}>{card.alias}</Text>
                <TouchableOpacity
                  testID={`mypage-btn-card-delete-${card.id}`}
                  style={styles.cardDelBtn}
                  onPress={() => deleteCard(card.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="remove" size={14} color="#E05C5C" />
                </TouchableOpacity>
              </View>
            </React.Fragment>
          ))}
          {cards.length > 0 && <View style={styles.divider} />}
          {cards.length < 5 ? (
            <TouchableOpacity testID="mypage-btn-card-add" style={styles.menuItem} onPress={() => { setNewAlias(''); setShowCardAdd(true); }} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} style={{ width: 24 }} />
              <Text style={[styles.menuLabel, { color: colors.primary }]}>카드 추가</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.menuItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.textMuted} style={{ width: 24 }} />
              <Text style={[styles.menuLabel, { color: colors.textMuted }]}>최대 5개 등록됨</Text>
            </View>
          )}
        </View>

        {/* 파트너 & 가계 */}
        <View style={styles.sectionCard}>
          <SectionHeader title="파트너 & 가계" />
          <MenuItem testID="mypage-btn-rename-household" icon="pencil-outline" label="가계명 변경" onPress={() => navigation.navigate('RenameHousehold')} />
          <View style={styles.divider} />
          {householdId && partnerName ? (
            <MenuItem testID="mypage-btn-partner-disconnect" icon="person-remove-outline" label="파트너 연결 끊기" onPress={() => setShowDisconnect(true)} color="#C47B6A" />
          ) : (
            <MenuItem testID="mypage-btn-partner-invite" icon="person-add-outline" label="파트너 초대" onPress={() => navigation.getParent()?.navigate('PartnerInvite')} />
          )}
        </View>

        {/* 데이터 */}
        <View style={styles.sectionCard}>
          <SectionHeader title="데이터" />
          <MenuItem
            testID="mypage-btn-export-csv"
            icon="download-outline"
            label="내역 내보내기 (CSV)"
            onPress={() => { setExportYear(currentYear); setShowExport(true); }}
          />
        </View>

        {/* 앱 설정 */}
        <View style={styles.sectionCard}>
          <SectionHeader title="앱 설정" />

          {/* 알림 설정 */}
          <View style={styles.menuItem}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} style={{ width: 24 }} />
            <Text style={[styles.menuLabel, { flex: 1 }]}>알림 설정</Text>
            <Switch
              value={notifOn}
              onValueChange={setNotifOn}
              trackColor={{ false: colors.canvas, true: colors.primary }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.canvas}
            />
          </View>
          <View style={styles.divider} />

          {/* 테마 설정 — 비활성화 */}
          <View style={[styles.menuItem, styles.menuItemDisabled]}>
            <Ionicons name="color-palette-outline" size={20} color={colors.textMuted} style={{ width: 24 }} />
            <Text style={[styles.menuLabel, { flex: 1, color: colors.textMuted }]}>테마 설정</Text>
            <Text style={styles.comingSoonBadge}>준비 중</Text>
          </View>
          <View style={styles.divider} />

          {/* 앱 버전 */}
          <View style={styles.menuItem}>
            <Ionicons name="information-circle-outline" size={20} color={colors.text} style={{ width: 24 }} />
            <Text style={[styles.menuLabel, { flex: 1 }]}>앱 버전</Text>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
          <View style={styles.divider} />

          <MenuItem
            testID="mypage-btn-privacy-policy"
            icon="document-text-outline"
            label="개인정보처리방침"
            onPress={() => Alert.alert('개인정보처리방침', '준비 중입니다.')}
          />
        </View>

        {/* 계정 */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            testID="mypage-btn-logout"
            style={styles.menuItem}
            onPress={() => Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
              { text: '취소', style: 'cancel' },
              { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
            ])}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.secondary} style={{ width: 24 }} />
            <Text style={[styles.menuLabel, { color: colors.secondary }]}>로그아웃</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity testID="mypage-btn-withdraw" style={styles.menuItem} onPress={() => setShowWithdraw(true)} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color="#C47B6A" style={{ width: 24 }} />
            <Text style={[styles.menuLabel, { color: '#C47B6A' }]}>회원탈퇴</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* 카드 추가 Bottom Sheet */}
      <Modal visible={showCardAdd} animationType="slide" transparent onRequestClose={() => setShowCardAdd(false)}>
        <KeyboardAvoidingView style={styles.sheetKav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCardAdd(false)} />
          <View style={[styles.cardSheet, { paddingBottom: sheetBottom }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>카드 추가</Text>
            <View style={styles.cardInputRow}>
              <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
              <TextInput
                testID="mypage-input-card-alias"
                style={styles.cardInput}
                value={newAlias}
                onChangeText={setNewAlias}
                placeholder="카드 별칭 입력 (예: 내 신한카드)"
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleAddCard}
                autoFocus
              />
            </View>
            <TouchableOpacity
              testID="mypage-btn-card-add-confirm"
              style={[styles.addBtn, !newAlias.trim() && { opacity: 0.4 }]}
              onPress={handleAddCard}
              disabled={!newAlias.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.addBtnText}>추가하기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 예산 수정 Bottom Sheet */}
      <Modal visible={showBudgetEdit} animationType="slide" transparent onRequestClose={() => setShowBudgetEdit(false)}>
        <KeyboardAvoidingView style={styles.sheetKav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowBudgetEdit(false)} />
          <View style={[styles.cardSheet, { paddingBottom: sheetBottom }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>예산 수정</Text>
            <View style={styles.cardInputRow}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.text }}>₩</Text>
              <TextInput
                testID="mypage-input-budget"
                style={styles.cardInput}
                value={budgetInput !== '' ? Number(budgetInput).toLocaleString('ko-KR') : ''}
                onChangeText={(t) => setBudgetInput(t.replace(/[^0-9]/g, ''))}
                placeholder="예산 금액 입력"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={handleSaveBudget}
                autoFocus
              />
            </View>
            <TouchableOpacity
              testID="mypage-btn-budget-save"
              style={styles.addBtn}
              onPress={handleSaveBudget}
              activeOpacity={0.85}
            >
              <Text style={styles.addBtnText}>저장하기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 내역 내보내기 Bottom Sheet */}
      <Modal visible={showExport} animationType="slide" transparent onRequestClose={() => setShowExport(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowExport(false)} />
        <View style={[styles.exportSheet, { paddingBottom: sheetBottom }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>내역 내보내기</Text>

          {/* 연도 선택 */}
          <Text style={styles.exportLabel}>연도 선택</Text>
          <View style={styles.yearRow}>
            {yearOptions.map(y => (
              <TouchableOpacity
                key={y}
                testID={`mypage-btn-export-year-${y}`}
                style={[styles.yearBtn, exportYear === y && styles.yearBtnActive]}
                onPress={() => setExportYear(y)}
                activeOpacity={0.7}
              >
                <Text style={[styles.yearBtnText, exportYear === y && styles.yearBtnTextActive]}>
                  {y}년
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            testID="mypage-btn-export-confirm"
            style={[styles.addBtn, exporting && { opacity: 0.4 }]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.85}
          >
            {exporting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.addBtnText}>공유하기</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>

      {/* 파트너 연결 끊기 Modal */}
      <Modal visible={showDisconnect} animationType="fade" transparent onRequestClose={() => setShowDisconnect(false)}>
        <View style={styles.withdrawOverlay}>
          <View style={styles.withdrawCard}>
            <Ionicons name="heart-dislike-outline" size={40} color="#C47B6A" style={{ marginBottom: 8 }} />
            <Text style={styles.withdrawTitle}>파트너 연결을 끊겠습니까?</Text>
            <Text style={styles.withdrawSub}>파트너 데이터는 삭제됩니다.{'\n'}이 작업은 되돌릴 수 없습니다.</Text>
            <View style={styles.withdrawBtns}>
              <TouchableOpacity testID="mypage-btn-disconnect-cancel" style={styles.withdrawCancel} onPress={() => setShowDisconnect(false)} activeOpacity={0.8}>
                <Text style={styles.withdrawCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="mypage-btn-disconnect-confirm"
                style={styles.withdrawConfirm}
                onPress={async () => {
                  try {
                    await disconnectPartner();
                    setShowDisconnect(false);
                  } catch (err: any) {
                    setShowDisconnect(false);
                    Alert.alert('오류', err?.message ?? '연결 끊기 처리 중 오류가 발생했습니다.');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.withdrawConfirmText}>연결 끊기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 회원탈퇴 확인 Modal */}
      <Modal visible={showWithdraw} animationType="fade" transparent onRequestClose={() => setShowWithdraw(false)}>
        <View style={styles.withdrawOverlay}>
          <View style={styles.withdrawCard}>
            <Ionicons name="alert-circle-outline" size={40} color="#C47B6A" style={{ marginBottom: 8 }} />
            <Text style={styles.withdrawTitle}>정말 탈퇴하시겠어요?</Text>
            <Text style={styles.withdrawSub}>탈퇴 시 모든 데이터가 삭제되며{'\n'}복구할 수 없습니다.</Text>
            <View style={styles.withdrawBtns}>
              <TouchableOpacity testID="mypage-btn-withdraw-cancel" style={styles.withdrawCancel} onPress={() => setShowWithdraw(false)} activeOpacity={0.8}>
                <Text style={styles.withdrawCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="mypage-btn-withdraw-confirm"
                style={styles.withdrawConfirm}
                onPress={async () => {
                  try {
                    await deleteAccount();
                  } catch (err: any) {
                    setShowWithdraw(false);
                    Alert.alert('탈퇴 실패', err?.message ?? '탈퇴 처리 중 오류가 발생했습니다.');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.withdrawConfirmText}>탈퇴</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 },
  pageTitle: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 30, color: colors.text },

  coupleCard: {
    backgroundColor: colors.card, borderRadius: 20, padding: 20,
    alignItems: 'center', gap: 12,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2,
  },
  avatarsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bigAv: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avImg: { width: 56, height: 56 },
  coupleName: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, letterSpacing: -0.2 },
  coupleSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },

  budgetCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  budgetLeft: { gap: 4 },
  budgetLbl: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  budgetAmt: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 26, color: colors.text },
  budgetEditBtn: { backgroundColor: colors.canvas, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  budgetEditText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  overBudgetBadge: {
    backgroundColor: colors.errorLight, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  overBudgetBadgeText: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.error },

  sectionCard: { backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden' },
  sectionHdrWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  sectionHdr: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textSecondary },

  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  menuItemDisabled: { opacity: 0.5 },
  menuLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, flex: 1 },
  versionText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  comingSoonBadge: {
    fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted,
    backgroundColor: colors.canvas, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.canvas },

  cardDelBtn: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#FFF0F0',
    alignItems: 'center', justifyContent: 'center',
  },

  // Card add sheet
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheetKav: { flex: 1, justifyContent: 'flex-end' },
  cardSheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 16,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  cardInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.canvas, borderRadius: 14, paddingHorizontal: 16, height: 52,
  },
  cardInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  addBtn: { backgroundColor: colors.primary, borderRadius: 100, height: 52, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: '#FFFFFF' },

  kavWrap: { flex: 1, justifyContent: 'flex-end' },
  exportSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 16,
  },

  // Export sheet
  exportLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  yearRow: { flexDirection: 'row', gap: 8 },
  yearBtn: {
    flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.canvas,
    alignItems: 'center', justifyContent: 'center',
  },
  yearBtnActive: { backgroundColor: colors.primary },
  yearBtnText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  yearBtnTextActive: { color: '#fff', fontFamily: fonts.semiBold },

  // Withdraw modal
  withdrawOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  withdrawCard: {
    backgroundColor: colors.card, borderRadius: 20, padding: 24,
    width: '82%', alignItems: 'center', gap: 8,
  },
  withdrawTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  withdrawSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  withdrawBtns: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
  withdrawCancel: { flex: 1, height: 48, borderRadius: 12, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  withdrawCancelText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  withdrawConfirm: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
  withdrawConfirmText: { fontFamily: fonts.bold, fontSize: 15, color: '#C47B6A' },
});
