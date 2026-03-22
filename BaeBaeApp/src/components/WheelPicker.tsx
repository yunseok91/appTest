import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/colors';

export const ITEM_H = 48;
export const YEARS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

type Props = {
  items: number[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  format?: (v: number) => string;
};

export default function WheelPicker({ items, selectedIndex, onSelect, format }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const label = format ?? ((v: number) => String(v));

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 50);
  }, [selectedIndex]);

  const handleSnap = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    onSelect(clamped);
  };

  return (
    <View style={styles.wheelOuter}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        onMomentumScrollEnd={handleSnap}
        onScrollEndDrag={handleSnap}
      >
        {items.map((v, i) => {
          const dist = Math.abs(i - selectedIndex);
          const isSelected = dist === 0;
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.55 : 0.25;
          const fontSize = dist === 0 ? 17 : dist === 1 ? 15 : 13;
          const fontWeight = dist === 0 ? fonts.bold : fonts.regular;
          return (
            <View key={v} style={[styles.wheelItem, isSelected && styles.wheelItemSelected]}>
              <Text style={[styles.wheelText, {
                opacity, fontSize, fontFamily: fontWeight,
                color: isSelected ? '#FFFFFF' : colors.text,
              }]}>
                {label(v)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const wheelStyles = StyleSheet.create({
  wheelOuter: { flex: 1, height: ITEM_H * 5, overflow: 'hidden' },
  wheelItem: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  wheelItemSelected: {
    backgroundColor: colors.primary, borderRadius: 10, marginHorizontal: 8,
  },
  wheelText: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
});

const styles = wheelStyles;
