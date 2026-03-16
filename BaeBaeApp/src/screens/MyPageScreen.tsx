import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  ScrollView, Switch, Image, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useProfile } from '../context/ProfileContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function MyPageScreen() {
  const navigation = useNavigation<Nav>();
  const { budget, setBudget, cards, addCard, deleteCard } = useProfile();
  const [notifOn, setNotifOn] = useState(true);
  const [showCardAdd, setShowCardAdd] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const handleAddCard = async () => {
    if (!newAlias.trim()) return;
    await addCard(newAlias.trim());
    setNewAlias('');
    setShowCardAdd(false);
  };

  const handleSaveBudget = async () => {
    const v = Number(budgetInput.replace(/[^0-9]/g, ''));
    if (!v) return;
    await setBudget(v);
    setShowBudgetEdit(false);
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHdrWrap}>
      <Text style={styles.sectionHdr}>{title}</Text>
    </View>
  );

  const MenuItem = ({
    icon, label, right, onPress, disabled,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    right?: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.menuItem, disabled && styles.menuItemDisabled]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Ionicons name={icon} size={20} color={disabled ? colors.textMuted : colors.text} style={{ width: 24 }} />
      <Text style={[styles.menuLabel, disabled && { color: colors.textMuted }]}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={16} color={disabled ? colors.border : colors.textMuted} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>마이페이지</Text>
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </View>

        {/* Couple card */}
        <View style={styles.coupleCard}>
          <View style={styles.avatarsRow}>
            <View style={[styles.bigAv, { backgroundColor: '#f2d9e1' }]}>
              <Image source={require('../../assets/avatars/HMHJX.png')} style={styles.avImg} resizeMode="contain" />
            </View>
            <Ionicons name="heart" size={16} color={colors.secondary} />
            <View style={[styles.bigAv, { backgroundColor: '#cbdfee' }]}>
              <Image source={require('../../assets/avatars/aRbFP.png')} style={styles.avImg} resizeMode="contain" />
            </View>
          </View>
          <Text style={styles.coupleName}>민지 &amp; 준호</Text>
          <Text style={styles.coupleSub}>2023년 1월 1일부터 함께 ✨</Text>
        </View>

        {/* Budget card */}
        <View style={styles.budgetCard}>
          <View style={styles.budgetLeft}>
            <Text style={styles.budgetLbl}>이번 달 예산</Text>
            <Text style={styles.budgetAmt}>₩{budget.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={styles.budgetEditBtn}
            activeOpacity={0.8}
            onPress={() => { setBudgetInput(String(budget)); setShowBudgetEdit(true); }}
          >
            <Text style={styles.budgetEditText}>수정</Text>
          </TouchableOpacity>
        </View>

        {/* 내 카드 */}
        <View style={styles.sectionCard}>
          <SectionHeader title="내 카드" />
          {cards.map((card, i) => (
            <React.Fragment key={card.id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.menuItem}>
                <Ionicons name="card-outline" size={20} color={colors.text} style={{ width: 24 }} />
                <Text style={[styles.menuLabel]}>{card.alias}</Text>
                <TouchableOpacity
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
          <TouchableOpacity style={styles.menuItem} onPress={() => { setNewAlias(''); setShowCardAdd(true); }} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} style={{ width: 24 }} />
            <Text style={[styles.menuLabel, { color: colors.primary }]}>카드 추가</Text>
          </TouchableOpacity>
        </View>

        {/* 파트너 & 가계 */}
        <View style={styles.sectionCard}>
          <SectionHeader title="파트너 & 가계" />
          <MenuItem icon="pencil-outline" label="가계명 변경" onPress={() => navigation.navigate('RenameHousehold')} />
          <View style={styles.divider} />
          <MenuItem icon="person-add-outline" label="파트너 초대" />
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
            icon="document-text-outline"
            label="개인정보처리방침"
            onPress={() => Alert.alert('개인정보처리방침', '준비 중입니다.')}
          />
        </View>

        {/* 계정 */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
              { text: '취소', style: 'cancel' },
              { text: '로그아웃', style: 'destructive' },
            ])}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.secondary} style={{ width: 24 }} />
            <Text style={[styles.menuLabel, { color: colors.secondary }]}>로그아웃</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowWithdraw(true)} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color="#C47B6A" style={{ width: 24 }} />
            <Text style={[styles.menuLabel, { color: '#C47B6A' }]}>회원탈퇴</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* 카드 추가 Bottom Sheet */}
      <Modal visible={showCardAdd} animationType="slide" transparent onRequestClose={() => setShowCardAdd(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCardAdd(false)} />
        <View style={styles.cardSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>카드 추가</Text>
          <View style={styles.cardInputRow}>
            <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
            <TextInput
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
            style={[styles.addBtn, !newAlias.trim() && { opacity: 0.4 }]}
            onPress={handleAddCard}
            disabled={!newAlias.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.addBtnText}>추가하기</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* 예산 수정 Bottom Sheet */}
      <Modal visible={showBudgetEdit} animationType="slide" transparent onRequestClose={() => setShowBudgetEdit(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowBudgetEdit(false)} />
        <View style={styles.cardSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>예산 수정</Text>
          <View style={styles.cardInputRow}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.text }}>₩</Text>
            <TextInput
              style={styles.cardInput}
              value={budgetInput ? Number(budgetInput).toLocaleString('ko-KR') : ''}
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
            style={[styles.addBtn, !budgetInput.trim() && { opacity: 0.4 }]}
            onPress={handleSaveBudget}
            disabled={!budgetInput.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.addBtnText}>저장하기</Text>
          </TouchableOpacity>
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
              <TouchableOpacity style={styles.withdrawCancel} onPress={() => setShowWithdraw(false)} activeOpacity={0.8}>
                <Text style={styles.withdrawCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.withdrawConfirm} onPress={() => setShowWithdraw(false)} activeOpacity={0.8}>
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
  pageTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },

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
  budgetAmt: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  budgetEditBtn: { backgroundColor: colors.canvas, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  budgetEditText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },

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
  divider: { height: 1, backgroundColor: colors.canvas },

  cardDelBtn: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#FFF0F0',
    alignItems: 'center', justifyContent: 'center',
  },

  // Card add sheet
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  cardSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, gap: 16,
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
