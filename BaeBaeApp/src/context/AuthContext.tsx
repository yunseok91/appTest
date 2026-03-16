import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type GoogleUser = {
  id: string;
  name: string;
  email: string;
  picture: string;
};

type AuthContextType = {
  user: GoogleUser | null;
  isLoading: boolean;
  householdName: string;
  signIn: (user: GoogleUser) => Promise<void>;
  signOut: () => Promise<void>;
  setHouseholdName: (name: string) => Promise<void>;
};

const DEFAULT_HOUSEHOLD = '우리 가계부';

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  householdName: DEFAULT_HOUSEHOLD,
  signIn: async () => {},
  signOut: async () => {},
  setHouseholdName: async () => {},
});

const STORAGE_KEY = '@baebae_user';
const HOUSEHOLD_KEY = '@baebae_household';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [householdName, setHouseholdNameState] = useState(DEFAULT_HOUSEHOLD);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(HOUSEHOLD_KEY),
    ]).then(([userVal, houseVal]) => {
      if (userVal) setUser(JSON.parse(userVal));
      if (houseVal) setHouseholdNameState(houseVal);
      setIsLoading(false);
    });
  }, []);

  const signIn = async (googleUser: GoogleUser) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser));
    setUser(googleUser);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const setHouseholdName = async (name: string) => {
    const value = name.trim() || DEFAULT_HOUSEHOLD;
    await AsyncStorage.setItem(HOUSEHOLD_KEY, value);
    setHouseholdNameState(value);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, householdName, signIn, signOut, setHouseholdName }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
