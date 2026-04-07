import {
  doc, setDoc, getDoc, updateDoc,
  collection, addDoc, deleteDoc,
  query, where, getDocs, onSnapshot,
  serverTimestamp, Timestamp, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Transaction } from '../context/TransactionContext';

// ─── Types ───────────────────────────────────────────
export type FirestoreUser = {
  name: string;
  gender: 'male' | 'female';
  householdId: string | null;
  inviteCode: string;
  inviteCodeNorm?: string;
  inviteCodeExpiresAt?: string;
  createdAt: Timestamp;
};

export type FirestoreHousehold = {
  name: string;
  memberIds: string[];
  budget?: number;
  createdAt: Timestamp;
};

// ─── User ────────────────────────────────────────────

/** 로그인 시 users doc 생성(최초) 또는 업데이트. { householdId, inviteCode, name, gender } 반환 */
export const syncUser = async (
  userId: string,
  inviteCode: string,
  extra?: { name?: string; gender?: 'male' | 'female'; sessionToken?: string },
): Promise<{ householdId: string | null; inviteCode: string | null; name: string; gender: 'male' | 'female' }> => {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data() as FirestoreUser;
    const updates: Record<string, any> = {};
    // inviteCode가 비어있지 않을 때만 업데이트 (빈 문자열로 기존 코드 덮어쓰기 방지)
    if (inviteCode) {
      const codeChanged = inviteCode !== data.inviteCode;
      updates.inviteCode = inviteCode;
      updates.inviteCodeNorm = inviteCode.replace(/-/g, '');
      // 코드가 바뀌거나, 만료 시각이 없거나, 이미 만료된 경우 갱신
      const alreadyExpired = data.inviteCodeExpiresAt
        && new Date(data.inviteCodeExpiresAt).getTime() < Date.now();
      if (codeChanged || !data.inviteCodeExpiresAt || alreadyExpired) {
        updates.inviteCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24시간
      }
    }
    if (extra?.name) updates.name = extra.name;
    if (extra?.gender) updates.gender = extra.gender;
    if (extra?.sessionToken) updates.sessionToken = extra.sessionToken;
    if (Object.keys(updates).length > 0) await updateDoc(ref, updates);
    return {
      householdId: data.householdId ?? null,
      inviteCode: inviteCode || data.inviteCode || null,
      name: data.name ?? '',
      gender: data.gender ?? 'male',
    };
  } else {
    // 최초 생성
    await setDoc(ref, {
      name: extra?.name ?? '',
      gender: extra?.gender ?? 'male',
      householdId: null,
      inviteCode,
      inviteCodeNorm: inviteCode.replace(/-/g, ''),
      inviteCodeExpiresAt: inviteCode ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : '',
      createdAt: serverTimestamp(),
    });
    return { householdId: null, inviteCode: inviteCode || null, name: '', gender: 'male' };
  }
};

/**
 * 새 온보딩 시작 시 프로필 초기화 — 이전 household 연동 해제 + 이름/성별 설정
 * (같은 Google 계정으로 재온보딩하는 경우 깨끗한 상태로 시작)
 */
export const initProfile = async (
  userId: string,
  name: string,
  gender: 'male' | 'female',
): Promise<void> => {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const oldHouseholdId = (snap.data() as FirestoreUser).householdId;
    // 기존 household에서 자신을 제거
    if (oldHouseholdId) {
      try {
        const hRef = doc(db, 'households', oldHouseholdId);
        const hSnap = await getDoc(hRef);
        if (hSnap.exists()) {
          const memberIds: string[] = hSnap.data().memberIds ?? [];
          await updateDoc(hRef, { memberIds: memberIds.filter(id => id !== userId) });
        }
      } catch {}
    }
    await updateDoc(ref, { name, gender, householdId: null });
  } else {
    await setDoc(ref, {
      name, gender,
      householdId: null,
      inviteCode: '',
      inviteCodeNorm: '',
      createdAt: serverTimestamp(),
    });
  }
};

// ─── Household ───────────────────────────────────────

