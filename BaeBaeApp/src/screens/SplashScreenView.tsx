import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function SplashScreenView({ onFinish }: { onFinish: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const dotsOpacity = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(0.45)).current,
    useRef(new Animated.Value(0.2)).current,
  ];

  useEffect(() => {
    // 페이드 인
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // 로딩 도트 애니메이션
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotsOpacity[0], { toValue: 0.2, duration: 300, useNativeDriver: true }),
        Animated.timing(dotsOpacity[1], { toValue: 1,   duration: 300, useNativeDriver: true }),
        Animated.timing(dotsOpacity[1], { toValue: 0.45,duration: 300, useNativeDriver: true }),
        Animated.timing(dotsOpacity[2], { toValue: 1,   duration: 300, useNativeDriver: true }),
        Animated.timing(dotsOpacity[2], { toValue: 0.2, duration: 300, useNativeDriver: true }),
        Animated.timing(dotsOpacity[0], { toValue: 1,   duration: 300, useNativeDriver: true }),
      ])
    );
    dotLoop.start();

    // 2.2초 후 페이드 아웃 → 완료 콜백
    const timer = setTimeout(() => {
      dotLoop.stop();
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 2200);

    return () => {
      clearTimeout(timer);
      dotLoop.stop();
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      {/* 로고 */}
      <View style={styles.centerContent}>
        <View style={styles.logoBg}>
          <View style={styles.baeMarkWrap}>
            <View style={[styles.circle, styles.leftCircle]} />
            <View style={[styles.circle, styles.rightCircle]} />
            <View style={[styles.innerCircle, styles.leftInner]}>
              <Text style={styles.innerLetter}>배</Text>
            </View>
            <View style={[styles.innerCircle, styles.rightInner]}>
              <Text style={styles.innerLetter}>배</Text>
            </View>
          </View>
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.appName}>배배</Text>
          <Text style={styles.tagline}>BaeBae · 사랑도 배로, 저축도 배로</Text>
        </View>
      </View>

      {/* 하단 */}
      <View style={styles.bottomSection}>
        <View style={styles.dots}>
          {dotsOpacity.map((anim, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
          ))}
        </View>
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F7F3EE',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 160,
    paddingBottom: 60,
    zIndex: 999,
  },
  centerContent: { alignItems: 'center', gap: 24 },
  logoBg: {
    width: 114, height: 114,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    backgroundColor: '#F7F3EE',
  },
  baeMarkWrap: { width: 90, height: 48, position: 'relative' },
  circle: { position: 'absolute', width: 48, height: 48, borderRadius: 24 },
  leftCircle:  { backgroundColor: '#3D8A5A', left: 0 },
  rightCircle: { backgroundColor: '#D95F4B', left: 30 },
  innerCircle: {
    position: 'absolute', width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', top: 9,
  },
  leftInner:  { backgroundColor: '#EDF7F2', left: 9 },
  rightInner: { backgroundColor: '#FDF0ED', left: 39 },
  innerLetter: { fontSize: 11, fontWeight: '700', color: '#2C2C2A' },
  textBlock: { alignItems: 'center', gap: 8 },
  appName: { fontSize: 32, fontWeight: '700', color: '#2C2C2A', letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: '#1A1918' },
  bottomSection: { alignItems: 'center', gap: 16 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1A1918' },
  version: { fontSize: 11, color: '#1A1918' },
});
