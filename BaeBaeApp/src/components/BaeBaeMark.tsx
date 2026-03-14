import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BaeBaeMark({ size = 114 }: { size?: number }) {
  const scale = size / 114;
  return (
    <View style={[styles.outer, { width: size, height: size, borderRadius: 26 * scale }]}>
      <View style={[styles.mark, { width: 78 * scale, height: 48 * scale }]}>
        {/* Left green circle */}
        <View style={[styles.circle, { width: 48 * scale, height: 48 * scale, borderRadius: 24 * scale, backgroundColor: '#3D8A5A', left: 0 }]}>
          <View style={[styles.inner, { width: 30 * scale, height: 30 * scale, borderRadius: 15 * scale, backgroundColor: '#EDF7F2' }]}>
            <Text style={[styles.symbol, { color: '#3D8A5A', fontSize: 14 * scale }]}>₩</Text>
          </View>
        </View>
        {/* Right salmon circle (overlapping) */}
        <View style={[styles.circle, { width: 48 * scale, height: 48 * scale, borderRadius: 24 * scale, backgroundColor: '#D95F4B', left: 30 * scale }]}>
          <View style={[styles.inner, { width: 30 * scale, height: 30 * scale, borderRadius: 15 * scale, backgroundColor: '#FDF0ED' }]}>
            <Text style={[styles.symbol, { color: '#D95F4B', fontSize: 14 * scale }]}>♡</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  mark: {
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    fontWeight: '700',
  },
});
