import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Dimensions, StatusBar, Modal, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { colors, fonts } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { navigationRef } from './navigationRef';

import LoginScreen from '../screens/LoginScreen';
import CoupleIconScreen from '../screens/CoupleIconScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import InviteCodeScreen from '../screens/InviteCodeScreen';
import HouseholdNameScreen from '../screens/HouseholdNameScreen';
import RenameHouseholdScreen from '../screens/RenameHouseholdScreen';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import CalendarScreen from '../screens/CalendarScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import MyPageScreen from '../screens/MyPageScreen';

export type RootStackParamList = {
  Login: undefined;
  CoupleIcon: undefined;
  ProfileSetup: { type: 'couple'; gender: 'male' | 'female' };
  InviteCode: { initialCode?: string } | undefined;
  HouseholdName: { isConnected?: boolean; gender?: 'male' | 'female' } | undefined;
  MainTabs: undefined;
  RenameHousehold: undefined;
  PartnerInvite: { initialCode?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const TAB_ITEMS = [
  { name: 'Home',       icon: 'home',      label: '홈' },
  { name: 'History',    icon: 'list',      label: '내역' },
  { name: 'Calendar',   icon: 'calendar',  label: '캘린더', isCenter: true },
  { name: 'Statistics', icon: 'bar-chart', label: '통계' },
  { name: 'MyPage',     icon: 'person',    label: '마이' },
];

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  // edge-to-edge 모드에서 insets.bottom이 0으로 오는 경우 Dimensions 차이로 fallback 계산
  const androidNavBarHeight = Platform.OS === 'android'
    ? Math.max(0, Dimensions.get('screen').height - Dimensions.get('window').height - (StatusBar.currentHeight ?? 0))
    : 0;
  const bottomInset = Math.max(insets.bottom, androidNavBarHeight);

  return (
    <View style={[styles.tabBar, { paddingBottom: bottomInset + 12 }]}>
      {state.routes.map((route: any, index: number) => {
        const item = TAB_ITEMS[index];
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (item?.isCenter) {
          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.centerTabBtn} activeOpacity={0.85}
              accessibilityLabel={item?.label}>
              <View style={[styles.centerCircle, isFocused && styles.centerCircleActive]}>
                <Ionicons name="calendar-outline" size={24} color={colors.white} />
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabBtn} activeOpacity={0.7}
            accessibilityLabel={item?.label}>
            <Ionicons
              name={(isFocused ? item?.icon : `${item?.icon}-outline`) as any}
              size={22}
              color={isFocused ? colors.primary : colors.inactive}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home"       component={HomeScreen} />
      <Tab.Screen name="History"    component={HistoryScreen} />
      <Tab.Screen name="Calendar"   component={CalendarScreen} />
      <Tab.Screen name="Statistics" component={StatisticsScreen} />
      <Tab.Screen name="MyPage"     component={MyPageScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isLoading, isOnboarded, partnerName, partnerConnectedAlert, clearPartnerAlert, partnerDisconnectedAlert, clearPartnerDisconnectedAlert, partnerBudgetAlert, clearPartnerBudgetAlert, forcedLogoutAlert, clearForcedLogoutAlert } = useAuth();
  const prevIsOnboarded = useRef(isOnboarded);

  // 딥링크 pending 코드 — cold-start 시 user 로딩 전에 URL이 도착하면 여기 저장
  const pendingInviteCode = useRef<string | null>(null);

  const navigateInvite = (code: string): boolean => {
    if (!navigationRef.isReady() || !user) return false;
    if (isOnboarded) {
      navigationRef.navigate('PartnerInvite', { initialCode: code });
    } else {
      navigationRef.navigate('InviteCode', { initialCode: code });
    }
    return true;
  };

  // user/isOnboarded 확정 후 pending 코드 처리 (cold-start 대응)
  useEffect(() => {
    if (pendingInviteCode.current && user && !isLoading) {
      const ok = navigateInvite(pendingInviteCode.current);
      if (ok) pendingInviteCode.current = null;
    }
  }, [user, isOnboarded, isLoading]);

  // 딥링크 리스너 — 앱 최초 1회 등록
  useEffect(() => {
    const handleUrl = (url: string) => {
      const parsed = Linking.parse(url);
      if (parsed.path !== 'invite') return;
      const code = parsed.queryParams?.code ? String(parsed.queryParams.code) : undefined;
      if (!code) return;
      // 즉시 이동 가능하면 이동, 아니면 pending에 저장 (user 로딩 후 처리)
      const ok = navigateInvite(code);
      if (!ok) pendingInviteCode.current = code;
    };

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    Linking.getInitialURL().then(url => { if (url) handleUrl(url); });
    return () => sub.remove();
  }, []); // 리스너는 마운트 시 1회만 등록

  useEffect(() => {
    if (user && isOnboarded && !prevIsOnboarded.current) {
      // 온보딩 완료 → 메인으로 강제 reset (render 이후 실행 보장)
      if (navigationRef.isReady()) {
        navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] }));
      }
    }
    prevIsOnboarded.current = isOnboarded;
  }, [isOnboarded, user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
    <Modal visible={forcedLogoutAlert} transparent animationType="fade">
      <View style={styles.alertDim}>
        <View style={styles.alertCard}>
          <Text style={styles.alertEmoji}>🔒</Text>
          <Text style={styles.alertTitle}>다른 기기에서 로그인</Text>
          <Text style={styles.alertSub}>다른 기기에서 로그인되어{'\n'}현재 기기에서 로그아웃됩니다.</Text>
          <TouchableOpacity
            style={styles.alertBtn}
            onPress={clearForcedLogoutAlert}
            activeOpacity={0.85}
          >
            <Text style={styles.alertBtnText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    <Modal visible={partnerDisconnectedAlert} transparent animationType="fade" onRequestClose={clearPartnerDisconnectedAlert}>
      <View style={styles.alertDim}>
        <View style={styles.alertCard}>
          <Text style={styles.alertEmoji}>💔</Text>
          <Text style={styles.alertTitle}>연결이 끊어졌어요</Text>
          <Text style={styles.alertSub}>상대방이 연결을 끊었습니다.</Text>
          <TouchableOpacity
            style={styles.alertBtn}
            onPress={clearPartnerDisconnectedAlert}
            activeOpacity={0.85}
          >
            <Text style={styles.alertBtnText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    <Modal visible={partnerBudgetAlert} transparent animationType="fade" onRequestClose={clearPartnerBudgetAlert}>
      <View style={styles.alertDim}>
        <View style={styles.alertCard}>
          <Text style={styles.alertEmoji}>💰</Text>
          <Text style={styles.alertTitle}>예산이 설정됐어요</Text>
          <Text style={styles.alertSub}>파트너가 이번 달 예산을 설정했습니다.</Text>
          <TouchableOpacity style={styles.alertBtn} onPress={clearPartnerBudgetAlert} activeOpacity={0.85}>
            <Text style={styles.alertBtnText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    <Modal visible={partnerConnectedAlert} transparent animationType="fade" onRequestClose={clearPartnerAlert}>
      <View style={styles.alertDim}>
        <View style={styles.alertCard}>
          <View style={styles.alertIconBg}>
            <Ionicons name="checkmark-circle" size={32} color="#3D8A5A" />
          </View>
          <Text style={styles.alertTitle}>연결 되었습니다! 🎉</Text>
          <Text style={styles.alertSub}>{partnerName ? `${partnerName}님과 성공적으로 연결됐어요.` : '파트너와 성공적으로 연결됐어요.'}</Text>
          <Text style={styles.alertNotice}>예산 설정과 가계명이 초기화됩니다.</Text>
          <TouchableOpacity
            style={styles.alertBtn}
            onPress={() => {
              clearPartnerAlert();
              // iOS Modal fade-out 애니메이션(~300ms) 후 navigate — 그 전에 dispatch하면 iOS에서 씹힘
              setTimeout(() => {
                if (!navigationRef.isReady()) return;
                if (isOnboarded) {
                  // A유저: 이미 MainTabs이지만 iOS blank 방지용 reset
                  navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] }));
                } else {
                  // B유저: 온보딩 완료를 위해 HouseholdName으로
                  navigationRef.dispatch(CommonActions.navigate('HouseholdName', { isConnected: true }));
                }
              }, 350);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.alertBtnText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    <Stack.Navigator
      key={user ? (isOnboarded ? 'onboarded' : 'onboarding') : 'auth'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: Platform.OS === 'android' ? 220 : undefined,
        gestureEnabled: Platform.OS === 'ios',
      }}
    >
      {user && isOnboarded ? (
        // 로그인 + 온보딩 완료 → 메인
        <>
          <Stack.Screen name="MainTabs"        component={MainTabs} />
          <Stack.Screen name="RenameHousehold" component={RenameHouseholdScreen} />
          <Stack.Screen name="PartnerInvite"   component={InviteCodeScreen} />
        </>
      ) : user && !isOnboarded ? (
        // 로그인했지만 온보딩 미완료 → 온보딩 플로우
        <>
          <Stack.Screen name="CoupleIcon"    component={CoupleIconScreen} />
          <Stack.Screen name="ProfileSetup"  component={ProfileSetupScreen} />
          <Stack.Screen name="InviteCode"    component={InviteCodeScreen} />
          <Stack.Screen name="HouseholdName" component={HouseholdNameScreen} />
        </>
      ) : (
        // 미로그인 → 로그인
        <>
          <Stack.Screen name="Login"         component={LoginScreen} />
          <Stack.Screen name="CoupleIcon"    component={CoupleIconScreen} />
          <Stack.Screen name="ProfileSetup"  component={ProfileSetupScreen} />
          <Stack.Screen name="InviteCode"    component={InviteCodeScreen} />
          <Stack.Screen name="HouseholdName" component={HouseholdNameScreen} />
        </>
      )}
    </Stack.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    alignItems: 'center',
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerTabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -18 },
  centerCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  centerCircleActive: { backgroundColor: '#2D6E47' },
  alertDim: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  alertCard: { width: '80%', backgroundColor: colors.card, borderRadius: 20, padding: 28, alignItems: 'center', gap: 8 },
  alertEmoji: { fontSize: 48, marginBottom: 4 },
  alertIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  alertTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  alertSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  alertNotice: { fontFamily: fonts.regular, fontSize: 12, color: colors.error, textAlign: 'center' },
  alertBtn: { marginTop: 12, backgroundColor: colors.primary, borderRadius: 100, width: '100%', height: 48, alignItems: 'center', justifyContent: 'center' },
  alertBtnText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.white },
});
