import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// @ts-ignore — getReactNativePersistence types vary by firebase version
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAd9jwhaifbGCXn7EmcwFl_3IKd812sX4Q',
  authDomain: 'baebae-3cbbc.firebaseapp.com',
  projectId: 'baebae-3cbbc',
  storageBucket: 'baebae-3cbbc.firebasestorage.app',
  messagingSenderId: '476537137658',
  appId: '1:476537137658:web:7411d4113e04d7ed305c43',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
