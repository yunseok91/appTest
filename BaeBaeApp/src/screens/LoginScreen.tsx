import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/colors';
import GoogleIcon from '../components/GoogleIcon';
import BaeBaeMark from '../components/BaeBaeMark';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();

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
            style={styles.googleBtn}
            onPress={() => navigation.navigate('CoupleIcon')}
            activeOpacity={0.85}
          >
            <GoogleIcon size={28} />
            <Text style={styles.googleLabel}>Google로 로그인</Text>
          </TouchableOpacity>

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
});
