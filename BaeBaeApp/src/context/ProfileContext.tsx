import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_BUDGET  = '@profile_budget';
const STORAGE_CARDS   = '@profile_cards';
const STORAGE_NAME    = '@profile_myname';
const STORAGE_GENDER  = '@profile_gender';

const CARD_COLORS = ['#0046B0', '#FFB300', '#3A1D96', '#00897B', '#E53935', '#6D4C41'];

export type ProfileCard = { id: string; alias: string; color: string };

type ProfileContextType = {
  budget: number;
  setBudget: (v: number) => Promise<void>;
  cards: ProfileCard[];
  addCard: (alias: string) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  myName: string;
  myGender: 'male' | 'female';
  setMyName: (name: string) => Promise<void>;
  setMyGender: (gender: 'male' | 'female') => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType>({
  budget: 0,
  setBudget: async () => {},
  cards: [],
  addCard: async () => {},
  deleteCard: async () => {},
  myName: '',
  myGender: 'male',
  setMyName: async () => {},
  setMyGender: async () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [budget, setBudgetState] = useState(0);
  const [cards, setCards] = useState<ProfileCard[]>([]);
  const [myName, setMyNameState] = useState('');
  const [myGender, setMyGenderState] = useState<'male' | 'female'>('male');

  useEffect(() => {
    (async () => {
      try {
        const [b, c, n, g] = await Promise.all([
          AsyncStorage.getItem(STORAGE_BUDGET),
          AsyncStorage.getItem(STORAGE_CARDS),
          AsyncStorage.getItem(STORAGE_NAME),
          AsyncStorage.getItem(STORAGE_GENDER),
        ]);
        if (b !== null) setBudgetState(Number(b));
        if (c !== null) setCards(JSON.parse(c));
        if (n !== null) setMyNameState(n);
        if (g === 'male' || g === 'female') setMyGenderState(g);
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

  const setMyName = useCallback(async (name: string) => {
    setMyNameState(name);
    await AsyncStorage.setItem(STORAGE_NAME, name);
  }, []);

  const setMyGender = useCallback(async (gender: 'male' | 'female') => {
    setMyGenderState(gender);
    await AsyncStorage.setItem(STORAGE_GENDER, gender);
  }, []);

  return (
    <ProfileContext.Provider value={{ budget, setBudget, cards, addCard, deleteCard, myName, myGender, setMyName, setMyGender }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
