import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import {
  updateHouseholdBudget as updateHouseholdBudgetFS,
  updateHouseholdCards as updateHouseholdCardsFS,
} from '../services/firestoreService';

const STORAGE_BUDGET  = '@profile_budget';
const STORAGE_CARDS   = '@profile_cards';
const STORAGE_NAME    = '@profile_myname';
const STORAGE_GENDER  = '@profile_gender';
const STORAGE_PHOTO   = '@profile_photo_uri';

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
  profilePhotoUri: string | null;
  setProfilePhotoUri: (uri: string | null) => Promise<void>;
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
  profilePhotoUri: null,
  setProfilePhotoUri: async () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { householdId, user, triggerPartnerBudgetAlert } = useAuth();
  const [budget, setBudgetState] = useState(0);
  // myCards: 내가 등록한 카드 (AsyncStorage + Firestore cards.{userId} 에 저장)
  const [myCards, setMyCards] = useState<ProfileCard[]>([]);
  // partnerCards: 파트너가 등록한 카드 (Firestore 구독에서만 가져옴)
  const [partnerCards, setPartnerCards] = useState<ProfileCard[]>([]);
  const [myName, setMyNameState] = useState('');
  const [myGender, setMyGenderState] = useState<'male' | 'female'>('male');
  const [profilePhotoUri, setProfilePhotoUriState] = useState<string | null>(null);

  // myCards를 ref로도 관리 (클로저 stale 방지)
  const myCardsRef = useRef<ProfileCard[]>([]);
  const prevHouseholdIdRef = useRef<string | null>(null);

  // 최초 로드: 이름, 성별, 카드, 예산
  useEffect(() => {
    (async () => {
      try {
        const [b, c, n, g, p] = await Promise.all([
          AsyncStorage.getItem(STORAGE_BUDGET),
          AsyncStorage.getItem(STORAGE_CARDS),
          AsyncStorage.getItem(STORAGE_NAME),
          AsyncStorage.getItem(STORAGE_GENDER),
          AsyncStorage.getItem(STORAGE_PHOTO),
        ]);
        if (b !== null) setBudgetState(Number(b));
        if (c !== null) {
          const parsed: ProfileCard[] = JSON.parse(c);
          myCardsRef.current = parsed;
          setMyCards(parsed);
        }
        if (n !== null) setMyNameState(n);
        if (g === 'male' || g === 'female') setMyGenderState(g);
        if (p !== null) setProfilePhotoUriState(p);
      } catch {}
    })();
  }, []);

  // myCards state 변경 시 ref도 업데이트
  useEffect(() => {
    myCardsRef.current = myCards;
  }, [myCards]);

  // Firestore household 구독 — 예산 + 카드 실시간 동기화
  useEffect(() => {
    const prevHid = prevHouseholdIdRef.current;
    prevHouseholdIdRef.current = householdId;

    if (!householdId || !user) {
      setPartnerCards([]);
      // householdId 없어지면 파트너 카드만 제거 — 예산은 그대로 유지
      return;
    }

    // 내 카드를 Firestore에 업로드 (파트너에게 공유)
    // myCardsRef.current가 AsyncStorage 로드 전일 수 있으므로 직접 fallback 읽기
    const pushTimer = setTimeout(async () => {
      let cards = myCardsRef.current;
      if (cards.length === 0) {
        try {
          const stored = await AsyncStorage.getItem(STORAGE_CARDS);
          if (stored) {
            cards = JSON.parse(stored);
            myCardsRef.current = cards;
            setMyCards(cards);
          }
        } catch {}
      }
      updateHouseholdCardsFS(householdId, user.id, cards).catch(() => {});
    }, 400);

    const prevBudget = { value: null as number | null };

    const unsub = onSnapshot(doc(db, 'households', householdId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      // 파트너 카드 동기화 (내 cards 제외)
      const allCards: Record<string, any[]> = data.cards ?? {};
      const newPartnerCards: ProfileCard[] = Object.entries(allCards)
        .filter(([uid]) => uid !== user.id)
        .flatMap(([, cardList]) => cardList as ProfileCard[]);
      setPartnerCards(newPartnerCards);

      // 예산 동기화
      const fsBudget: number | undefined = data.budget;
      const lastSetBy: string | undefined = data.lastBudgetSetBy;
      if (fsBudget !== undefined) {
        // 이전 값과 다를 때만 처리 (최초 스냅샷 제외)
        if (prevBudget.value !== null && fsBudget !== prevBudget.value) {
          // 파트너가 설정한 경우에만 알림
          if (lastSetBy && lastSetBy !== user.id) {
            triggerPartnerBudgetAlert();
          }
          setBudgetState(fsBudget);
          AsyncStorage.setItem(STORAGE_BUDGET, String(fsBudget)).catch(() => {});
        } else if (prevBudget.value === null) {
          // 최초 스냅샷 — 조용히 로컬 반영
          setBudgetState(fsBudget);
          AsyncStorage.setItem(STORAGE_BUDGET, String(fsBudget)).catch(() => {});
        }
        prevBudget.value = fsBudget;
      }
    });

    return () => {
      clearTimeout(pushTimer);
      unsub();
    };
  }, [householdId, user?.id]);

  const setBudget = useCallback(async (v: number) => {
    setBudgetState(v);
    await AsyncStorage.setItem(STORAGE_BUDGET, String(v));
    if (householdId && user) {
      try { await updateHouseholdBudgetFS(householdId, v, user.id); } catch {}
    }
  }, [householdId, user?.id]);

  const addCard = useCallback(async (alias: string) => {
    const color = CARD_COLORS[myCardsRef.current.length % CARD_COLORS.length];
    const newCard: ProfileCard = { id: Date.now().toString(), alias, color };
    const newMyCards = [...myCardsRef.current, newCard];
    myCardsRef.current = newMyCards;
    setMyCards(newMyCards);
    await AsyncStorage.setItem(STORAGE_CARDS, JSON.stringify(newMyCards));
    if (householdId && user) {
      try { await updateHouseholdCardsFS(householdId, user.id, newMyCards); } catch {}
    }
  }, [householdId, user?.id]);

  const deleteCard = useCallback(async (id: string) => {
    const newMyCards = myCardsRef.current.filter(c => c.id !== id);
    myCardsRef.current = newMyCards;
    setMyCards(newMyCards);
    await AsyncStorage.setItem(STORAGE_CARDS, JSON.stringify(newMyCards));
    if (householdId && user) {
      try { await updateHouseholdCardsFS(householdId, user.id, newMyCards); } catch {}
    }
  }, [householdId, user?.id]);

  const setMyName = useCallback(async (name: string) => {
    setMyNameState(name);
    await AsyncStorage.setItem(STORAGE_NAME, name);
  }, []);

  const setMyGender = useCallback(async (gender: 'male' | 'female') => {
    setMyGenderState(gender);
    await AsyncStorage.setItem(STORAGE_GENDER, gender);
  }, []);

  const setProfilePhotoUri = useCallback(async (uri: string | null) => {
    setProfilePhotoUriState(uri);
    if (uri) {
      await AsyncStorage.setItem(STORAGE_PHOTO, uri);
    } else {
      await AsyncStorage.removeItem(STORAGE_PHOTO);
    }
  }, []);

  // 합쳐서 노출: 내 카드 + 파트너 카드
  const cards: ProfileCard[] = [...myCards, ...partnerCards];

  return (
    <ProfileContext.Provider value={{ budget, setBudget, cards, addCard, deleteCard, myName, myGender, setMyName, setMyGender, profilePhotoUri, setProfilePhotoUri }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
