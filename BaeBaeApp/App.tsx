import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { TransactionProvider } from './src/context/TransactionContext';
import { ProfileProvider } from './src/context/ProfileContext';
import SplashScreenView from './src/screens/SplashScreenView';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <ProfileProvider>
        <TransactionProvider>
          <SafeAreaProvider>
            <NavigationContainer>
              <StatusBar style="dark" />
              <AppNavigator />
              {showSplash && (
                <SplashScreenView onFinish={() => setShowSplash(false)} />
              )}
            </NavigationContainer>
          </SafeAreaProvider>
        </TransactionProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
