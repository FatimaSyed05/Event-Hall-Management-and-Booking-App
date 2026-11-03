// backend/config/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
// @ts-ignore 
import { getAuth, setPersistence, inMemoryPersistence } from 'firebase/auth';

import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyC0WGt0mdrmLLr1fx8iuTcMCUWdmNeBV9k",
  authDomain: "eventhallapp-e9546.firebaseapp.com",
  projectId: "eventhallapp-e9546",
  storageBucket: "eventhallapp-e9546.firebasestorage.app",
  messagingSenderId: "239233146037",
  appId: "1:239233146037:web:733909b343b260a56472fc"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

setPersistence(auth, inMemoryPersistence).catch((error) => {
  console.error("Firebase persistence error:", error);
});