import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  ScrollView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme/colors';

const ITEM_H = 48;
const YEARS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const CAT_COLORS: Record<string, string> = {
  '식비':     '#E8956D',
  '교통':     '#6B9EC7',
  '쇼핑':     '#B87BA5',
  '문화/여가': '#7C8FC5',
  '미용/관리': '#E8A0B5',
  '운동':     '#6DAF7E',
  '주거/통신': '#8AA5B8',
  '기타':     '#A09585',
};

const MY_CATS = [
  { label: '식비',  pct: 30, amount: 305000, color: CAT_COLORS['식비'] },
  { label: '쇼핑',  pct: 25, amount: 258000, color: CAT_COLORS['쇼핑'] },
  { label: '교통',  pct: 15, amount: 152000, color: CAT_COLORS['교통'] },
  { label: '기타',  pct: 30, amount: 300000, color: CAT_COLORS['기타'] },
];

const PARTNER_CATS = [
  { label: '식비',  pct: 45, amount: 180000, color: CAT_COLORS['식비'] },
  { label: '교통',  pct: 20, amount: 80000,  color: CAT_COLORS['교통'] },
  { label: '운동',  pct: 20, amount: 80000,  color: CAT_COLORS['운동'] },
  { label: '기타',  pct: 15, amount: 60000,  color: CAT_COLORS['기타'] },
];

