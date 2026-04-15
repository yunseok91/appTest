import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView, Clipboard, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { colors, fonts } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { syncUser, joinHouseholdByCode } from '../services/firestoreService';

type Nav = NativeStackNavigationProp<RootStackParamList, 'InviteCode'>;
type RouteParams = RouteProp<RootStackParamList, 'InviteCode'>;

const INVITE_CODE_KEY = '@baebae_invite_code';

function generateCode(): string {
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const N = '0123456789';
  const r = (s: string) => s[Math.floor(Math.random() * s.length)];
  return `${r(L)}${r(L)}-${r(N)}${r(N)}${r(N)}${r(N)}-${r(L)}${r(L)}`;
}

export default function InviteCodeScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const { user, setHouseholdId, householdId, isOnboarded } = useAuth();
  const { myGender } = useProfile();
  const [myCode, setMyCode] = useState('');
  const [inputCode, setInputCode] = useState(route.params?.initialCode ?? '');
  const [alertType, setAlertType] = useState<null | 'fail'>(null);
  const [failReason, setFailReason] = useState('');
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(86400); // 24시간
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback((seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRemainingSeconds(seconds);
    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const formatTime = (s: number) => {
    if (s >= 3600) return `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분`;
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  // B가 앱을 켜기 전에 A가 이미 연결한 경우 → 마운트 시 householdId가 이미 있으면 자동 이동
  // (라이브 연결은 AppNavigator 모달이 담당)
  useEffect(() => {
    if (householdId && !isOnboarded) {
      navigation.navigate('HouseholdName', { isConnected: true, gender: myGender });
    }
  }, []);

  // 딥링크로 진입 시 코드 자동 입력
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const parsed = Linking.parse(event.url);
      if (parsed.queryParams?.code) {
        setInputCode(String(parsed.queryParams.code));
      }
    };
    const sub = Linking.addEventListener('url', handleDeepLink);
    // 앱이 이미 열려있지 않고 딥링크로 cold-start한 경우
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    (async () => {
      let code = await AsyncStorage.getItem(INVITE_CODE_KEY);
      if (!code) {
        code = generateCode();
        await AsyncStorage.setItem(INVITE_CODE_KEY, code);
      }
      setMyCode(code);
      startTimer(86400);
      // Firestore user doc에 초대코드 저장
      if (user) {
        try { await syncUser(user.id, code); } catch {}
      }
    })();
  }, [user]);

  const handleRefreshCode = async () => {
    const code = generateCode();
    await AsyncStorage.setItem(INVITE_CODE_KEY, code);
    setMyCode(code);
    startTimer(86400);
    if (user) {
      try { await syncUser(user.id, code); } catch {}
    }
  };

  const handleCopy = () => {
    Clipboard.setString(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const link = `baebae://invite?code=${myCode}`;
    try {
      await Share.share({ message: `배배 가계부에서 파트너 연결해요!\n초대코드: ${myCode}\n\n링크로 바로 연결: ${link}` });
    } catch {}
  };

  const handleConnect = async () => {
    const code = inputCode.trim().toUpperCase();
    if (code === myCode) { setFailReason('자신의 코드는 사용할 수 없어요'); setAlertType('fail'); return; }
    if (!user) { setFailReason('로그인 정보를 찾을 수 없어요'); setAlertType('fail'); return; }

    setConnecting(true);
    try {
      // 15초 타임아웃
      const hId = await Promise.race([
        joinHouseholdByCode(user.id, code),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('네트워크 연결을 확인해주세요.')), 15000)),
      ]);
      if (hId) {
        setHouseholdId(hId);
        // AppNavigator의 partnerConnectedAlert가 성공 팝업 담당
      } else {
        setFailReason('코드를 찾을 수 없어요.\n다시 확인해주세요.');
        setAlertType('fail');
      }
    } catch (e: any) {
      console.warn('[InviteCode] join failed:', e);
      setFailReason(e?.message ?? '알 수 없는 오류');
      setAlertType('fail');
    } finally {
      setConnecting(false);
    }
  };

  const canConnect = inputCode.trim().length >= 5;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent={false} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.statusRow}>
          <TouchableOpacity onPress={() => navigation.canGoBack() && navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} allowFontScaling={false}>코드를 공유하고 연결하세요</Text>
            <Text style={styles.sub}>초대코드를 공유하거나 받은 코드를 입력해 연결하세요</Text>
          </View>

          {/* Code card */}
          <View style={styles.codeCard}>
            <View style={styles.codeBg}>
              <Text style={styles.codeLbl}>초대코드</Text>
              <Text style={styles.codeNum} allowFontScaling={false}>{myCode || '...'}</Text>
              <View style={styles.timerRow}>
                <Ionicons name="time-outline" size={14} color={remainingSeconds <= 60 ? '#FF6B6B' : colors.primaryLight} />
                <Text style={[styles.timerText, remainingSeconds <= 60 && { color: '#FF6B6B' }]}>
                  {remainingSeconds > 0 ? `${formatTime(remainingSeconds)} 남음` : '만료됨'}
                </Text>
                <TouchableOpacity onPress={handleRefreshCode} style={styles.refreshBtn} activeOpacity={0.7}>
                  <Ionicons name="refresh-outline" size={14} color={colors.white} />
                  <Text style={styles.refreshText}>새 코드</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.codeBottom}>
              <View style={styles.expRow}>
                <Text style={styles.expLbl}>파트너에게 공유하세요</Text>
                <Text style={styles.expVal}>코드로 1:1 연결</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.copyBtn, { flex: 1 }]} onPress={handleCopy} activeOpacity={0.8}>
                  <Ionicons name={copied ? 'checkmark-outline' : 'copy-outline'} size={16} color={colors.primary} />
                  <Text style={styles.copyText}>{copied ? '복사됨!' : '코드 복사'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
                  <Ionicons name="share-social-outline" size={16} color={colors.white} />
                  <Text style={styles.shareText}>공유하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>또는</Text>
            <View style={styles.orLine} />
          </View>

          {/* Input section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLbl}>받은 초대코드가 있으신가요?</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="코드를 입력해주세요"
              placeholderTextColor={colors.inactive}
              value={inputCode}
              onChangeText={setInputCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.connectBtn, (!canConnect || connecting) && styles.connectBtnDisabled]}
              onPress={handleConnect}
              disabled={!canConnect || connecting}
              activeOpacity={0.85}
            >
              <Text style={[styles.connectBtnText, (!canConnect || connecting) && styles.connectBtnTextDisabled]}>
                {connecting ? '연결 중...' : '연결하기'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.skipBtn} onPress={() => isOnboarded ? navigation.goBack() : navigation.navigate('HouseholdName', { gender: myGender })}>
            <Text style={styles.skipText}>나중에 연결할게요</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 연결 실패 Alert */}
      <Modal visible={alertType === 'fail'} transparent animationType="fade">
        <View style={styles.dim}>
          <View style={styles.alertCard}>
            <View style={[styles.alertIcon, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="close-circle-outline" size={32} color={colors.error} />
            </View>
            <Text style={styles.alertTitle}>연결 실패</Text>
            <Text style={styles.alertSub}>{failReason || '코드를 다시 확인해주세요.'}</Text>
            <View style={styles.alertBtnRow}>
              <TouchableOpacity
                style={styles.alertCancelBtn}
                onPress={() => setAlertType(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.alertCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.alertRetryBtn}
                onPress={() => setAlertType(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.alertRetryText}>다시 시도</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  statusRow: { height: 62, justifyContent: 'center', paddingHorizontal: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  container: {
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48, gap: 24,
  },
  header: { gap: 8 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32, color: colors.text, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },

  codeCard: {
    backgroundColor: colors.card, borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  codeBg: {
    backgroundColor: colors.primary, height: 120,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  codeLbl: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primaryLight },
  codeNum: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40, color: colors.white, letterSpacing: 4 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  timerText: { fontFamily: fonts.regular, fontSize: 12, color: colors.primaryLight },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  refreshText: { fontFamily: fonts.medium, fontSize: 11, color: colors.white },
  codeBottom: { padding: 20, gap: 12 },
  expRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expLbl: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  expVal: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.secondary },
  actionRow: { flexDirection: 'row', gap: 8 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0F8F4', borderRadius: 12, height: 48, gap: 8,
  },
  copyText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 12, height: 48, paddingHorizontal: 16, gap: 6,
  },
  shareText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.white },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  orText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },

  inputSection: { gap: 12 },
  inputLbl: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  codeInput: {
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1.5,
    borderColor: colors.border, height: 56, paddingHorizontal: 20,
    fontFamily: fonts.semiBold, fontSize: 18, color: colors.text, letterSpacing: 4,
  },
  connectBtn: {
    backgroundColor: colors.primary, borderRadius: 100,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  connectBtnDisabled: { backgroundColor: colors.border },
  connectBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.white },
  connectBtnTextDisabled: { color: colors.inactive },

  skipBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontFamily: fonts.regular, fontSize: 14, color: colors.inactive },

  // Alerts
  dim: {
    flex: 1, backgroundColor: colors.overlay,
    alignItems: 'center', justifyContent: 'center',
  },
  alertCard: {
    width: '82%', backgroundColor: colors.card,
    borderRadius: 20, padding: 24, alignItems: 'center', gap: 16,
  },
  alertIcon: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  alertTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  alertSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  alertBtn: {
    backgroundColor: colors.primary, borderRadius: 100, width: '100%',
    height: 48, alignItems: 'center', justifyContent: 'center',
  },
  alertBtnText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.white },
  alertBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  alertCancelBtn: {
    flex: 1, height: 48, borderRadius: 100,
    backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center',
  },
  alertCancelText: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  alertRetryBtn: {
    flex: 1.5, height: 48, borderRadius: 100,
    backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center',
  },
  alertRetryText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.white },
});
