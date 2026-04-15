import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts } from '../theme/colors';
import {
  subscribeComments, addCommentFS, updateCommentFS, deleteCommentFS, toggleCommentLikeFS,
  addNotificationFS, type TxComment,
} from '../services/firestoreService';

type Props = {
  txId: string;
  householdId: string | null;
  userId: string;
  userName: string;
  partnerUserId?: string;
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

const localKey = (id: string) => `@baebae_comments_${id}`;

export default function TxCommentSection({ txId, householdId, userId, userName, partnerUserId }: Props) {
  const [comments, setComments] = useState<TxComment[]>([]);
  const [inputText, setInputText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [sending, setSending] = useState(false);
  const editInputRef = useRef<TextInput>(null);

  useEffect(() => {
    setComments([]);
    setInputText('');
    setEditingId(null);
    if (!txId) return;
    if (householdId) {
      return subscribeComments(householdId, txId, setComments);
    } else {
      AsyncStorage.getItem(localKey(txId)).then(val => {
        if (val) setComments(JSON.parse(val));
      });
    }
  }, [txId, householdId]);

  const saveLocal = async (list: TxComment[]) => {
    setComments(list);
    await AsyncStorage.setItem(localKey(txId), JSON.stringify(list));
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      if (householdId) {
        await addCommentFS(householdId, txId, {
          text, authorId: userId, authorName: userName,
          likes: [], createdAt: new Date().toISOString(),
        });
        if (partnerUserId) {
          const preview = text.length > 20 ? text.slice(0, 20) + '...' : text;
          addNotificationFS(partnerUserId, {
            type: 'comment',
            message: `${userName}님이 댓글을 달았어요 · "${preview}"`,
            txId,
            read: false,
            createdAt: new Date().toISOString(),
            fromName: userName,
          }).catch(() => {});
        }
      } else {
        await saveLocal([...comments, {
          id: Date.now().toString(), text,
          authorId: userId, authorName: userName,
          likes: [], createdAt: new Date().toISOString(),
        }]);
      }
      setInputText('');
    } catch { Alert.alert('오류', '댓글 등록에 실패했습니다.'); }
    setSending(false);
  };

  const handleEditSave = async (cId: string) => {
    const text = editText.trim();
    if (!text) return;
    try {
      if (householdId) {
        await updateCommentFS(householdId, txId, cId, text);
      } else {
        await saveLocal(comments.map(c =>
          c.id === cId ? { ...c, text, updatedAt: new Date().toISOString() } : c,
        ));
      }
      setEditingId(null);
    } catch { Alert.alert('오류', '수정에 실패했습니다.'); }
  };

  const handleDelete = (cId: string) => {
    Alert.alert('댓글 삭제', '이 댓글을 삭제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          try {
            if (householdId) await deleteCommentFS(householdId, txId, cId);
            else await saveLocal(comments.filter(c => c.id !== cId));
          } catch { Alert.alert('오류', '삭제에 실패했습니다.'); }
        },
      },
    ]);
  };

  const handleLike = async (c: TxComment) => {
    const liked = c.likes.includes(userId);
    try {
      if (householdId) {
        await toggleCommentLikeFS(householdId, txId, c.id, userId, liked);
      } else {
        const likes = liked
          ? c.likes.filter(id => id !== userId)
          : [...c.likes, userId];
        await saveLocal(comments.map(x => x.id === c.id ? { ...x, likes } : x));
      }
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons name="chatbubbles-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.sectionLabel}>
          댓글{comments.length > 0 ? ` (${comments.length})` : ''}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      {comments.length === 0 ? (
        <Text style={styles.empty}>첫 댓글을 남겨보세요!</Text>
      ) : (
        [...comments].reverse().map(c => {
          const isOwn = c.authorId === userId;
          const liked = c.likes.includes(userId);
          const isEditing = editingId === c.id;
          return (
            <View key={c.id} style={styles.commentRow}>
              <View style={[styles.avatar, { backgroundColor: isOwn ? colors.primaryLighter : '#EBF0FF' }]}>
                <Text style={[styles.avatarText, { color: isOwn ? colors.primary : '#4A90D9' }]}>
                  {c.authorName.charAt(0)}
                </Text>
              </View>
              <View style={styles.bubbleWrap}>
                <View style={styles.bubbleTop}>
                  <Text style={styles.authorName}>{c.authorName}</Text>
                  <Text style={styles.timeText}>
                    {timeAgo(c.updatedAt ?? c.createdAt)}{c.updatedAt ? ' · 수정됨' : ''}
                  </Text>
                </View>
                {isEditing ? (
                  <View style={styles.editInline}>
                    <TextInput
                      ref={editInputRef}
                      style={styles.editInlineInput}
                      value={editText}
                      onChangeText={setEditText}
                      multiline
                    />
                    <View style={styles.editInlineActions}>
                      <TouchableOpacity onPress={() => handleEditSave(c.id)} style={styles.editSaveBtn}>
                        <Text style={styles.editSaveText}>저장</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingId(null)} style={styles.editCancelBtn}>
                        <Text style={styles.editCancelText}>취소</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.commentText}>{c.text}</Text>
                )}
                {!isEditing && (
                  <View style={styles.commentActions}>
                    {isOwn ? (
                      <>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingId(c.id);
                            setEditText(c.text);
                            setTimeout(() => editInputRef.current?.focus(), 100);
                          }}
                          style={styles.actionLink}
                        >
                          <Text style={styles.actionLinkText}>수정</Text>
                        </TouchableOpacity>
                        <Text style={styles.actionDot}>·</Text>
                        <TouchableOpacity onPress={() => handleDelete(c.id)} style={styles.actionLink}>
                          <Text style={[styles.actionLinkText, { color: '#E05C5C' }]}>삭제</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity onPress={() => handleLike(c)} style={styles.likeBtn} activeOpacity={0.7}>
                        <Ionicons
                          name={liked ? 'heart' : 'heart-outline'}
                          size={12}
                          color={liked ? '#E05C9C' : colors.textMuted}
                        />
                        {c.likes.length > 0 && (
                          <Text style={[styles.likeCount, liked && { color: '#E05C9C' }]}>
                            {c.likes.length}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })
      )}
      </ScrollView>

      {/* Input row - always pinned at bottom */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="댓글 달기..."
          placeholderTextColor={colors.textMuted}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          maxLength={200}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.8}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={14} color="#fff" />
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 4 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionLabel: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textSecondary },

  empty: {
    fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted,
    textAlign: 'center', paddingVertical: 12, paddingBottom: 16,
  },

  commentRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2, flexShrink: 0,
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 13 },

  bubbleWrap: { flex: 1 },
  bubbleTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  authorName: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.text },
  timeText: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  commentText: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 20 },

  commentActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  actionLink: { paddingVertical: 2, paddingHorizontal: 2 },
  actionLinkText: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted },
  actionDot: { fontFamily: fonts.regular, fontSize: 11, color: colors.border },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 2 },
  likeCount: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted },

  editInline: { gap: 6 },
  editInlineInput: {
    backgroundColor: colors.canvas, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 8,
    fontFamily: fonts.regular, fontSize: 14, color: colors.text, minHeight: 40,
  },
  editInlineActions: { flexDirection: 'row', gap: 8 },
  editSaveBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
    backgroundColor: colors.primary,
  },
  editSaveText: { fontFamily: fonts.semiBold, fontSize: 12, color: '#fff' },
  editCancelBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
    backgroundColor: colors.canvas,
  },
  editCancelText: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: colors.canvas, borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 11 : 8,
    paddingBottom: Platform.OS === 'ios' ? 11 : 8,
    fontFamily: fonts.regular, fontSize: 14, color: colors.text,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
