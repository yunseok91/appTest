import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

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
  InviteCode: undefined;
  HouseholdName: undefined;
  MainTabs: undefined;
  RenameHousehold: undefined;
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

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 12 }]}>
      {state.routes.map((route: any, index: number) => {
        const item = TAB_ITEMS[index];
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (item?.isCenter) {
          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.centerTabBtn} activeOpacity={0.85}>
              <View style={[styles.centerCircle, isFocused && styles.centerCircleActive]}>
                <Ionicons name="calendar-outline" size={24} color={colors.white} />
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabBtn} activeOpacity={0.7}>
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
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {user ? (
        <>
          <Stack.Screen name="MainTabs"        component={MainTabs} />
          <Stack.Screen name="RenameHousehold" component={RenameHouseholdScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login"         component={LoginScreen} />
          <Stack.Screen name="CoupleIcon"    component={CoupleIconScreen} />
          <Stack.Screen name="ProfileSetup"  component={ProfileSetupScreen} />
          <Stack.Screen name="InviteCode"    component={InviteCodeScreen} />
          <Stack.Screen name="HouseholdName" component={HouseholdNameScreen} />
        </>
      )}
    </Stack.Navigator>
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
    height: 80,
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
});
