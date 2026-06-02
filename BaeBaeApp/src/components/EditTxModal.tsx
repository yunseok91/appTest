import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ScrollView, Alert, Image, KeyboardAvoidingView, Platform,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/colors';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../config/categoryIcons';
import type { Transaction } from '../context/TransactionContext';

const MEMO_MAX = 50;
type TimeSlot = '아침' | '점심' | '저녁';
const TIME_SLOTS: TimeSlot[] = ['아침', '점심', '저녁'];
const TIME_ICON: Record<TimeSlot, keyof typeof Ionicons.glyphMap> = { 아침: 'sunny-outline', 점심: 'sunny', 저녁: 'moon-outline' };

type Props = {
  tx: Transaction | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Transaction>) => Promise<void>;
  cards?: { id: string; alias: string; color: string }[];
};

export default function EditTxModal({ tx, onClose, onSave, cards = [] }: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const popupH = Math.min(windowHeight - insets.top - Math.max(insets.bottom, 24) - 48, 680);

  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [time, setTime] = useState<TimeSlot>('아침');
  const [categoryKey, setCategoryKey] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'card'>('cash');
  const [cardName, setCardName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [recurringEdit, setRecurringEdit] = useState<'monthly' | 'weekly' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tx) {
      setAmount(String(tx.amount));
      setMemo(tx.memo);
      setTime(tx.time as TimeSlot);
      setCategoryKey(tx.categoryKey);
      setPayMethod(tx.payMethod);
      setCardName(tx.cardName ?? '');
      setPhotoUri(tx.photoUri ?? null);
      setRecurringEdit(tx.recurring ?? null);
    }
  }, [tx]);

  const categories = tx?.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

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

  const handleSave = async () => {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) {
      Alert.alert('알림', '올바른 금액을 입력해 주세요.');
      return;
    }
    const selectedCat = categories.find(c => c.key === categoryKey);
    setSaving(true);
    try {
      await onSave(tx!.id, {
        amount: amt,
        memo,
        time,
        ...(selectedCat && {
          category: selectedCat.label,
          categoryKey: selectedCat.key,
          categoryIcon: selectedCat.icon,
          categoryIconColor: selectedCat.iconColor,
          categoryBgColor: selectedCat.bgColor,
        }),
        payMethod,
        cardName: payMethod === 'card' ? cardName || undefined : undefined,
        photoUri: photoUri ?? undefined,
        recurring: recurringEdit,
      });
      onClose();
    } catch {
      Alert.alert('오류', '수정에 실패했습니다.');
    }
    setSaving(false);
  };

  if (!tx) return null;

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.wrap}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
          <View style={[styles.popup, { height: popupH }]}>

            {/* ── 헤더 ── */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>내역 수정</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />

            {/* ── 스크롤 영역 ── */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {/* 카테고리 */}
              <View style={styles.section}>
                <Text style={styles.label}>카테고리</Text>
                <View style={styles.catGrid}>
                  {categories.map(cat => {
                    const active = categoryKey === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        style={[styles.catChip,
                          active && { borderColor: cat.iconColor, backgroundColor: cat.bgColor }]}
                        onPress={() => setCategoryKey(cat.key)}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={12}
                          color={active ? cat.iconColor : colors.inactive}
                        />
                        <Text style={[styles.catChipText, active && { color: cat.iconColor }]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.divider} />

              {/* 금액 */}
              <View style={styles.section}>
                <Text style={styles.label}>금액</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={v => setAmount(v.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="금액 입력"
                  placeholderTextColor={colors.inactive}
                />
              </View>

              <View style={styles.divider} />

              {/* 메모 */}
              <View style={styles.section}>
                <Text style={styles.label}>메모</Text>
                <TextInput
                  style={styles.input}
                  value={memo}
                  onChangeText={setMemo}
                  placeholder="메모 입력"
                  placeholderTextColor={colors.inactive}
                  maxLength={MEMO_MAX}
                />
              </View>

              <View style={styles.divider} />

              {/* 시간대 */}
              <View style={styles.section}>
                <Text style={styles.label}>시간대</Text>
                <View style={styles.chipRow}>
                  {TIME_SLOTS.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.timeChip, time === t && styles.timeChipActive]}
                      onPress={() => setTime(t)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name={TIME_ICON[t]} size={13} color={time === t ? '#fff' : colors.text} />
                        <Text style={[styles.timeChipText, time === t && styles.timeChipTextActive]}>{t}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.divider} />

              {/* 결제수단 */}
              <View style={styles.section}>
                <Text style={styles.label}>결제수단</Text>
                <View style={styles.chipRow}>
                  {([['cash', '현금', 'cash-outline'], ['card', '카드', 'card-outline']] as const).map(
                    ([method, label, icon]) => (
                      <TouchableOpacity
                        key={method}
                        style={[styles.payBtn, payMethod === method && styles.payBtnActive]}
                        onPress={() => setPayMethod(method)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={icon}
                          size={13}
                          color={payMethod === method ? '#fff' : colors.inactive}
                        />
                        <Text style={[styles.payBtnText, payMethod === method && styles.payBtnTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
                {payMethod === 'card' && (
                  cards.length > 0 ? (
                    <View style={[styles.chipRow, { marginTop: 10 }]}>
                      {cards.map(card => {
                        const active = cardName === card.alias;
                        return (
                          <TouchableOpacity
                            key={card.id}
                            style={[styles.payBtn, active && styles.payBtnActive]}
                            onPress={() => setCardName(card.alias)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="card-outline" size={13} color={active ? '#fff' : colors.inactive} />
                            <Text style={[styles.payBtnText, active && styles.payBtnTextActive]}>
                              {card.alias}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <TextInput
                      style={[styles.input, { marginTop: 10 }]}
                      value={cardName}
                      onChangeText={setCardName}
                      placeholder="카드 이름 (예: 신한카드)"
                      placeholderTextColor={colors.inactive}
                    />
                  )
                )}
              </View>

              <View style={styles.divider} />

              {/* 사진 */}
              <View style={styles.section}>
                <Text style={styles.label}>사진</Text>
                <TouchableOpacity style={styles.photoArea} onPress={handlePickPhoto} activeOpacity={0.85}>
                  {photoUri ? (
                    <>
                      <Image source={{ uri: photoUri }} style={styles.photoImg} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.photoRemoveBtn}
                        onPress={() => setPhotoUri(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={22} color="#fff" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.photoEmpty}>
                      <Ionicons name="camera-outline" size={24} color={colors.inactive} />
                      <Text style={styles.photoEmptyText}>사진 추가 / 변경</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* 반복 설정 */}
              <View style={styles.section}>
                <Text style={styles.label}>반복 설정</Text>
                <View style={styles.chipRow}>
                  {([['없음', null], ['매주', 'weekly'], ['매월', 'monthly']] as const).map(([label, val]) => (
                    <TouchableOpacity
                      key={label}
                      style={[styles.timeChip, recurringEdit === val && styles.timeChipActive]}
                      onPress={() => setRecurringEdit(val)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.timeChipText, recurringEdit === val && styles.timeChipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* ── 저장 버튼 ── */}
            <View style={styles.divider} />
            <View style={styles.saveWrap}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>저장하기</Text>
              </TouchableOpacity>
            </View>

          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  popup: { width: '100%', backgroundColor: colors.card, borderRadius: 24, overflow: 'hidden' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    height: 52, paddingHorizontal: 20,
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center',
  },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },

  section: { paddingHorizontal: 20, paddingVertical: 14 },
  label: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textSecondary, marginBottom: 10 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100,
    backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border,
  },
  catChipText: { fontFamily: fonts.medium, fontSize: 11, color: colors.textSecondary },

  input: {
    height: 48, backgroundColor: colors.canvas, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.text,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: colors.canvas },
  timeChipActive: { backgroundColor: colors.primary },
  timeChipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  timeChipTextActive: { color: '#fff' },

  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100,
    backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border,
  },
  payBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  payBtnText: { fontFamily: fonts.medium, fontSize: 13, color: colors.inactive },
  payBtnTextActive: { color: '#fff', fontFamily: fonts.semiBold },

  photoArea: {
    height: 110, borderRadius: 12, overflow: 'hidden',
    backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border,
  },
  photoImg: { width: '100%', height: '100%' },
  photoRemoveBtn: { position: 'absolute', top: 8, right: 8 },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoEmptyText: { fontFamily: fonts.medium, fontSize: 12, color: colors.inactive },

  saveWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  saveBtn: {
    height: 52, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: '#fff' },
});