function DonutChart({ categories, totalLabel, totalAmt }: {
  categories: typeof MY_CATS;
  totalLabel: string;
  totalAmt: string;
}) {
  const SIZE = 160;
  const STROKE = 28;
  const INNER = SIZE - STROKE * 2;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: SIZE, height: SIZE, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2,
          borderWidth: STROKE,
          borderTopColor:    categories[0]?.color ?? '#EDECEA',
          borderRightColor:  categories[1]?.color ?? '#EDECEA',
          borderBottomColor: categories[2]?.color ?? '#EDECEA',
          borderLeftColor:   categories[3]?.color ?? '#EDECEA',
        }} />
        <View style={{ width: INNER, height: INNER, borderRadius: INNER / 2, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Text style={styles.donutAmt}>{totalAmt}</Text>
          <Text style={styles.donutLbl}>{totalLabel}</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {categories.map((c) => (
          <View key={c.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c.color }]} />
            <Text style={styles.legendText}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function WheelPicker({ items, selectedIndex, onSelect, format }: {
  items: number[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  format?: (v: number) => string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const label = format ?? ((v: number) => String(v));

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 50);
  }, [selectedIndex]);

  return (
    <View style={styles.wheelOuter}>
      {/* 선택 하이라이트 */}
      <View pointerEvents="none" style={styles.wheelHighlight} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          const clamped = Math.max(0, Math.min(idx, items.length - 1));
          onSelect(clamped);
        }}
      >
        {items.map((v, i) => {
          const dist = Math.abs(i - selectedIndex);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.45 : 0.2;
          const fontSize = dist === 0 ? 18 : dist === 1 ? 15 : 13;
          const fontWeight = dist === 0 ? fonts.bold : fonts.regular;
          return (
            <View key={v} style={styles.wheelItem}>
              <Text style={[styles.wheelText, { opacity, fontSize, fontFamily: fontWeight }]}>
                {label(v)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function StatisticsScreen() {
  const [person, setPerson] = useState<'me' | 'partner'>('me');
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(3);
  const [showPicker, setShowPicker] = useState(false);
  const [pickYearIdx, setPickYearIdx] = useState(YEARS.indexOf(2026));
  const [pickMonthIdx, setPickMonthIdx] = useState(2); // 3월 = index 2

  const cats = person === 'me' ? MY_CATS : PARTNER_CATS;
  const totalSpend = cats.reduce((s, c) => s + c.amount, 0);

  const openPicker = () => {
    setPickYearIdx(YEARS.indexOf(currentYear));
    setPickMonthIdx(currentMonth - 1);
    setShowPicker(true);
  };

  const confirmPicker = () => {
    setCurrentYear(YEARS[pickYearIdx]);
    setCurrentMonth(MONTHS[pickMonthIdx]);
    setShowPicker(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>통계</Text>
          <View style={styles.monthToggle}>
            <TouchableOpacity onPress={() => setCurrentMonth(m => m > 1 ? m - 1 : 12)} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={openPicker} activeOpacity={0.7}>
              <Text style={styles.headerMonth}>{currentMonth}월</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCurrentMonth(m => m < 12 ? m + 1 : 1)} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Person toggle */}
        <View style={styles.personToggle}>
          {[{ key: 'me', label: '나' }, { key: 'partner', label: '파트너' }].map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.personBtn, person === key && styles.personBtnActive]}
              onPress={() => setPerson(key as 'me' | 'partner')}
              activeOpacity={0.8}
            >
              <Text style={[styles.personBtnText, person === key && styles.personBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart card */}
        <View style={styles.chartCard}>
          <Text style={styles.chartLbl}>이번 달 지출</Text>
          <DonutChart categories={cats} totalLabel="총 지출" totalAmt={`₩${totalSpend.toLocaleString()}`} />
        </View>

        {/* Category list */}
        <Text style={styles.catTitle}>카테고리별 지출</Text>
        <View style={styles.catCard}>
          {cats.map((cat, i) => (
            <React.Fragment key={cat.label}>
              {i > 0 && <View style={styles.catDivider} />}
              <View style={styles.catRow}>
                <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                <Text style={styles.catLabel}>{cat.label}</Text>
                <Text style={styles.catPct}>{cat.pct}%</Text>
                <Text style={styles.catAmt}>₩{cat.amount.toLocaleString()}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 년도/월 선택 바텀시트 (AGs1J) */}
      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowPicker(false)} />
        <View style={styles.ymSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.ymHeader}>
            <Text style={styles.ymTitle}>날짜 선택</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.ymDivider} />

          <View style={styles.ymPickerRow}>
            <WheelPicker
              items={YEARS}
              selectedIndex={pickYearIdx}
              onSelect={setPickYearIdx}
            />
            <WheelPicker
              items={MONTHS}
              selectedIndex={pickMonthIdx}
              onSelect={setPickMonthIdx}
              format={(v) => `${v}월`}
            />
          </View>

          <TouchableOpacity style={styles.ymConfirmBtn} onPress={confirmPicker} activeOpacity={0.85}>
            <Text style={styles.ymConfirmText}>확인</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  headerMonth: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  monthToggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  personToggle: { flexDirection: 'row', backgroundColor: colors.canvas, marginHorizontal: 20, borderRadius: 100, padding: 4, gap: 2, height: 40, marginBottom: 16 },
  personBtn: { flex: 1, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  personBtnActive: { backgroundColor: colors.primary },
  personBtnText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
  personBtnTextActive: { color: '#FFFFFF', fontFamily: fonts.semiBold },

  chartCard: { backgroundColor: colors.card, marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 16, gap: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  chartLbl: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, alignSelf: 'flex-start' },
  donutAmt: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  donutLbl: { fontFamily: fonts.regular, fontSize: 10, color: colors.textSecondary },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.regular, fontSize: 11, color: colors.text },

  catTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text, paddingHorizontal: 20, marginBottom: 10 },
  catCard: { backgroundColor: colors.card, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  catDivider: { height: 1, backgroundColor: colors.canvas },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  catPct: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, width: 36, textAlign: 'right' },
  catAmt: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text, width: 90, textAlign: 'right' },

  // 바텀시트
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  ymSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  ymHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48, paddingHorizontal: 20 },
  ymTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  ymDivider: { height: 1, backgroundColor: colors.border },

  // 휠 피커
  ymPickerRow: { flexDirection: 'row', height: ITEM_H * 5, marginTop: 8 },
  wheelOuter: { flex: 1, overflow: 'hidden' },
  wheelHighlight: {
    position: 'absolute', zIndex: 1,
    top: ITEM_H * 2, left: 12, right: 12, height: ITEM_H,
    backgroundColor: colors.primary, borderRadius: 12, opacity: 0.12,
  },
  wheelItem: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  wheelText: { color: colors.text },

  ymConfirmBtn: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  ymConfirmText: { fontFamily: fonts.semiBold, fontSize: 16, color: '#FFFFFF' },
});
