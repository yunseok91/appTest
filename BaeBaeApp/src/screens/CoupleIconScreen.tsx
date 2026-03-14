import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CoupleIcon'>;

const ICONS = [
  {
    key: 'male' as const,
    label: '남자',
    bg: '#cbdfeeff',
    img: require('../../assets/avatars/aRbFP.png'),
    size: 72,
  },
  {
    key: 'female' as const,
    label: '여자',
    bg: '#f2d9e1ff',
    img: require('../../assets/avatars/HMHJX.png'),
    size: 72,
  },
];

export default function CoupleIconScreen() {
  const navigation = useNavigation<Nav>();
  const [selected, setSelected] = useState<'male' | 'female'>('male');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.statusRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.step}>1 / 3 단계</Text>
          <Text style={styles.title}>나는 누구인가요?</Text>
          <Text style={styles.sub}>연인 중 내 역할을 선택해 주세요</Text>
        </View>

        <View style={styles.chip}>
          <Text style={styles.chipText}>💑 연인</Text>
        </View>

        <View style={styles.iconGrid}>
          {ICONS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.iconWrap}
              onPress={() => setSelected(item.key)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.iconCircle,
                { backgroundColor: item.bg, width: item.size, height: item.size, borderRadius: item.size / 2 },
                selected === item.key && styles.iconCircleSelected,
              ]}>
                <Image source={item.img} style={{ width: item.size * 0.75, height: item.size * 0.75 }} resizeMode="contain" />
              </View>
              <Text style={[styles.iconLabel, selected === item.key && styles.iconLabelSelected]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.spacer} />

        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => navigation.navigate('ProfileSetup', { type: 'couple', gender: selected })}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>다음</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  statusRow: { height: 56, justifyContent: 'center', paddingHorizontal: 24 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center',
  },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48, gap: 24 },
  header: { gap: 8 },
  step: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  chip: {
    height: 32, paddingHorizontal: 16, borderRadius: 100,
    backgroundColor: colors.primary, alignSelf: 'flex-start',
    alignItems: 'center', justifyContent: 'center',
  },
  chipText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.white },
  iconGrid: { flexDirection: 'row', justifyContent: 'center', gap: 32 },
  iconWrap: { alignItems: 'center', gap: 10 },
  iconCircle: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'transparent',
  },
  iconCircleSelected: { borderColor: colors.primary },
  iconLabel: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textSecondary },
  iconLabelSelected: { color: colors.primary },
  spacer: { flex: 1 },
  nextBtn: {
    backgroundColor: colors.primary, borderRadius: 100,
    height: 56, alignItems: 'center', justifyContent: 'center',
  },
  nextBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.white },
});
