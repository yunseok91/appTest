import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { createHousehold, updateHouseholdName as updateHouseholdNameFS } from '../services/firestoreService';

type Nav = NativeStackNavigationProp<RootStackParamList, 'HouseholdName'>;
type Route = RouteProp<RootStackParamList, 'HouseholdName'>;

const MAX_LENGTH = 12;

export default function HouseholdNameScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const isConnected = route.params?.isConnected === true;
  const myGender = route.params?.gender ?? 'male';
  const { user, householdId, householdName: existingHouseholdName, setHouseholdName, setHouseholdId, completeOnboarding } = useAuth();
  // isConnected일 때 파트너의 가계명을 기본값으로 사용
  const [name, setName] = useState(() => isConnected ? existingHouseholdName : '');

  // onSnapshot이 비동기로 도착하는 경우를 위해 업데이트
  useEffect(() => {
    if (isConnected && existingHouseholdName && existingHouseholdName !== '우리 가계부') {
      setName(existingHouseholdName);
    }
  }, [isConnected, existingHouseholdName]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent={false} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.statusRow}>
          <TouchableOpacity onPress={() => navigation.canGoBack() && navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.container}>
          {/* 연결 상태 배지 */}
          {isConnected ? (
            <View style={styles.successBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={styles.successText}>연결 성공</Text>
            </View>
          ) : (
            <View style={styles.unconnectedBadge}>
              <Ionicons name="link-outline" size={14} color={colors.inactive} />
              <Text style={styles.unconnectedText}>미연결</Text>
            </View>
          )}

          {/* 커플 아바타 — 내 성별이 활성화, 상대방은 비활성화 */}
          <View style={styles.coupleRow}>
            {/* 나 (활성화) */}
            <View style={[styles.av, styles.avActive, { backgroundColor: myGender === 'male' ? '#cbdfee' : '#f2d9e1' }]}>
              <Image
                source={myGender === 'male'
                  ? require('../../assets/avatars/aRbFP.png')
                  : require('../../assets/avatars/HMHJX.png')}
                style={styles.avImg}
                resizeMode="contain"
              />
            </View>
            <Ionicons
              name={isConnected ? 'heart' : 'heart-dislike-outline'}
              size={16}
              color={isConnected ? '#E05C5C' : colors.inactive}
            />
            {/* 상대방 */}
            {isConnected ? (
              <View style={[styles.av, { backgroundColor: myGender === 'male' ? '#f2d9e1' : '#cbdfee' }]}>
                <Image
                  source={myGender === 'male'
                    ? require('../../assets/avatars/HMHJX.png')
                    : require('../../assets/avatars/aRbFP.png')}
                  style={styles.avImg}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={[styles.av, styles.avEmpty]}>
                <Ionicons name="person-outline" size={18} color={colors.inactive} />
              </View>
            )}
          </View>

          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title} allowFontScaling={false}>
              {isConnected ? '가계명을\n확인해주세요' : '우리만의 가계명을\n입력해주세요'}
            </Text>
            <Text style={styles.sub}>
              {isConnected
                ? '파트너의 가계명을 그대로 쓰거나 변경할 수 있어요.'
                : '가계부의 이름을 정해주세요. 나중에 변경할 수 있어요.'}
            </Text>
          </View>

          <View style={styles.spacer} />

          {/* Input */}
          <View style={styles.inputSection}>
            <View style={styles.inputLblRow}>
              <Text style={styles.inputLbl}>가계명</Text>
              <Text style={styles.counter}>{name.length} / {MAX_LENGTH}</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="예) 우리집 가계부"
              placeholderTextColor={colors.inactive}
              value={name}
              onChangeText={(t) => setName(t.slice(0, MAX_LENGTH))}
              maxLength={MAX_LENGTH}
            />
            <Text style={styles.helper}>최대 {MAX_LENGTH}자까지 입력할 수 있어요.</Text>
          </View>

          <View style={styles.spacer} />

          {/* Buttons */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={async () => {
              const houseName = name.trim() || '우리 가계부';
              await setHouseholdName(houseName);
              if (user) {
                try {
                  if (isConnected && householdId) {
                    // 파트너와 연결된 상태 → 기존 공유 household 이름만 변경
                    await updateHouseholdNameFS(householdId, houseName);
                  } else {
                    // 미연결 → 새 household 생성
                    const hId = await createHousehold(user.id, houseName);
                    setHouseholdId(hId);
                  }
                } catch (e) {
                  console.warn('[HouseholdName] Firestore 실패, 로컬 모드 유지:', e);
                }
              }
              await completeOnboarding();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>저장하기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={async () => { await completeOnboarding(); }}>
            <Text style={styles.skipText}>나중에 설정할게요</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  statusRow: { height: 62, justifyContent: 'center', paddingHorizontal: 24 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center',
  },
  container: {
    flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40,
  },
  successBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.successLight, borderRadius: 100,
    paddingHorizontal: 12, height: 32, alignSelf: 'flex-start',
  },
  successText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },
  unconnectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.canvas, borderRadius: 100,
    paddingHorizontal: 12, height: 32, alignSelf: 'flex-start',
  },
  unconnectedText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.inactive },
  coupleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12,
  },
  av: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  avActive: { borderColor: colors.primary },
  avEmpty: {
    backgroundColor: colors.canvas,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
  },
  avImg: { width: 30, height: 30 },
  titleSection: { marginTop: 20, gap: 8 },
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 34, color: colors.text, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  spacer: { flex: 1, minHeight: 24 },
  inputSection: { gap: 8 },
  inputLblRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputLbl: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  counter: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  input: {
    backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.primary, height: 56,
    paddingHorizontal: 16, fontFamily: fonts.regular, fontSize: 16, color: colors.text,
  },
  helper: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.white },
  skipBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
});
