import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { colors, fonts } from '../theme/colors';
import GoogleIcon from '../components/GoogleIcon';
import BaeBaeMark from '../components/BaeBaeMark';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

// ⚠️ Google Cloud Console에서 발급받은 Client ID를 입력하세요
// iOS: https://console.cloud.google.com → Credentials → iOS 타입 생성 (번들 ID: com.baebae.app)
const GOOGLE_CLIENT_IDS = {
  iosClientId: '306132751951-lql1gl5lveganp301s5igvibkkmac6h7.apps.googleusercontent.com',
  // androidClientId: 'TODO: EAS 빌드 시 추가',
  webClientId: '306132751951-o6gqrfvftfovq9f2a96h8c85ktqsgsr1.apps.googleusercontent.com',
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest(GOOGLE_CLIENT_IDS);

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleResponse(response.authentication?.accessToken);
    } else if (response?.type === 'error') {
      setLoading(false);
      Alert.alert('로그인 실패', response.error?.message ?? '다시 시도해 주세요.');
    } else if (response?.type === 'dismiss') {
      setLoading(false);
    }
  }, [response]);

  const handleGoogleResponse = async (accessToken?: string) => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await res.json();
      await signIn({
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
      });
      navigation.navigate('CoupleIcon');
    } catch {
      Alert.alert('로그인 실패', '사용자 정보를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async () => {
    setLoading(true);
    await promptAsync();
  };

  const handleDevBypass = async () => {
    await signIn({ id: 'dev-001', name: '개발자', email: 'dev@baebae.app', picture: '' });
    navigation.navigate('CoupleIcon');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.container}>
        {/* Top section */}
        <View style={styles.topSection}>
          <BaeBaeMark size={114} />
          <Text style={styles.appTitle}>배배</Text>
          <Text style={styles.appSub}>우리 가족의 가계부</Text>
        </View>

        {/* Bottom section */}
        <View style={styles.bottomSection}>
          <View style={styles.ctaBlock}>
            <Text style={styles.ctaHeading}>함께 시작해요</Text>
            <Text style={styles.ctaSub}>소중한 일상을 함께 기록해보세요</Text>
          </View>

          <TouchableOpacity
            style={[styles.googleBtn, (!request || loading) && styles.googleBtnDisabled]}
            onPress={handlePress}
            disabled={!request || loading}
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

          {/* 개발용 우회 버튼 — 배포 전 제거 */}
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
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 52,
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
    gap: 16,
  },
  appTitle: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.text,
    letterSpacing: -1,
    marginTop: 16,
  },
  appSub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  bottomSection: {
    gap: 20,
  },
  ctaBlock: {
    gap: 8,
  },
  ctaHeading: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.5,
  },
  ctaSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
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
  googleBtnDisabled: {
    opacity: 0.6,
  },
  googleLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
  },
  termsNote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  devBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  devBtnText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
