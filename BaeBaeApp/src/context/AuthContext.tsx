import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut as firebaseSignOut, deleteUser, GoogleAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import * as SecureStore from 'expo-secure-store';
import { syncUser, disconnectPartner as disconnectPartnerFS, updateHouseholdName as updateHouseholdNameFS, removePartnerTransactions } from '../services/firestoreService';

export type GoogleUser = {
  id: string;
  name: string;
  email: string;
  picture: string;
};

type AuthContextType = {
  user: GoogleUser | null;
  isLoading: boolean;
  isOnboarded: boolean;
  householdName: string;
  householdId: string | null;
  partnerName: string | null;
  partnerGender: 'male' | 'female' | null;
  partnerConnectedAlert: boolean;
  clearPartnerAlert: () => void;
  partnerDisconnectedAlert: boolean;
  clearPartnerDisconnectedAlert: () => void;
  forcedLogoutAlert: boolean;
  clearForcedLogoutAlert: () => void;
  signIn: (user: GoogleUser) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  disconnectPartner: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setHouseholdName: (name: string) => Promise<void>;
  setHouseholdId: (id: string) => void;
  resetForFreshOnboarding: () => Promise<void>;
};

const DEFAULT_HOUSEHOLD = '우리 가계부';

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isOnboarded: false,
  householdName: DEFAULT_HOUSEHOLD,
  householdId: null,
  partnerName: null,
  partnerGender: null,
  partnerConnectedAlert: false,
  clearPartnerAlert: () => {},
  partnerDisconnectedAlert: false,
  clearPartnerDisconnectedAlert: () => {},
  forcedLogoutAlert: false,
  clearForcedLogoutAlert: () => {},
  signIn: async () => {},
  signOut: async () => {},
  deleteAccount: async () => {},
  disconnectPartner: async () => {},
  completeOnboarding: async () => {},
  setHouseholdName: async () => {},
  setHouseholdId: () => {},
  resetForFreshOnboarding: async () => {},
});

