import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut as firebaseSignOut, deleteUser, signInWithCredential } from 'firebase/auth';
import type { AuthCredential } from 'firebase/auth';
import { onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import * as SecureStore from 'expo-secure-store';
import { syncUser, disconnectPartner as disconnectPartnerFS, updateHouseholdName as updateHouseholdNameFS, updateHouseholdBudget as updateHouseholdBudgetFS, removePartnerTransactions } from '../services/firestoreService';

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
  partnerId: string | null;
  partnerConnectedAlert: boolean;
  clearPartnerAlert: () => void;
  partnerDisconnectedAlert: boolean;
  clearPartnerDisconnectedAlert: () => void;
  partnerSince: string | null;
  partnerBudgetAlert: boolean;
  clearPartnerBudgetAlert: () => void;
  triggerPartnerBudgetAlert: () => void;
  forcedLogoutAlert: boolean;
  clearForcedLogoutAlert: () => void;
  signIn: (credential: AuthCredential) => Promise<void>;
  devSignIn: () => Promise<void>;
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
  partnerId: null,
  partnerSince: null,
  partnerConnectedAlert: false,
  clearPartnerAlert: () => {},
  partnerDisconnectedAlert: false,
  clearPartnerDisconnectedAlert: () => {},
  partnerBudgetAlert: false,
  clearPartnerBudgetAlert: () => {},
  triggerPartnerBudgetAlert: () => {},
  forcedLogoutAlert: false,
  clearForcedLogoutAlert: () => {},
  signIn: async (_credential: AuthCredential) => {},
  devSignIn: async () => {},
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
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerConnectedAlert, setPartnerConnectedAlert] = useState(false);
  const [partnerDisconnectedAlert, setPartnerDisconnectedAlert] = useState(false);
  const [partnerBudgetAlert, setPartnerBudgetAlert] = useState(false);
  const [partnerSince, setPartnerSince] = useState<string | null>(null);
  const [forcedLogoutAlert, setForcedLogoutAlert] = useState(false);
  const sessionTokenRef = useRef<string | null>(null);
  const prevMemberCountRef = useRef<number>(0);
  // justJoinedRef: set true when setHouseholdId is called (Person B joins)
  // so the first onSnapshot fires the alert for Person B too
  const justJoinedRef = useRef(false);
  // Keep householdId in a ref for use in async callbacks (avoids stale closure)
  const householdIdRef = useRef<string | null>(null);
  // signIn 진행 중 플래그 — onAuthStateChanged/onSnapshot 간섭 방지
  const signingInRef = useRef(false);

  useEffect(() => {
    householdIdRef.current = householdId;
  }, [householdId]);

  // 앱 시작 시 GoogleSignin 미리 configure (deleteAccount 재인증 대비)
  useEffect(() => {
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({
        webClientId: '476537137658-v8a134ljp7fkkgivbpg1vk2bg58vltb0.apps.googleusercontent.com',
        iosClientId: '476537137658-iko16ukbpt14to4ot4enkeotbrlrjbtn.apps.googleusercontent.com',
      });
    } catch {}
  }, []);

  useEffect(() => {
    // Firebase Auth 세션 복원 (앱 재시작 시 자동 로그인)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // signIn()이 진행 중이면 → signIn이 모든 상태를 직접 관리하므로 여기서는 스킵
      // (signInWithCredential이 onAuthStateChanged를 트리거하지만, signIn이 이미 처리함)
      if (signingInRef.current) {
        return;
      }

      const [houseVal, onboardedVal, hIdVal, lastUid, partnerSinceVal] = await Promise.all([
        AsyncStorage.getItem(HOUSEHOLD_KEY),
        AsyncStorage.getItem(ONBOARDED_KEY),
        AsyncStorage.getItem(HOUSEHOLD_ID_KEY),
        AsyncStorage.getItem(LAST_UID_KEY),
        AsyncStorage.getItem('@baebae_partner_since'),
      ]);
      if (partnerSinceVal) setPartnerSince(partnerSinceVal);

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
          setIsOnboarded(false);
          setHouseholdIdState(null);
          householdIdRef.current = null;
        } else {
          // 같은 계정: 로컬 데이터 복원. ONBOARDED_KEY 없으면 Firestore fallback
          if (houseVal) setHouseholdNameState(houseVal);
          if (hIdVal) {
            setHouseholdIdState(hIdVal);
            householdIdRef.current = hIdVal;
          }
          if (onboardedVal === 'true') {
            setIsOnboarded(true);
          } else {
            // Firestore에서 복원
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
                if (fsHId && !hIdVal) {
                  setHouseholdIdState(fsHId);
                  householdIdRef.current = fsHId;
                }
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
        // Firebase 세션 없음 (signOut 후 또는 앱 최초 실행)
        const userVal = await AsyncStorage.getItem(STORAGE_KEY);
        if (userVal) {
          // 로컬에 유저 데이터가 있으면 복원 (앱 재시작)
          if (houseVal) setHouseholdNameState(houseVal);
          if (onboardedVal === 'true') setIsOnboarded(true);
          if (hIdVal) setHouseholdIdState(hIdVal);
          setUser(JSON.parse(userVal));
        } else {
          setUser(null);
        }
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
      // signIn 진행 중에는 토큰이 업데이트되는 과정이므로 체크 스킵
      const fsSessionToken: string | undefined = data.sessionToken;
      if (!signingInRef.current && fsSessionToken && sessionTokenRef.current && fsSessionToken !== sessionTokenRef.current) {
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

      // 가계명 양방향 동기화
      if (data.name && data.name !== householdName) {
        if (isFirstSnapshot && data.name === DEFAULT_HOUSEHOLD && householdName !== DEFAULT_HOUSEHOLD) {
          // 첫 스냅샷: Firestore가 기본명이고 로컬이 커스텀명 → 로컬 이름을 Firestore에 푸시
          updateDoc(snap.ref, { name: householdName }).catch(() => {});
        } else {
          // 그 외: Firestore → 로컬 동기화
          setHouseholdNameState(data.name);
          AsyncStorage.setItem(HOUSEHOLD_KEY, data.name);
        }
      }

      // 진짜 신규 연결 여부:
      //   - 첫 스냅샷: justJoinedRef가 true일 때만 (앱 재시작 시 prevMemberCount=0이어도 false)
      //   - 이후 스냅샷: 멤버 수가 늘어난 경우
      const isNewConnection = isFirstSnapshot
        ? justJoinedRef.current
        : memberIds.length > prevMemberCountRef.current;

      // 파트너 연결 시 예산 초기화 (A·B 양쪽 모두) — 실제 신규 연결 시에만
      if (isNewConnection && memberIds.length > 1) {
        AsyncStorage.setItem('@profile_budget', '0');
        updateHouseholdBudgetFS(householdId, 0).catch(() => {});
      }

      if (partnerIds.length > 0) {
        setPartnerId(partnerIds[0]);
        // 파트너 이름 & 성별 로드
        try {
          const partnerDoc = await getDoc(doc(db, 'users', partnerIds[0]));
          if (partnerDoc.exists()) {
            const pd = partnerDoc.data();
            setPartnerName(pd.name || '파트너');
            setPartnerGender(pd.gender ?? null);
          }
        } catch {}

        // 알럿 조건: 실제 신규 연결 시에만 (앱 재시작 시 중복 팝업 방지)
        const shouldAlert = isNewConnection;

        if (shouldAlert) {
          setPartnerConnectedAlert(true);
          justJoinedRef.current = false;
          // 연결 날짜 저장 (아직 없을 때만 — 재연결 시 덮어쓰기)
          AsyncStorage.getItem('@baebae_partner_since').then(existing => {
            if (!existing) {
              const now = new Date().toISOString();
              AsyncStorage.setItem('@baebae_partner_since', now).catch(() => {});
              setPartnerSince(now);
            }
          });
        }
      } else {
        setPartnerName(null);
        setPartnerGender(null);
        setPartnerId(null);
        // 첫 스냅샷이 아닌데 파트너가 없어진 경우 → 파트너가 나간 것
        if (!isFirstSnapshot && prevMemberCountRef.current > 1) {
          setPartnerDisconnectedAlert(true);
          // 내 householdId·가계명 로컬/Firestore에서 초기화
          setHouseholdIdState(null);
          setHouseholdNameState(DEFAULT_HOUSEHOLD);
          setPartnerSince(null);
          householdIdRef.current = null;
          AsyncStorage.multiRemove([HOUSEHOLD_ID_KEY, HOUSEHOLD_KEY, '@baebae_partner_since']).catch(() => {});
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

  const signIn = async (credential: AuthCredential) => {
    // ★ signInWithCredential보다 먼저 플래그 설정 → onAuthStateChanged 간섭 완전 차단
    signingInRef.current = true;

    try {
      // 1) Firebase 인증
      const userCredential = await signInWithCredential(auth, credential);
      const fbUser = userCredential.user;
      const googleUser: GoogleUser = {
        id: fbUser.uid,
        name: fbUser.displayName ?? '사용자',
        email: fbUser.email ?? '',
        picture: fbUser.photoURL ?? '',
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser));

      // 2) 다른 계정 체크
      const lastUid = await AsyncStorage.getItem(LAST_UID_KEY);
      if (lastUid && lastUid !== fbUser.uid) {
        await AsyncStorage.multiRemove([
          ONBOARDED_KEY, HOUSEHOLD_ID_KEY, HOUSEHOLD_KEY,
          '@baebae_invite_code', '@baebae_welcome_shown',
          '@baebae_transactions', '@baebae_migrated',
          '@profile_budget', '@profile_cards', '@profile_myname', '@profile_gender',
        ]);
      }
      // 항상 LAST_UID 갱신 (signOut 실패 시에도 안전)
      await AsyncStorage.setItem(LAST_UID_KEY, fbUser.uid);

      // 3) 세션 토큰
      const token = Date.now().toString(36) + Math.random().toString(36).substring(2);
      sessionTokenRef.current = token;
      try { await SecureStore.setItemAsync('baebae_session_token', token); } catch {}

      // 4) 로컬 데이터 복원
      const [localOnboarded, localHId, localInviteCode, localHouseName] = await Promise.all([
        AsyncStorage.getItem(ONBOARDED_KEY),
        AsyncStorage.getItem(HOUSEHOLD_ID_KEY),
        AsyncStorage.getItem('@baebae_invite_code'),
        AsyncStorage.getItem(HOUSEHOLD_KEY),
      ]);

      // 중간 state 업데이트 없이 변수에 수집 → 마지막에 한번에 setState
      let finalOnboarded = localOnboarded === 'true';
      let finalHouseholdId = localHId;
      let finalHouseName = localHouseName;

      // 5) Firestore 동기화
      try {
        const { householdId: fsHouseholdId, inviteCode: fsInviteCode, name: fsName, gender: fsGender } = await syncUser(fbUser.uid, localInviteCode ?? '', { sessionToken: token });

        if (fsHouseholdId && !finalHouseholdId) {
          finalHouseholdId = fsHouseholdId;
          await AsyncStorage.setItem(HOUSEHOLD_ID_KEY, fsHouseholdId);
        }
        if (fsInviteCode && !localInviteCode) {
          await AsyncStorage.setItem('@baebae_invite_code', fsInviteCode);
        }
        if (fsName) {
          finalOnboarded = true;
          if (localOnboarded !== 'true') {
            await AsyncStorage.multiSet([
              [ONBOARDED_KEY, 'true'],
              ['@profile_myname', fsName],
              ['@profile_gender', fsGender],
            ]);
          }
        }
      } catch (e) {
        console.warn('[signIn] Firestore sync 실패:', e);
      }

      // ★ 모든 state를 동일 동기 블록에서 한번에 설정 → React 배치 렌더 보장
      // (isOnboarded와 user가 서로 다른 렌더 사이클에 설정되는 레이스 컨디션 방지)
      if (finalOnboarded) setIsOnboarded(true);
      if (finalHouseholdId) {
        householdIdRef.current = finalHouseholdId;
        setHouseholdIdState(finalHouseholdId);
      }
      if (finalHouseName) setHouseholdNameState(finalHouseName);
      setUser(googleUser);
      setIsLoading(false);
    } catch (e) {
      throw e;
    } finally {
      signingInRef.current = false;
    }
  };

  /** 개발 모드 전용 — Firebase 인증 없이 더미 유저로 진입 (Expo Go용) */
  const devSignIn = async () => {
    const [onboardedVal, existingUser, hIdVal, houseVal] = await Promise.all([
      AsyncStorage.getItem(ONBOARDED_KEY),
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(HOUSEHOLD_ID_KEY),
      AsyncStorage.getItem(HOUSEHOLD_KEY),
    ]);

    const isOnboardedAlready = onboardedVal === 'true';

    if (isOnboardedAlready && existingUser) {
      // 기존 세션 유지 (로그아웃 후 재진입)
      const parsed: GoogleUser = JSON.parse(existingUser);
      if (houseVal) setHouseholdNameState(houseVal);
      if (hIdVal) { setHouseholdIdState(hIdVal); householdIdRef.current = hIdVal; }
      setIsOnboarded(true);
      setUser(parsed);
    } else {
      // 탈퇴 후 재진입 → 완전 초기화 + 신규가입 절차
      const devId = 'dev_' + Date.now().toString(36);
      const devUser: GoogleUser = { id: devId, name: '테스트유저', email: 'dev@test.com', picture: '' };
      await AsyncStorage.multiRemove([
        STORAGE_KEY, ONBOARDED_KEY, HOUSEHOLD_ID_KEY, HOUSEHOLD_KEY,
        '@baebae_invite_code', '@baebae_welcome_shown',
        '@baebae_transactions', '@baebae_migrated', '@baebae_migrated_hid',
        '@profile_budget', '@profile_cards', '@profile_myname', '@profile_gender',
      ]);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(devUser));
      await AsyncStorage.setItem(LAST_UID_KEY, devId);
      setIsOnboarded(false);
      setHouseholdIdState(null);
      householdIdRef.current = null;
      setHouseholdNameState(DEFAULT_HOUSEHOLD);
      setPartnerName(null);
      setPartnerGender(null);
      setUser(devUser);
    }
    setIsLoading(false);
  };

  const deleteAccount = async () => {
    const firebaseUser = auth.currentUser;
    const uid = user?.id;
    const hId = householdId;

    // 1) Firestore 데이터 정리
    if (uid && hId) {
      try { await disconnectPartnerFS(uid, hId); } catch {}
    }
    if (uid) {
      try {
        const { deleteDoc } = require('firebase/firestore');
        await deleteDoc(doc(db, 'users', uid));
      } catch {}
    }

    // 2) 로컬 데이터 전체 초기화
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEY, ONBOARDED_KEY, HOUSEHOLD_ID_KEY, HOUSEHOLD_KEY, LAST_UID_KEY,
        '@baebae_invite_code', '@baebae_welcome_shown',
        '@baebae_transactions', '@baebae_migrated', '@baebae_migrated_hid',
        '@profile_budget', '@profile_cards', '@profile_myname', '@profile_gender',
      ]);
    } catch {}

    // 3) 앱 상태 초기화 → 로그인 화면으로 이동
    setUser(null);
    setIsOnboarded(false);
    setHouseholdIdState(null);
    householdIdRef.current = null;
    setHouseholdNameState(DEFAULT_HOUSEHOLD);
    setPartnerName(null);
    setPartnerGender(null);

    // 4) Firebase Auth 삭제 (백그라운드, 재인증 필요 시 그냥 signOut)
    if (firebaseUser) {
      try {
        await deleteUser(firebaseUser);
      } catch {
        // 재인증 필요하거나 실패해도 무시 — 데이터는 이미 삭제됨
        try { await firebaseSignOut(auth); } catch {}
      }
    }
  };

  const signOut = async () => {
    try {
      if (user) {
        console.warn('[signOut] LAST_UID 저장:', user.id);
        await AsyncStorage.setItem(LAST_UID_KEY, user.id);
      }
      await AsyncStorage.removeItem(STORAGE_KEY);
      // ONBOARDED_KEY가 보존되는지 확인
      const check = await AsyncStorage.getItem(ONBOARDED_KEY);
      console.warn('[signOut] ONBOARDED_KEY 보존 확인:', check);
    } catch {}
    // isOnboarded는 유지! user=null이면 Navigator가 Login을 보여주므로
    // 재로그인 시 isOnboarded=true가 그대로 남아있어야 메인으로 바로 진입
    setUser(null);
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
    setHouseholdNameState(DEFAULT_HOUSEHOLD);
    setPartnerName(null);
    setPartnerGender(null);
    setPartnerId(null);
    setPartnerSince(null);
    await AsyncStorage.multiRemove([HOUSEHOLD_ID_KEY, HOUSEHOLD_KEY, '@baebae_partner_since']);
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    setIsOnboarded(true);
    console.warn('[completeOnboarding] ONBOARDED_KEY 저장 완료');
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
  const clearPartnerBudgetAlert = () => setPartnerBudgetAlert(false);
  const triggerPartnerBudgetAlert = () => setPartnerBudgetAlert(true);
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
      partnerName, partnerGender, partnerId, partnerSince, partnerConnectedAlert, clearPartnerAlert,
      signIn, devSignIn, signOut, deleteAccount, disconnectPartner, completeOnboarding,
      setHouseholdName, setHouseholdId, resetForFreshOnboarding,
      partnerDisconnectedAlert, clearPartnerDisconnectedAlert,
      partnerBudgetAlert, clearPartnerBudgetAlert, triggerPartnerBudgetAlert,
      forcedLogoutAlert, clearForcedLogoutAlert,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