/** 온보딩 완료 시 household 생성. householdId 반환 */
export const createHousehold = async (
  userId: string,
  householdName: string,
): Promise<string> => {
  const ref = await addDoc(collection(db, 'households'), {
    name: householdName,
    memberIds: [userId],
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', userId), { householdId: ref.id });
  return ref.id;
};

/** 초대코드로 상대방 household에 합류. householdId 반환. 실패 시 null */
export const joinHouseholdByCode = async (
  userId: string,
  inviteCode: string,
): Promise<string | null> => {
  const normalized = inviteCode.toUpperCase().replace(/-/g, '');

  // inviteCodeNorm으로 검색, 없으면 inviteCode(하이픈 포함)로 fallback
  let snap = await getDocs(query(collection(db, 'users'), where('inviteCodeNorm', '==', normalized)));
  if (snap.empty) {
    snap = await getDocs(query(collection(db, 'users'), where('inviteCode', '==', inviteCode.toUpperCase())));
  }
  if (snap.empty) return null;

  const targetDoc = snap.docs[0];
  if (targetDoc.id === userId) return null; // 자기 코드 사용 불가

  // 본인이 이미 다른 파트너와 연결된 경우 차단
  const myRef = doc(db, 'users', userId);
  const mySnap = await getDoc(myRef);
  if (mySnap.exists()) {
    const myData = mySnap.data() as FirestoreUser;
    if (myData.householdId) {
      // 기존 household의 멤버가 2명 이상이면 이미 파트너 연결 상태
      try {
        const myHSnap = await getDoc(doc(db, 'households', myData.householdId));
        if (myHSnap.exists()) {
          const myMembers: string[] = myHSnap.data().memberIds ?? [];
          if (myMembers.length >= 2) {
            throw new Error('이미 파트너와 연결되어 있어요. 먼저 연결을 해제해주세요.');
          }
        }
      } catch (e: any) {
        if (e?.message?.includes('이미 파트너')) throw e;
      }
    }
  }

  const targetData = targetDoc.data() as FirestoreUser;

  // 초대코드 만료 체크 (10분)
  const expiresAt = (targetDoc.data() as any).inviteCodeExpiresAt;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    throw new Error('초대코드가 만료되었어요.\n파트너에게 코드를 새로 발급해달라고 요청하세요.');
  }

  // 상대방이 이미 다른 파트너와 연결된 경우 차단
  if (targetData.householdId) {
    try {
      const targetHSnap = await getDoc(doc(db, 'households', targetData.householdId));
      if (targetHSnap.exists()) {
        const targetMembers: string[] = targetHSnap.data().memberIds ?? [];
        if (targetMembers.length >= 2 && !targetMembers.includes(userId)) {
          throw new Error('상대방이 이미 다른 파트너와 연결되어 있어요.');
        }
      }
    } catch (e: any) {
      if (e?.message?.includes('이미')) throw e;
    }
  }

  // 합류 전에 내 기존 household 정보 저장 (데이터 이전용)
  const myOldHouseholdId = mySnap?.exists() ? (mySnap.data() as FirestoreUser).householdId : null;

  let householdId = targetData.householdId;

  if (!householdId) {
    // 기존 household에서 가계명 가져오기 (커스텀 값 보존, 예산은 연결 시 초기화)
    let existingName = '우리 가계부';
    const oldIds = [myOldHouseholdId, targetData.householdId].filter(Boolean) as string[];
    for (const oldId of oldIds) {
      try {
        const oldSnap = await getDoc(doc(db, 'households', oldId));
        if (oldSnap.exists()) {
          const oldData = oldSnap.data();
          if (oldData.name && oldData.name !== '우리 가계부' && existingName === '우리 가계부') existingName = oldData.name;
        }
      } catch {}
    }

    // 상대방도 household 없으면 새로 생성해서 둘 다 배정
    const hRef = await addDoc(collection(db, 'households'), {
      name: existingName,
      memberIds: [targetDoc.id, userId],
      createdAt: serverTimestamp(),
    });
    householdId = hRef.id;
    await updateDoc(doc(db, 'users', targetDoc.id), { householdId });
    await updateDoc(doc(db, 'users', userId), { householdId });

    // 기존 household 데이터 이전
    if (myOldHouseholdId && myOldHouseholdId !== householdId) {
      try { await migrateHouseholdTransactions(myOldHouseholdId, householdId, userId); } catch {}
    }

    return householdId;
  }

  // 상대방 household에 합류
  const hRef = doc(db, 'households', householdId);
  const hSnap = await getDoc(hRef);
  if (!hSnap.exists()) return null;

  const memberIds: string[] = hSnap.data().memberIds ?? [];
  if (!memberIds.includes(userId)) {
    await updateDoc(hRef, { memberIds: [...memberIds, userId] });
  }
  await updateDoc(doc(db, 'users', userId), { householdId });

  // 기존 household 거래내역 이전 (예산은 연결 시 초기화)
  if (myOldHouseholdId && myOldHouseholdId !== householdId) {
    try { await migrateHouseholdTransactions(myOldHouseholdId, householdId, userId); } catch {}
  }

  return householdId;
};

/** 파트너 연결 끊기 — 현재 유저를 household에서 제거하고 양쪽 모두 householdId null로 */
export const disconnectPartner = async (
  userId: string,
  householdId: string,
): Promise<void> => {
  const hRef = doc(db, 'households', householdId);
  const hSnap = await getDoc(hRef);
  if (hSnap.exists()) {
    const memberIds: string[] = hSnap.data().memberIds ?? [];
    // 파트너의 householdId도 null로 업데이트 (파트너 앱이 꺼져있을 때도 반영)
    const partnerIds = memberIds.filter(id => id !== userId);
    await Promise.all([
      updateDoc(hRef, { memberIds: memberIds.filter(id => id !== userId) }),
      ...partnerIds.map(pid => updateDoc(doc(db, 'users', pid), { householdId: null })),
    ]);
  }
  await updateDoc(doc(db, 'users', userId), { householdId: null });
};

/** household 이름 업데이트 */
export const updateHouseholdName = async (
  householdId: string,
  name: string,
): Promise<void> => {
  await updateDoc(doc(db, 'households', householdId), { name });
};

/** household 예산 업데이트 */
export const updateHouseholdBudget = async (
  householdId: string,
  budget: number,
  setBy?: string,
): Promise<void> => {
  const update: Record<string, any> = { budget };
  if (setBy) update.lastBudgetSetBy = setBy;
  await updateDoc(doc(db, 'households', householdId), update);
};

/** household 카드 업데이트 (userId별로 저장) */
export const updateHouseholdCards = async (
  householdId: string,
  userId: string,
  cards: Array<{ id: string; alias: string; color: string; createdBy?: string }>,
): Promise<void> => {
  await updateDoc(doc(db, 'households', householdId), { [`cards.${userId}`]: cards });
};

// ─── Transactions ─────────────────────────────────────

export const addTransactionFS = async (
  householdId: string,
  tx: Transaction,
): Promise<void> => {
  // Firestore는 undefined 값을 허용하지 않으므로 제거 후 저장
  const data = JSON.parse(JSON.stringify(tx));
  await setDoc(doc(db, 'households', householdId, 'transactions', tx.id), data);
};

export const updateTransactionFS = async (
  householdId: string,
  txId: string,
  data: Partial<Transaction>,
): Promise<void> => {
  await updateDoc(doc(db, 'households', householdId, 'transactions', txId), data as any);
};

export const deleteTransactionFS = async (
  householdId: string,
  txId: string,
): Promise<void> => {
  await deleteDoc(doc(db, 'households', householdId, 'transactions', txId));
};

/** 실시간 구독. unsubscribe 함수 반환 */
export const subscribeTransactions = (
  householdId: string,
  callback: (txs: Transaction[]) => void,
): (() => void) => {
  const col = collection(db, 'households', householdId, 'transactions');
  return onSnapshot(col, (snap) => {
    const txs = snap.docs
      .map(d => d.data() as Transaction)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(txs);
  });
};

/** 파트너 연결 해제 시 상대방 거래내역 삭제 (소유권 기반 분리) */
export const removePartnerTransactions = async (
  householdId: string,
  myUserId: string,
): Promise<void> => {
  const col = collection(db, 'households', householdId, 'transactions');
  const snap = await getDocs(col);
  const deletions = snap.docs
    .filter(d => {
      const data = d.data();
      // createdBy가 있으면 소유권 기반, 없으면 유지 (기존 데이터 보호)
      return data.createdBy && data.createdBy !== myUserId;
    })
    .map(d => deleteDoc(d.ref));
  await Promise.all(deletions);
};

/** 로컬 데이터를 Firestore로 일괄 이전 (최초 1회) */
export const migrateLocalToFirestore = async (
  householdId: string,
  localTxs: Transaction[],
): Promise<void> => {
  await Promise.all(
    localTxs.map(tx =>
      setDoc(doc(db, 'households', householdId, 'transactions', tx.id), tx),
    ),
  );
};

/** 기존 household의 거래내역을 새 household로 이전 (파트너 합류 시) */
export const migrateHouseholdTransactions = async (
  fromHouseholdId: string,
  toHouseholdId: string,
  userId: string,
): Promise<number> => {
  const fromCol = collection(db, 'households', fromHouseholdId, 'transactions');
  const snap = await getDocs(fromCol);
  if (snap.empty) return 0;

  // 내가 만든 거래만 새 household로 복사
  const myTxDocs = snap.docs.filter(d => {
    const data = d.data();
    // createdBy가 있으면 소유권 기반, 없으면 기존 데이터로 간주하여 모두 이전
    return !data.createdBy || data.createdBy === userId;
  });

  await Promise.all(
    myTxDocs.map(d =>
      setDoc(doc(db, 'households', toHouseholdId, 'transactions', d.id), d.data()),
    ),
  );

  return myTxDocs.length;
};

// ─── Comments ─────────────────────────────────────────

export type TxComment = {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  likes: string[];
  createdAt: string;
  updatedAt?: string;
};

export const subscribeComments = (
  householdId: string,
  txId: string,
  callback: (comments: TxComment[]) => void,
): (() => void) => {
  const col = collection(db, 'households', householdId, 'transactions', txId, 'comments');
  return onSnapshot(col, snap => {
    const comments = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as TxComment))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    callback(comments);
  });
};