const STORAGE_KEY      = '@baebae_user';
const HOUSEHOLD_KEY    = '@baebae_household';
const ONBOARDED_KEY    = '@baebae_onboarded';
const HOUSEHOLD_ID_KEY = '@baebae_household_id';
const LAST_UID_KEY     = '@baebae_last_uid';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [householdName, setHouseholdNameState] = useState(DEFAULT_HOUSEHOLD);
  const [householdId, setHouseholdIdState] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerGender, setPartnerGender] = useState<'male' | 'female' | null>(null);
  const [partnerConnectedAlert, setPartnerConnectedAlert] = useState(false);
  const [partnerDisconnectedAlert, setPartnerDisconnectedAlert] = useState(false);
  const [forcedLogoutAlert, setForcedLogoutAlert] = useState(false);
  const sessionTokenRef = useRef<string | null>(null);
  const prevMemberCountRef = useRef<number>(0);
  // justJoinedRef: set true when setHouseholdId is called (Person B joins)
  // so the first onSnapshot fires the alert for Person B too
  const justJoinedRef = useRef(false);
  // Keep householdId in a ref for use in async callbacks (avoids stale closure)
  const householdIdRef = useRef<string | null>(null);

  useEffect(() => {
    householdIdRef.current = householdId;
  }, [householdId]);

  useEffect(() => {
    // Firebase Auth 세션 복원 (앱 재시작 시 자동 로그인)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const [houseVal, onboardedVal, hIdVal, lastUid] = await Promise.all([
        AsyncStorage.getItem(HOUSEHOLD_KEY),
        AsyncStorage.getItem(ONBOARDED_KEY),
        AsyncStorage.getItem(HOUSEHOLD_ID_KEY),
        AsyncStorage.getItem(LAST_UID_KEY),
      ]);

      if (firebaseUser) {
        // 세션 토큰 복원
        try {
          const localToken = await SecureStore.getItemAsync('baebae_session_token');
          if (localToken) sessionTokenRef.current = localToken;
        } catch {}

        // 다른 계정이 로그인한 경우 → 이전 프로필 데이터 초기화
        if (lastUid && lastUid !== firebaseUser.uid) {
          await AsyncStorage.multiRemove([
            ONBOARDED_KEY, HOUSEHOLD_ID_KEY, HOUSEHOLD_KEY,
            '@baebae_invite_code', '@baebae_welcome_shown',
            '@baebae_transactions', '@baebae_migrated',
            '@profile_budget', '@profile_cards', '@profile_myname', '@profile_gender',
          ]);
        } else {
          // 같은 계정: 로컬 데이터 복원. ONBOARDED_KEY 없으면 Firestore fallback
          if (houseVal) setHouseholdNameState(houseVal);
          if (hIdVal) setHouseholdIdState(hIdVal);
          if (onboardedVal === 'true') {
            setIsOnboarded(true);
          } else {
            // 이전 버전에서 로그아웃 시 ONBOARDED_KEY를 지운 경우 → Firestore에서 복원
            try {
              const { name: fsName, gender: fsGender, householdId: fsHId } = await syncUser(firebaseUser.uid, '');
              if (fsName) {
                const restoreItems: [string, string][] = [
                  [ONBOARDED_KEY, 'true'],
                  ['@profile_myname', fsName],
                  ['@profile_gender', fsGender],
                ];
                if (fsHId && !hIdVal) restoreItems.push([HOUSEHOLD_ID_KEY, fsHId]);
                await AsyncStorage.multiSet(restoreItems);
                setIsOnboarded(true);
                if (fsHId && !hIdVal) setHouseholdIdState(fsHId);
              }
            } catch {}
          }
        }
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName ?? '사용자',
          email: firebaseUser.email ?? '',
          picture: firebaseUser.photoURL ?? '',
        });
      } else {
        if (houseVal) setHouseholdNameState(houseVal);
        if (onboardedVal === 'true') setIsOnboarded(true);
        if (hIdVal) setHouseholdIdState(hIdVal);
        const userVal = await AsyncStorage.getItem(STORAGE_KEY);
        if (userVal) setUser(JSON.parse(userVal));
        else setUser(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // 내 Firestore users doc 실시간 구독 — 파트너가 내 코드를 입력했을 때 householdId 자동 감지
  useEffect(() => {
    if (!user) return;

    let isFirstUserSnap = true;

    const unsub = onSnapshot(doc(db, 'users', user.id), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const fsHouseholdId: string | null = data.householdId ?? null;

      // 다중 기기 로그인 감지: Firestore 토큰 ≠ 로컬 토큰 → 강제 로그아웃
      const fsSessionToken: string | undefined = data.sessionToken;
      if (fsSessionToken && sessionTokenRef.current && fsSessionToken !== sessionTokenRef.current) {
        setForcedLogoutAlert(true);
        sessionTokenRef.current = null;
        signOut();
        return;
      }

      if (isFirstUserSnap) {
        isFirstUserSnap = false;
        // 초기 로드: justJoined 없이 복원 (로그인 시 재연결 → 알림 없이 상태만 복원)
        if (fsHouseholdId && !householdIdRef.current) {
          setHouseholdIdState(fsHouseholdId);
          AsyncStorage.setItem(HOUSEHOLD_ID_KEY, fsHouseholdId).catch(() => {});
        }
        return;
      }

      // 이후 실시간 변경: 상대방이 내 코드를 입력해 연결한 것 → 알림 발생
      if (fsHouseholdId && !householdIdRef.current) {
        setHouseholdId(fsHouseholdId); // justJoinedRef = true → 알림 발생
      }
      // 상대방이 연결을 끊어서 내 householdId도 null로 바뀐 경우
      if (!fsHouseholdId && householdIdRef.current) {
        setHouseholdIdState(null);
        AsyncStorage.removeItem(HOUSEHOLD_ID_KEY).catch(() => {});
      }
    });

    return unsub;
  }, [user?.id]);

  // household 실시간 구독 — 파트너 연결 감지, 이름 동기화, 아이콘 동기화
  useEffect(() => {
    if (!householdId || !user) {
      setPartnerName(null);
      setPartnerGender(null);
      prevMemberCountRef.current = 0;
      return;
    }

    let isFirstSnapshot = true;

    const unsub = onSnapshot(doc(db, 'households', householdId), async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const memberIds: string[] = data.memberIds ?? [];
      const partnerIds = memberIds.filter(id => id !== user.id);

      // Firestore 가계명 → 로컬 동기화
      if (data.name && data.name !== householdName) {
        setHouseholdNameState(data.name);
        AsyncStorage.setItem(HOUSEHOLD_KEY, data.name);
      }

      if (partnerIds.length > 0) {
        // 파트너 이름 & 성별 로드
        try {
          const partnerDoc = await getDoc(doc(db, 'users', partnerIds[0]));
          if (partnerDoc.exists()) {
            const pd = partnerDoc.data();
            setPartnerName(pd.name || '파트너');
            setPartnerGender(pd.gender ?? null);
          }
        } catch {}

        // 알럿 조건:
        //   - 첫 스냅샷 + justJoined → Person B가 막 연결됨
        //   - 이후 스냅샷에서 멤버 수 증가 → Person A가 파트너 합류 감지
        const shouldAlert = isFirstSnapshot
          ? justJoinedRef.current
          : memberIds.length > prevMemberCountRef.current;

        if (shouldAlert) {
          setPartnerConnectedAlert(true);
          justJoinedRef.current = false;
        }
      } else {
        setPartnerName(null);
        setPartnerGender(null);
        // 첫 스냅샷이 아닌데 파트너가 없어진 경우 → 파트너가 나간 것
        if (!isFirstSnapshot && prevMemberCountRef.current > 1) {
          setPartnerDisconnectedAlert(true);
          // 내 householdId도 로컬/Firestore에서 초기화
          setHouseholdIdState(null);
          householdIdRef.current = null;
          AsyncStorage.removeItem(HOUSEHOLD_ID_KEY).catch(() => {});
          if (user) {
            updateDoc(doc(db, 'users', user.id), { householdId: null }).catch(() => {});
          }
        }
      }

      prevMemberCountRef.current = memberIds.length;
      isFirstSnapshot = false;
    });

    return unsub;
  }, [householdId, user?.id]);

  const signIn = async (googleUser: GoogleUser) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser));
    setUser(googleUser);

    // 세션 토큰 생성 및 저장 (다중 기기 로그인 감지용)
    const token = Date.now().toString(36) + Math.random().toString(36).substring(2);
    sessionTokenRef.current = token;
    try { await SecureStore.setItemAsync('baebae_session_token', token); } catch {}

    try {
      const localInviteCode = await AsyncStorage.getItem('@baebae_invite_code') ?? '';
      const { householdId: fsHouseholdId, inviteCode: fsInviteCode, name: fsName, gender: fsGender } = await syncUser(googleUser.id, localInviteCode, { sessionToken: token });
      if (fsHouseholdId && !householdIdRef.current) {
        setHouseholdIdState(fsHouseholdId);
        await AsyncStorage.setItem(HOUSEHOLD_ID_KEY, fsHouseholdId);
      }
      if (fsInviteCode && !localInviteCode) {
        await AsyncStorage.setItem('@baebae_invite_code', fsInviteCode);
      }
      // Firestore에 프로필이 있는데 로컬 onboarded 상태가 없는 경우 복원
      // (이전 버전에서 로그아웃 시 ONBOARDED_KEY를 지운 경우 대응)
      const localOnboarded = await AsyncStorage.getItem(ONBOARDED_KEY);
      if (!localOnboarded && fsName) {
        await AsyncStorage.multiSet([
          [ONBOARDED_KEY, 'true'],
          ['@profile_myname', fsName],
          ['@profile_gender', fsGender],
        ]);
        setIsOnboarded(true);
      }
    } catch (e) {
      console.warn('[Auth] Firestore sync failed, continuing offline:', e);
    }
  };

  const deleteAccount = async () => {
    // 1) Firestore 정리 먼저 (user/householdId 참조 필요)
    const uid = user?.id;
    const hId = householdId;
    if (uid && hId) {
      try { await disconnectPartnerFS(uid, hId); } catch {}
    }
    // Firestore users doc 삭제
    if (uid) {
      try {
        const { deleteDoc } = require('firebase/firestore');
        await deleteDoc(doc(db, 'users', uid));
      } catch {}
    }

    // 2) Firebase Auth 계정 삭제
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      try {
        await deleteUser(firebaseUser);
      } catch (err: any) {
        if (err?.code === 'auth/requires-recent-login') {
          const { GoogleSignin } = require('@react-native-google-signin/google-signin');
          await GoogleSignin.hasPlayServices();
          try { await GoogleSignin.signOut(); } catch {}
          const userInfo = await GoogleSignin.signIn();
          const idToken = userInfo.data?.idToken ?? userInfo.idToken;
          const credential = GoogleAuthProvider.credential(idToken);
          await reauthenticateWithCredential(firebaseUser, credential);
          await deleteUser(firebaseUser);
        } else {
          throw err;
        }
      }
    }

    // 3) 로컬 상태 마지막에 정리 (Firestore 작업 완료 후)
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEY, ONBOARDED_KEY, HOUSEHOLD_ID_KEY, HOUSEHOLD_KEY, LAST_UID_KEY,
        '@baebae_invite_code', '@baebae_welcome_shown',
        '@baebae_transactions', '@baebae_migrated',
        '@profile_budget', '@profile_cards', '@profile_myname', '@profile_gender',
      ]);
    } catch {}
    setUser(null);
    setIsOnboarded(false);
    setHouseholdIdState(null);
    householdIdRef.current = null;
    setHouseholdNameState(DEFAULT_HOUSEHOLD);
    setPartnerName(null);
    setPartnerGender(null);
  };

  const signOut = async () => {
    // 프로필/온보딩 데이터는 유지 (같은 계정 재로그인 시 복원용)
    // last_uid를 저장해 다른 계정이 로그인하면 초기화할 수 있도록
    try {
      if (user) await AsyncStorage.setItem(LAST_UID_KEY, user.id);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
    setUser(null);
    setIsOnboarded(false);
    householdIdRef.current = null;
    setHouseholdIdState(null);
    setHouseholdNameState(DEFAULT_HOUSEHOLD);
    setPartnerName(null);
    setPartnerGender(null);
    try { await firebaseSignOut(auth); } catch {}
  };

  const disconnectPartner = async () => {
    if (!user || !householdId) return;
    // 파트너 거래내역 삭제 (소유권 기반 분리 — TC 5-2)
    try { await removePartnerTransactions(householdId, user.id); } catch {}
    await disconnectPartnerFS(user.id, householdId);
    householdIdRef.current = null;
    setHouseholdIdState(null);
    setPartnerName(null);
    setPartnerGender(null);
    await AsyncStorage.removeItem(HOUSEHOLD_ID_KEY);
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    setIsOnboarded(true);
  };

  const setHouseholdName = async (name: string) => {
    const value = name.trim() || DEFAULT_HOUSEHOLD;
    await AsyncStorage.setItem(HOUSEHOLD_KEY, value);
    setHouseholdNameState(value);
    // Firestore 동기화 (householdId가 있을 때)
    const hId = householdIdRef.current;
    if (hId) {
      try { await updateHouseholdNameFS(hId, value); } catch {}
    }
  };

  const setHouseholdId = (id: string) => {
    justJoinedRef.current = true; // 새로 연결된 경우 → 첫 스냅샷에서 알럿 발생
    householdIdRef.current = id;  // 즉시 동기적으로 ref 업데이트 (레이스 컨디션 방지)
    setHouseholdIdState(id);
    AsyncStorage.setItem(HOUSEHOLD_ID_KEY, id);
  };

  const clearPartnerAlert = () => setPartnerConnectedAlert(false);
  const clearPartnerDisconnectedAlert = () => setPartnerDisconnectedAlert(false);
  const clearForcedLogoutAlert = () => setForcedLogoutAlert(false);

  /** 온보딩 재진행 시 로컬 연동 상태 초기화 (Firestore는 initProfile에서 처리) */
  const resetForFreshOnboarding = async () => {
    setHouseholdIdState(null);
    setPartnerName(null);
    setPartnerGender(null);
    householdIdRef.current = null;
    setIsOnboarded(false);
    await AsyncStorage.multiRemove([
      HOUSEHOLD_ID_KEY, HOUSEHOLD_KEY, '@baebae_invite_code',
      '@baebae_welcome_shown', ONBOARDED_KEY,
    ]);
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading, isOnboarded, householdName, householdId,
      partnerName, partnerGender, partnerConnectedAlert, clearPartnerAlert,
      signIn, signOut, deleteAccount, disconnectPartner, completeOnboarding,
      setHouseholdName, setHouseholdId, resetForFreshOnboarding,
      partnerDisconnectedAlert, clearPartnerDisconnectedAlert,
      forcedLogoutAlert, clearForcedLogoutAlert,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
