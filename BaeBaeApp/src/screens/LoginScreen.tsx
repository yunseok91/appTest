import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { colors, fonts } from '../theme/colors';
import GoogleIcon from '../components/GoogleIcon';
import BaeBaeMark from '../components/BaeBaeMark';
import { useAuth } from '../context/AuthContext';
import { auth } from '../config/firebase';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = '476537137658-v8a134ljp7fkkgivbpg1vk2bg58vltb0.apps.googleusercontent.com';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  // iOS (Expo Go) — auth.expo.io 프록시 방식
  const redirectUri = 'https://auth.expo.io/@leeyunseok/baebae-app';
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: WEB_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleAccessToken(response.authentication?.accessToken);
    } else if (response?.type === 'error') {
      setLoading(false);
      Alert.alert('로그인 실패', response.error?.message ?? '다시 시도해 주세요.');
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setLoading(false);
    }
  }, [response]);

  const handleAccessToken = async (accessToken?: string) => {
    if (!accessToken) { setLoading(false); return; }
    try {
      const credential = GoogleAuthProvider.credential(null, accessToken);
      const userCredential = await signInWithCredential(auth, credential);
      const fbUser = userCredential.user;
      await signIn({
        id: fbUser.uid,
        name: fbUser.displayName ?? '사용자',
        email: fbUser.email ?? '',
        picture: fbUser.photoURL ?? '',
      });
    } catch (e: any) {
      console.warn('[Login] Firebase error:', e?.code, e?.message);
      Alert.alert('로그인 실패', '다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleNativeAndroid = async () => {
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
      await GoogleSignin.hasPlayServices();
      try { await GoogleSignin.signOut(); } catch {}
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken ?? userInfo.data?.idToken;
      if (!idToken) throw new Error('idToken not found');
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const fbUser = userCredential.user;
      await signIn({
        id: fbUser.uid,
        name: fbUser.displayName ?? '사용자',
        email: fbUser.email ?? '',
        picture: fbUser.photoURL ?? '',
      });
    } catch (e: any) {
      try {
        const { statusCodes } = require('@react-native-google-signin/google-signin');
        if (e.code === statusCodes.SIGN_IN_CANCELLED) return;
      } catch {}
      console.warn('[Login] Android error:', e?.code, e?.message);
      Alert.alert('로그인 실패', '다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async () => {
    setLoading(true);
    if (Platform.OS === 'android') {
      await handleNativeAndroid();
    } else {
      await promptAsync();
    }
  };

  const handleDevBypass = async () => {
    await signIn({ id: 'dev-001', name: '개발자', email: 'dev@baebae.app', picture: '' });
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
            style={[styles.googleBtn, (loading || (Platform.OS !== 'android' && !request)) && styles.googleBtnDisabled]}
            onPress={handlePress}
            disabled={loading || (Platform.OS !== 'android' && !request)}
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
            <TouchableOpacity style={styles.devBtn} onPress={handleDevBypass}>
              <Text style={styles.devBtnText}>🛠 개발 모드 진입</Text>
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
