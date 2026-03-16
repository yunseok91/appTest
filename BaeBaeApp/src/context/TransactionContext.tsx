import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TimeSlot = '아침' | '점심' | '저녁';

export type Transaction = {
  id: string;
  type: 'expense' | 'income';
  category: string;        // 카테고리 label (예: '식비')
  categoryKey: string;     // 카테고리 key  (예: 'food')
  categoryIcon: string;    // Ionicons 이름
  categoryIconColor: string;
  categoryBgColor: string;
  amount: number;          // 항상 양수
  memo: string;
  date: string;            // 'YYYY-MM-DD'
  time: TimeSlot;
  person: string;          // 사용자 id
  payMethod: 'cash' | 'card';
  cardName?: string;
  photoUri?: string;
  createdAt: string;       // ISO timestamp
};

type TransactionContextType = {
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
};

const TransactionContext = createContext<TransactionContextType>({
  transactions: [],
  addTransaction: async () => {},
  updateTransaction: async () => {},
  deleteTransaction: async () => {},
});

const STORAGE_KEY = '@baebae_transactions';

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) setTransactions(JSON.parse(val));
    });
  }, []);

  const save = async (list: Transaction[]) => {
    setTransactions(list);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...tx,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    await save([newTx, ...transactions]);
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    await save(transactions.map((tx) => tx.id === id ? { ...tx, ...updates } : tx));
  };

  const deleteTransaction = async (id: string) => {
    await save(transactions.filter((tx) => tx.id !== id));
  };

  return (
    <TransactionContext.Provider value={{ transactions, addTransaction, updateTransaction, deleteTransaction }}>
      {children}
    </TransactionContext.Provider>
  );
}

export const useTransactions = () => useContext(TransactionContext);
