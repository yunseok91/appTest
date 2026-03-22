import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import {
  addTransactionFS,
  updateTransactionFS,
  deleteTransactionFS,
  subscribeTransactions,
  migrateLocalToFirestore,
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

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const { householdId, user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isFirestoreMode = !!householdId;

  // ── 로컬 모드: AsyncStorage 로드 ──
  useEffect(() => {
    if (householdId) return; // Firestore 모드면 스킵
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

    // 로컬 데이터 마이그레이션 (최초 1회)
    (async () => {
      const migrated = await AsyncStorage.getItem(MIGRATED_KEY);
      if (!migrated) {
        const localVal = await AsyncStorage.getItem(LOCAL_KEY);
        if (localVal) {
          const localTxs: Transaction[] = JSON.parse(localVal);
          if (localTxs.length > 0) {
            await migrateLocalToFirestore(householdId, localTxs);
          }
        }
        await AsyncStorage.setItem(MIGRATED_KEY, 'true');
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
        // onSnapshot이 자동으로 state 업데이트
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
