import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Props {
  size?: number;
}

export default function GoogleIcon({ size = 28 }: Props) {
  const half = size / 2;
  const inner = size * 0.5;
  const innerOffset = size * 0.25;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: half }]}>
      {/* Top-right: Blue */}
      <View style={[styles.quad, { top: 0, right: 0, width: half, height: half, backgroundColor: '#4285F4' }]} />
      {/* Bottom-right: Red */}
      <View style={[styles.quad, { bottom: 0, right: 0, width: half, height: half, backgroundColor: '#EA4335' }]} />
      {/* Bottom-left: Yellow */}
      <View style={[styles.quad, { bottom: 0, left: 0, width: half, height: half, backgroundColor: '#FBBC05' }]} />
      {/* Top-left: Green */}
      <View style={[styles.quad, { top: 0, left: 0, width: half, height: half, backgroundColor: '#34A853' }]} />
      {/* Inner white circle (ring effect) */}
      <View style={[styles.quad, { top: innerOffset, left: innerOffset, width: inner, height: inner, borderRadius: inner / 2, backgroundColor: '#FFFFFF' }]} />
      {/* White notch (top-right opening of G) */}
      <View style={[styles.quad, { top: size * 0.35, right: 0, width: half * 0.65, height: size * 0.3, backgroundColor: '#FFFFFF' }]} />
      {/* Blue crossbar */}
      <View style={[styles.quad, { top: size * 0.42, right: 0, width: half * 0.5, height: size * 0.16, backgroundColor: '#4285F4' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  quad: {
    position: 'absolute',
  },
});
