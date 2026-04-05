import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import {
  addTransactionFS,
  updateTransactionFS,
  deleteTransactionFS,
  subscribeTransactions,
  migrateLocalToFirestore,
  addNotificationFS,
} from '../services/firestoreService';

export type TimeSlot = '아침' | '점심' | '저녁';

export type Transaction = {
  id: string;
  type: 'expense' | 'income';
  category: string;
  categoryKey: string;
  categoryIcon: string;
  categoryIconColor: string;
  categoryBgColor: string;
  amount: number;
  memo: string;
  date: string;        // 'YYYY-MM-DD'
  time: TimeSlot;
  person: string;
  payMethod: 'cash' | 'card';
  cardName?: string;
  photoUri?: string;
  createdBy?: string;  // userId — 소유권 분리용
  createdAt: string;   // ISO timestamp
};

type TransactionContextType = {
  transactions: Transaction[];
  isFirestoreMode: boolean;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
};

const TransactionContext = createContext<TransactionContextType>({
  transactions: [],
  isFirestoreMode: false,
  addTransaction: async () => {},
  updateTransaction: async () => {},
  deleteTransaction: async () => {},
});

const LOCAL_KEY = '@baebae_transactions';
const MIGRATED_KEY = '@baebae_migrated';
const MIGRATED_HID_KEY = '@baebae_migrated_hid'; // 마이그레이션된 householdId 추적

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const { householdId, user, partnerId } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isFirestoreMode = !!householdId;
  const prevHouseholdIdRef = useRef<string | null>(null);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // ── 로컬 모드: AsyncStorage 로드 ──
  useEffect(() => {
    const wasFirestoreMode = !!prevHouseholdIdRef.current;
    prevHouseholdIdRef.current = householdId ?? null;

    if (householdId) return; // Firestore 모드면 스킵

    if (wasFirestoreMode) {
      // Firestore → 로컬 전환 (파트너 연결 해제)
      // 현재 in-memory transactions에서 내 것만 걸러서 AsyncStorage에 저장 후 유지
      setTransactions(prev => {
        const mine = prev.filter(tx => !tx.createdBy || tx.createdBy === userRef.current?.id);
        AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(mine)).catch(() => {});
        return mine;
      });
      return;
    }

    // 앱 최초 실행 (Firestore 연결 없음): AsyncStorage에서 로드
    AsyncStorage.getItem(LOCAL_KEY).then((val) => {
      if (val) setTransactions(JSON.parse(val));
    });
  }, [householdId]);

  // ── Firestore 모드: 실시간 구독 ──
  useEffect(() => {
    if (!householdId) {
      // householdId가 없어지면 기존 구독 해제
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      return;
    }

    // 로컬 데이터 마이그레이션 (householdId가 바뀌면 재실행)
    (async () => {
      const [migrated, migratedHid] = await Promise.all([
        AsyncStorage.getItem(MIGRATED_KEY),
        AsyncStorage.getItem(MIGRATED_HID_KEY),
      ]);
      // householdId가 달라졌으면 새 household에 대해 재마이그레이션 필요
      const needsMigration = !migrated || (migratedHid && migratedHid !== householdId);
      if (needsMigration) {
        const localVal = await AsyncStorage.getItem(LOCAL_KEY);
        if (localVal) {
          const localTxs: Transaction[] = JSON.parse(localVal);
          if (localTxs.length > 0) {
            await migrateLocalToFirestore(householdId, localTxs);
          }
        }
        await AsyncStorage.multiSet([
          [MIGRATED_KEY, 'true'],
          [MIGRATED_HID_KEY, householdId],
        ]);
      }
    })();

    // 실시간 구독 시작
    unsubscribeRef.current?.();
    unsubscribeRef.current = subscribeTransactions(householdId, (txs) => {
      setTransactions(txs);
    });

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [householdId]);

  // ── 로컬 저장 헬퍼 ──
  const saveLocal = async (list: Transaction[]) => {
    setTransactions(list);
    await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  };

  // ── CRUD ──
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...tx,
      id: Date.now().toString(),
      createdBy: user?.id ?? undefined,
      createdAt: new Date().toISOString(),
    };
    if (householdId) {
      try {
        await addTransactionFS(householdId, newTx);
        // 파트너에게 알림 전송
        if (partnerId) {
          const sign = newTx.type === 'expense' ? '-' : '+';
          addNotificationFS(partnerId, {
            type: 'transaction',
            message: `${newTx.person}님이 새 내역을 추가했어요 · ${newTx.category} ${sign}₩${newTx.amount.toLocaleString()}`,
            txId: newTx.id,
            read: false,
            createdAt: new Date().toISOString(),
            fromName: newTx.person,
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('[Transaction] Firestore 저장 실패, 로컬 fallback:', e);
        await saveLocal([newTx, ...transactions]);
        throw e; // 호출부에서 에러 감지할 수 있도록 re-throw
      }
    } else {
      await saveLocal([newTx, ...transactions]);
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (householdId) {
      try {
        await updateTransactionFS(householdId, id, updates);
      } catch (e) {
        console.warn('[Transaction] Firestore 수정 실패, 로컬 fallback:', e);
        await saveLocal(transactions.map(tx => tx.id === id ? { ...tx, ...updates } : tx));
      }
    } else {
      await saveLocal(transactions.map(tx => tx.id === id ? { ...tx, ...updates } : tx));
    }
  };

  const deleteTransaction = async (id: string) => {
    if (householdId) {
      try {
        await deleteTransactionFS(householdId, id);
      } catch (e) {
        console.warn('[Transaction] Firestore 삭제 실패, 로컬 fallback:', e);
        await saveLocal(transactions.filter(tx => tx.id !== id));
      }
    } else {
      await saveLocal(transactions.filter(tx => tx.id !== id));
    }
  };

  return (
    <TransactionContext.Provider value={{
      transactions, isFirestoreMode,
      addTransaction, updateTransaction, deleteTransaction,
    }}>
      {children}
    </TransactionContext.Provider>
  );
}

export const useTransactions = () => useContext(TransactionContext);
