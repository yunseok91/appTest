import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleAuthProvider } from 'firebase/auth';
import { colors, fonts } from '../theme/colors';
import GoogleIcon from '../components/GoogleIcon';
import BaeBaeMark from '../components/BaeBaeMark';
import { useAuth } from '../context/AuthContext';

const WEB_CLIENT_ID = '476537137658-v8a134ljp7fkkgivbpg1vk2bg58vltb0.apps.googleusercontent.com';
const IOS_CLIENT_ID = '476537137658-iko16ukbpt14to4ot4enkeotbrlrjbtn.apps.googleusercontent.com';

export default function LoginScreen() {
  const { signIn, devSignIn } = useAuth();
  const [loading, setLoading] = useState(false);

  // 네이티브 모듈 사용 가능 여부 체크
  let hasNativeGoogleSignIn = false;
  try {
    require('@react-native-google-signin/google-signin');
    hasNativeGoogleSignIn = true;
  } catch {}

  const handleGoogleSignIn = async () => {
    if (!hasNativeGoogleSignIn) {
      Alert.alert('Expo Go 제한', '개발 모드 진입 버튼을 사용해주세요.\n\nGoogle 로그인은 development build가 필요합니다.');
      return;
    }
    setLoading(true);
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        iosClientId: IOS_CLIENT_ID,
      });
      try { await GoogleSignin.signOut(); } catch {}
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken ?? userInfo.data?.idToken;
      if (!idToken) throw new Error('idToken not found');
      const credential = GoogleAuthProvider.credential(idToken);
      await signIn(credential);
    } catch (e: any) {
      try {
        const { statusCodes } = require('@react-native-google-signin/google-signin');
        if (e.code === statusCodes.SIGN_IN_CANCELLED) return;
      } catch {}
      console.warn('[Login] error:', e?.code, e?.message);
      Alert.alert('로그인 실패', '다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = async () => {
    setLoading(true);
    try {
      await devSignIn();
    } catch (e: any) {
      console.warn('[Login] Dev bypass error:', e?.message);
      Alert.alert('개발 모드 실패', e?.message ?? '다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent={false} />
      <View style={styles.container}>
        <View style={styles.topSection}>
          <BaeBaeMark size={114} />
          <Text style={styles.appTitle} allowFontScaling={false}>배배</Text>
          <Text style={styles.appSub}>우리 가족의 가계부</Text>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.ctaBlock}>
            <Text style={styles.ctaHeading} allowFontScaling={false}>함께 시작해요</Text>
            <Text style={styles.ctaSub}>소중한 일상을 함께 기록해보세요</Text>
          </View>

          <TouchableOpacity
            testID="login-btn-google"
            style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <>
                <GoogleIcon size={28} />
                <Text style={styles.googleLabel}>Google로 로그인</Text>
              </>
            )}
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity testID="login-btn-dev-bypass" style={styles.devBtn} onPress={handleDevBypass}>
              <Text style={styles.devBtnText}>개발 모드 진입</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.termsNote}>
            로그인 시 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 52,
    justifyContent: 'space-between',
  },
  topSection: { alignItems: 'center', gap: 16 },
  appTitle: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 36,
    color: colors.text,
    letterSpacing: -1,
    marginTop: 16,
  },
  appSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  bottomSection: { gap: 20 },
  ctaBlock: { gap: 8 },
  ctaHeading: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 30,
    color: colors.text,
    letterSpacing: -0.5,
  },
  ctaSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    height: 56,
    gap: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  googleBtnDisabled: { opacity: 0.6 },
  googleLabel: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text },
  termsNote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  devBtn: { alignItems: 'center', paddingVertical: 10 },
  devBtnText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
});
