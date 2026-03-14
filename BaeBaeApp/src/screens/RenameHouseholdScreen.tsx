import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../theme/colors';

const MAX_LENGTH = 12;

export default function RenameHouseholdScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('우리 가계부');

  const handleChange = (text: string) => {
    if (text.length <= MAX_LENGTH) setName(text);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>가계명 변경</Text>
        </View>

        <View style={styles.content}>
          {/* Current name display */}
          <Text style={styles.sectionLabel}>현재 가계명</Text>
          <View style={styles.currentCard}>
            <Text style={styles.currentName}>{name}</Text>
          </View>

          {/* Input */}
          <View style={styles.inputSection}>
            <View style={styles.inputLabelRow}>
              <Text style={styles.inputLabel}>가계명</Text>
              <Text style={styles.counter}>{name.length} / {MAX_LENGTH}</Text>
            </View>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={handleChange}
              placeholder="가계명을 입력하세요"
              placeholderTextColor={colors.textMuted}
              maxLength={MAX_LENGTH}
              returnKeyType="done"
            />
          </View>

          <View style={{ flex: 1 }} />

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
            onPress={() => navigation.goBack()}
            disabled={!name.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>저장하기</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    height: 56, paddingHorizontal: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },

  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32, gap: 24 },

  sectionLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  currentCard: {
    backgroundColor: colors.card, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  currentName: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text },

  inputSection: { gap: 8 },
  inputLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  counter: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  input: {
    backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.primary,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: fonts.regular, fontSize: 15, color: colors.text,
  },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 100,
    height: 56, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: '#FFFFFF' },
});
