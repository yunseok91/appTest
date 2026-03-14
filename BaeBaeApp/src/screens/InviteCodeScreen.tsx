import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'InviteCode'>;

const INVITE_CODE = 'BF-2847-XK';

export default function InviteCodeScreen() {
  const navigation = useNavigation<Nav>();
  const [inputCode, setInputCode] = useState('');
  const [alertType, setAlertType] = useState<null | 'success' | 'fail'>(null);

  const handleConnect = () => {
    if (inputCode.trim().toUpperCase() === INVITE_CODE) {
      setAlertType('success');
    } else {
      setAlertType('fail');
    }
  };

  const canConnect = inputCode.trim().length >= 5;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.statusRow} />

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>코드를 공유하고 연결하세요</Text>
            <Text style={styles.sub}>초대코드를 공유하거나 받은 코드를 입력해 연결하세요</Text>
          </View>

          {/* Code card */}
          <View style={styles.codeCard}>
            <View style={styles.codeBg}>
              <Text style={styles.codeLbl}>초대코드</Text>
              <Text style={styles.codeNum}>{INVITE_CODE}</Text>
            </View>
            <View style={styles.codeBottom}>
              <View style={styles.expRow}>
                <Text style={styles.expLbl}>유효기간</Text>
                <Text style={styles.expVal}>발급 후 24시간 이내</Text>
              </View>
              <TouchableOpacity style={styles.copyBtn} activeOpacity={0.8}>
                <Ionicons name="copy-outline" size={16} color={colors.primary} />
                <Text style={styles.copyText}>코드 복사하기</Text>
              </TouchableOpacity>
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
              style={[styles.connectBtn, !canConnect && styles.connectBtnDisabled]}
              onPress={handleConnect}
              disabled={!canConnect}
              activeOpacity={0.85}
            >
              <Text style={[styles.connectBtnText, !canConnect && styles.connectBtnTextDisabled]}>
                연결하기
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.navigate('HouseholdName')}>
            <Text style={styles.skipText}>나중에 연결할게요</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 연결 성공 Alert */}
      <Modal visible={alertType === 'success'} transparent animationType="fade">
        <View style={styles.dim}>
          <View style={styles.alertCard}>
            <View style={[styles.alertIcon, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />
            </View>
            <Text style={styles.alertTitle}>연결 되었습니다! 🎉</Text>
            <Text style={styles.alertSub}>파트너와 성공적으로 연결됐어요.</Text>
            <TouchableOpacity
              style={styles.alertBtn}
              onPress={() => { setAlertType(null); navigation.navigate('HouseholdName'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.alertBtnText}>다음</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 연결 실패 Alert */}
      <Modal visible={alertType === 'fail'} transparent animationType="fade">
        <View style={styles.dim}>
          <View style={styles.alertCard}>
            <View style={[styles.alertIcon, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="close-circle-outline" size={32} color={colors.error} />
            </View>
            <Text style={styles.alertTitle}>연결 실패</Text>
            <Text style={styles.alertSub}>코드를 다시 확인해주세요.</Text>
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
  statusRow: { height: 62 },
  container: {
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48, gap: 24,
  },
  header: { gap: 8 },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, letterSpacing: -0.5 },
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
  codeNum: { fontFamily: fonts.bold, fontSize: 32, color: colors.white, letterSpacing: 4 },
  codeBottom: { padding: 20, gap: 12 },
  expRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expLbl: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  expVal: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.secondary },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0F8F4', borderRadius: 12, height: 48, gap: 8,
  },
  copyText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
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
    width: 320, backgroundColor: colors.card,
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
