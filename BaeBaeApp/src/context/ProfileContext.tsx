import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_BUDGET = '@profile_budget';
const STORAGE_CARDS  = '@profile_cards';

const CARD_COLORS = ['#0046B0', '#FFB300', '#3A1D96', '#00897B', '#E53935', '#6D4C41'];

export type ProfileCard = { id: string; alias: string; color: string };

type ProfileContextType = {
  budget: number;
  setBudget: (v: number) => Promise<void>;
  cards: ProfileCard[];
  addCard: (alias: string) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType>({
  budget: 3_000_000,
  setBudget: async () => {},
  cards: [],
  addCard: async () => {},
  deleteCard: async () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [budget, setBudgetState] = useState(3_000_000);
  const [cards, setCards] = useState<ProfileCard[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [b, c] = await Promise.all([
          AsyncStorage.getItem(STORAGE_BUDGET),
          AsyncStorage.getItem(STORAGE_CARDS),
        ]);
        if (b !== null) setBudgetState(Number(b));
        if (c !== null) setCards(JSON.parse(c));
      } catch {}
    })();
  }, []);

  const setBudget = useCallback(async (v: number) => {
    setBudgetState(v);
    await AsyncStorage.setItem(STORAGE_BUDGET, String(v));
  }, []);

  const addCard = useCallback(async (alias: string) => {
    setCards(prev => {
      const color = CARD_COLORS[prev.length % CARD_COLORS.length];
      const next = [...prev, { id: Date.now().toString(), alias, color }];
      AsyncStorage.setItem(STORAGE_CARDS, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    setCards(prev => {
      const next = prev.filter(c => c.id !== id);
      AsyncStorage.setItem(STORAGE_CARDS, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <ProfileContext.Provider value={{ budget, setBudget, cards, addCard, deleteCard }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
