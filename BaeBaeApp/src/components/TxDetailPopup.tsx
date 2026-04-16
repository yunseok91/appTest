/**
 * TxDetailPopup — 거래 상세 팝업 (HistoryScreen / CalendarScreen 공용)
 *
 * 레이아웃:
 *   [카테고리 칩] .............. [×]
 *   [사람] [결제수단] | [날짜] | [🌅아침] [☀️점심] [🌙저녁]
 *   -₩10,000
 *   ─────────────────────────────
 *   💬 메모 텍스트
 *   [사진 (있을 때만)]
 *   ─────────────────────────────
 *   댓글 (flex:1)
 *   ─────────────────────────────
 *   [수정] [삭제]  /  🔒 xxx이(가) 등록한 내역입니다
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/colors';
import { type Transaction } from '../context/TransactionContext';
import TxCommentSection from './TxCommentSection';

type TimeSlot = '아침' | '점심' | '저녁';
const TIME_SLOTS: TimeSlot[] = ['아침', '점심', '저녁'];
const TIME_EMOJI: Record<TimeSlot, string> = { 아침: '🌅', 점심: '☀️', 저녁: '🌙' };

export function getDateLabel(dateStr: string): string {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const t = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  const y = `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`;
  if (dateStr === t) return '오늘';
  if (dateStr === y) return '어제';
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

interface Props {
  tx: Transaction;
  myName: string;
  householdId: string | null;
  userId: string;
  partnerUserId?: string;
  height: number;
  kbHeight: number;
  idPrefix: string;              // 'history' | 'calendar'
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onPhotoExpand: (uri: string) => void;
}

export default function TxDetailPopup({
  tx, myName, householdId, userId, partnerUserId,
  height, kbHeight, idPrefix,
  onClose, onEdit, onDelete, onPhotoExpand,
}: Props) {
  const isMe = tx.person === myName;
  const personColor = isMe ? '#C4729A' : '#4A90D9';
  const personBg   = isMe ? '#FDF0F6' : '#EBF0FF';

  return (
    <View style={[styles.popup, { height }]}>

      {/* ── 헤더: 카테고리 칩 + 닫기 ── */}
      <View style={styles.topRow}>
        <View style={[styles.catChip, { backgroundColor: tx.categoryBgColor }]}>
          <Ionicons name={tx.categoryIcon as any} size={14} color={tx.categoryIconColor} />
          <Text style={[styles.catChipText, { color: tx.categoryIconColor }]}>{tx.category}</Text>
        </View>
        <TouchableOpacity
          testID={`${idPrefix}-btn-detail-close`}
          style={styles.closeBtn}
          onPress={onClose}
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── 사람 · 결제 | 날짜 ── */}
      <View style={styles.metaRow}>
        <View style={[styles.personBadge, { backgroundColor: personBg }]}>
          <Text style={[styles.personText, { color: personColor }]}>{tx.person}</Text>
        </View>
        <View style={[styles.payBadge, {
          backgroundColor: tx.payMethod === 'cash' ? '#F0F4FF' : '#FFF0F6',
        }]}>
          <Text style={[styles.payText, {
            color: tx.payMethod === 'cash' ? '#4A6CF7' : '#E05C9C',
          }]}>
            {tx.payMethod === 'cash' ? '현금' : tx.cardName || '카드'}
          </Text>
        </View>
        <View style={styles.sep} />
        <Text style={styles.dateText}>{getDateLabel(tx.date)}</Text>
      </View>

      {/* ── 금액 + 선택된 시간대 칩 1개 (우측) ── */}
      <View style={styles.amountRow}>
        <Text
          style={[styles.amount, { color: tx.type === 'income' ? colors.primary : colors.text }]}
          allowFontScaling={false}
        >
          {tx.type === 'income' ? '+' : '-'}₩{tx.amount.toLocaleString()}
        </Text>
        {tx.time && (
          <View style={styles.timeChipSingle}>
            <Text style={styles.timeChipSingleText}>
              {TIME_EMOJI[tx.time as TimeSlot]} {tx.time}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* ── 메모 + 사진 (키보드 시 숨김) ── */}
      <ScrollView
        style={[styles.midScroll, kbHeight > 0 && { maxHeight: 0, overflow: 'hidden' }]}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 4 }}
      >
        <View style={styles.memoRow}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.inactive} style={{ marginTop: 2 }} />
          <Text style={styles.memoText}>{tx.memo || '(메모 없음)'}</Text>
        </View>

        {tx.photoUri && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              testID={`${idPrefix}-btn-photo-expand`}
              onPress={() => onPhotoExpand(tx.photoUri!)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: tx.photoUri }} style={styles.photo} resizeMode="cover" />
              <View style={styles.photoExpandBtn}>
                <Ionicons name="expand-outline" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {kbHeight === 0 && <View style={styles.divider} />}

      {/* ── 댓글 + 수정/삭제 ── */}
      <View style={{ flex: 1 }}>
        <TxCommentSection
          txId={tx.id}
          householdId={householdId}
          userId={userId}
          userName={myName}
          partnerUserId={partnerUserId}
        />

        <View style={styles.actionDivider} />

        {isMe ? (
          <View style={styles.actions}>
            <TouchableOpacity
              testID={`${idPrefix}-btn-edit`}
              style={styles.editBtn}
              activeOpacity={0.8}
              onPress={() => onEdit(tx)}
            >
              <Ionicons name="pencil-outline" size={16} color={colors.text} />
              <Text style={styles.editBtnText}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID={`${idPrefix}-btn-delete`}
              style={styles.deleteBtn}
              activeOpacity={0.8}
              onPress={() =>
                Alert.alert('삭제', `"${tx.memo}" 내역을 삭제할까요?`, [
                  { text: '취소', style: 'cancel' },
                  { text: '삭제', style: 'destructive', onPress: () => onDelete(tx) },
                ])
              }
            >
              <Ionicons name="trash-outline" size={16} color="#E05C5C" />
              <Text style={styles.deleteBtnText}>삭제</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.viewOnlyRow}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.inactive} />
            <Text style={styles.viewOnlyText}>{tx.person}이(가) 등록한 내역입니다</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  popup: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 24,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },

  // 헤더
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44,
  },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100,
  },
  catChipText: { fontFamily: fonts.semiBold, fontSize: 13 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.canvas,
    alignItems: 'center', justifyContent: 'center',
  },

  // 메타 한 줄 (사람·결제|날짜|시간대)
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, flexWrap: 'wrap', marginBottom: 6,
  },
  personBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  personText: { fontFamily: fonts.semiBold, fontSize: 11 },
  payBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  payText: { fontFamily: fonts.semiBold, fontSize: 10 },
  sep: { width: 1, height: 12, backgroundColor: colors.border, marginHorizontal: 2 },
  dateText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary },

  // 금액 + 시간칩 행
  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  amount: {
    fontFamily: fonts.bold, fontSize: 34, lineHeight: 42,
    letterSpacing: -0.5, color: colors.text,
  },
  // 상세 보기: 선택된 시간대 1개만 표시
  timeChipSingle: {
    height: 27, borderRadius: 100, paddingHorizontal: 16,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  timeChipSingleText: { fontFamily: fonts.semiBold, fontSize: 13, color: '#FFFFFF' },

  // 구분선
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 4,
    marginHorizontal: -20,
  },

  // 메모 + 사진 스크롤
  midScroll: { maxHeight: 220, flexShrink: 1 },
  memoRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 8, paddingVertical: 12,
  },
  memoText: {
    flex: 1, fontFamily: fonts.regular, fontSize: 14,
    color: colors.text, lineHeight: 22,
  },
  photo: { width: '100%', height: 120, borderRadius: 12, marginVertical: 4 },
  photoExpandBtn: {
    position: 'absolute', bottom: 12, right: 8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },

  // 액션
  actionDivider: {
    height: 1, backgroundColor: colors.border,
    marginTop: 12, marginBottom: 12, marginHorizontal: -20,
  },
  actions: { flexDirection: 'row', gap: 12, paddingTop: 4, paddingBottom: 12 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, height: 52,
    borderRadius: 14, backgroundColor: colors.canvas,
  },
  editBtnText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, height: 52,
    borderRadius: 14, backgroundColor: '#FFF0F0',
  },
  deleteBtnText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#E05C5C' },
  viewOnlyRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingTop: 4, paddingBottom: 8,
  },
  viewOnlyText: { fontFamily: fonts.regular, fontSize: 13, color: colors.inactive },
});
