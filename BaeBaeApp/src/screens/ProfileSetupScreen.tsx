import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, TextInput, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ProfileSetup'>;
type Route = RouteProp<RootStackParamList, 'ProfileSetup'>;

export default function ProfileSetupScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { gender: initialGender } = route.params;
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>(initialGender ?? 'male');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.statusRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.step}>2 / 3 단계</Text>
            <Text style={styles.title}>프로필을 설정해요</Text>
            <Text style={styles.sub}>선택한 아이콘의 이름과 성별을 입력해 주세요</Text>
          </View>

          {/* Selected avatar */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatarCircle, { backgroundColor: gender === 'female' ? '#f2d9e1' : '#E0EEF8' }]}>
              <Image
                source={gender === 'female'
                  ? require('../../assets/avatars/HMHJX.png')
                  : require('../../assets/avatars/aRbFP.png')}
                style={styles.avatarImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.avatarLabel}>선택된 아이콘</Text>
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            <Text style={styles.fieldLabel}>이름</Text>
            <TextInput
              style={styles.input}
              placeholder="이름을 입력하세요"
              placeholderTextColor={colors.inactive}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>성별</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderBtn, gender === 'male' && styles.genderBtnSelected]}
                onPress={() => setGender('male')}
                activeOpacity={0.8}
              >
                <Text style={[styles.genderBtnText, gender === 'male' && styles.genderBtnTextSelected]}>
                  남자
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, gender === 'female' && styles.genderBtnSelected]}
                onPress={() => setGender('female')}
                activeOpacity={0.8}
              >
                <Text style={[styles.genderBtnText, gender === 'female' && styles.genderBtnTextSelected]}>
                  여자
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 40 }} />

          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => navigation.navigate('InviteCode')}
            activeOpacity={0.85}
          >
            <Text style={styles.completeBtnText}>프로필 완성</Text>
          </TouchableOpacity>
        </ScrollView>
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
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48, gap: 28,
  },
  header: { gap: 8 },
  step: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  avatarSection: { alignItems: 'center', gap: 8 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.primary,
  },
  avatarImg: { width: 60, height: 60 },
  avatarLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  fields: { gap: 16 },
  fieldLabel: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  input: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    height: 52,
    paddingHorizontal: 16,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5, borderColor: colors.border,
  },
  genderBtnSelected: {
    backgroundColor: colors.primary, borderColor: colors.primary,
  },
  genderBtnText: {
    fontFamily: fonts.semiBold, fontSize: 15, color: colors.textSecondary,
  },
  genderBtnTextSelected: { color: colors.white },
  completeBtn: {
    backgroundColor: colors.primary, borderRadius: 100,
    height: 56, alignItems: 'center', justifyContent: 'center',
  },
  completeBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.white },
});