export const addCommentFS = async (
  householdId: string,
  txId: string,
  comment: Omit<TxComment, 'id'>,
): Promise<void> => {
  const ref = doc(collection(db, 'households', householdId, 'transactions', txId, 'comments'));
  await setDoc(ref, { ...comment, id: ref.id });
};

export const updateCommentFS = async (
  householdId: string,
  txId: string,
  commentId: string,
  text: string,
): Promise<void> => {
  await updateDoc(
    doc(db, 'households', householdId, 'transactions', txId, 'comments', commentId),
    { text, updatedAt: new Date().toISOString() },
  );
};

export const deleteCommentFS = async (
  householdId: string,
  txId: string,
  commentId: string,
): Promise<void> => {
  await deleteDoc(
    doc(db, 'households', householdId, 'transactions', txId, 'comments', commentId),
  );
};

export const toggleCommentLikeFS = async (
  householdId: string,
  txId: string,
  commentId: string,
  userId: string,
  isLiked: boolean,
): Promise<void> => {
  await updateDoc(
    doc(db, 'households', householdId, 'transactions', txId, 'comments', commentId),
    { likes: isLiked ? arrayRemove(userId) : arrayUnion(userId) },
  );
};

// ─── Notifications ────────────────────────────────────

export type AppNotification = {
  id: string;
  type: 'comment' | 'transaction';
  message: string;
  txId?: string;
  read: boolean;
  createdAt: string;
  fromName: string;
};

export const subscribeNotifications = (
  userId: string,
  callback: (notifications: AppNotification[]) => void,
): (() => void) => {
  const col = collection(db, 'users', userId, 'notifications');
  return onSnapshot(col, snap => {
    const notifs = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as AppNotification))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(notifs);
  });
};

export const addNotificationFS = async (
  targetUserId: string,
  notif: Omit<AppNotification, 'id'>,
): Promise<void> => {
  const ref = doc(collection(db, 'users', targetUserId, 'notifications'));
  await setDoc(ref, { ...notif, id: ref.id });
};

export const markNotificationReadFS = async (userId: string, notifId: string): Promise<void> => {
  await updateDoc(doc(db, 'users', userId, 'notifications', notifId), { read: true });
};

export const markAllNotificationsReadFS = async (userId: string): Promise<void> => {
  const snap = await getDocs(collection(db, 'users', userId, 'notifications'));
  await Promise.all(
    snap.docs.filter(d => !d.data().read).map(d => updateDoc(d.ref, { read: true })),
  );
};
