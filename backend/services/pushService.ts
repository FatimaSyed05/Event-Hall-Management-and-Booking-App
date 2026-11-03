import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const WEB_FIREBASE_CONFIG = {
 apiKey: "AIzaSyC0WGt0mdrmLLr1fx8iuTcMCUWdmNeBV9k",
  authDomain: "eventhallapp-e9546.firebaseapp.com",
  projectId: "eventhallapp-e9546",
  storageBucket: "eventhallapp-e9546.firebasestorage.app",
  messagingSenderId: "239233146037",
  appId: "1:239233146037:web:733909b343b260a56472fc"
};
const WEB_VAPID_KEY = "BNGwGrSqH03PpAfaBMpvQSuKXLsuuaW2b1ce4tyzNcYTe1DIrHmNIKiYa7fddciuJ8BuyC4HaiZOMgrwys1RNeI";

const saveToken = async (userId: string, token: string) => {
  await setDoc(doc(db, 'pushTokens', userId), {
    userId,
    token,
    platform: Platform.OS,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  console.log(`Push token saved (${Platform.OS}):`, userId);
};

export const registerPushToken = async (userId: string) => {
  try {
    let token = '';

    if (Platform.OS === 'web') {
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getMessaging, getToken } = await import('firebase/messaging');

      const app = getApps().length ? getApp() : initializeApp(WEB_FIREBASE_CONFIG);
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      token = await getToken(getMessaging(app), { vapidKey: WEB_VAPID_KEY });

    } else if (Platform.OS === 'android' || Platform.OS === 'ios') {
      
      const isExpoGo = Constants.appOwnership === 'expo';

      if (isExpoGo) {
        console.log('Expo Go detected — push notifications works in dev build');
        return;   
      }

      try {
        const messagingModule = require('@react-native-firebase/messaging');
        const messaging = messagingModule.default || messagingModule;

        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('Mobile notification permission denied');
          return;
        }

        token = await messaging().getToken();
        console.log('Mobile FCM Token:', token);

        messaging().onTokenRefresh((newToken: string) => {
          saveToken(userId, newToken);
        });
      } catch (error) {
        console.log('Push notifications: Development build required');
      }
    }

    if (token) await saveToken(userId, token);

  } catch (error) {
    console.error('Push registration error:', error);
  }
};