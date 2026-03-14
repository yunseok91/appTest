import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  TextInput, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'HouseholdName'>;

const MAX_LENGTH = 12;

export default function HouseholdNameScreen() {
  const navigation = useNavigation<Nav>();
  const [name, setName] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.statusRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.container}>
          {/* Success badge */}
          <View style={styles.successBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            <Text style={styles.successText}>연결 성공</Text>
          </View>

          {/* Couple row */}
          <View style={styles.coupleRow}>
            <View style={[styles.av, { backgroundColor: '#f2d9e1' }]}>
              <Image source={require('../../assets/avatars/HMHJX.png')} style={styles.avImg} resizeMode="contain" />
            </View>
            <Ionicons name="heart" size={16} color="#E05C5C" />
            <View style={[styles.av, { backgroundColor: '#cbdfee' }]}>
              <Image source={require('../../assets/avatars/aRbFP.png')} style={styles.avImg} resizeMode="contain" />
            </View>
          </View>

          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>우리만의 가계명을{'\n'}입력해주세요</Text>
            <Text style={styles.sub}>가계부의 이름을 정해주세요. 나중에 변경할 수 있어요.</Text>
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
            onPress={() => navigation.navigate('MainTabs')}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>저장하기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.navigate('MainTabs')}>
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
  coupleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12,
  },
  av: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avImg: { width: 30, height: 30 },
  titleSection: { marginTop: 20, gap: 8 },
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.text, letterSpacing: -0.5 },
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
