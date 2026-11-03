// backend/services/notificationServices.ts
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export const savePushToken = async (userId: string, token: string) => {
  try {
    await setDoc(doc(db, 'pushTokens', userId), {
      userId,
      token,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log('Push token saved for user:', userId);
  } catch (error) {
    console.error('Error saving push token:', error);
  }
};

export const sendPushNotification = async (
  recipientUserId: string,
  title: string,
  body: string,
  data: any = {}
) => {
  try {
    const q = query(collection(db, 'pushTokens'), where('userId', '==', recipientUserId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No push token found for user:', recipientUserId);
      return;
    }

    const token = querySnapshot.docs[0].data().token;
    const message = {
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data, 
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification sent:', result);
    
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};
const BACKEND_URL = 'https://bondless-python-floral.ngrok-free.dev';

export const triggerPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data: any = {}
) => {
  try {
    await fetch(`${BACKEND_URL}/api/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, body, data }),
    });
  } catch (error) {
    console.error('Push trigger error:', error);
  }
};

export const triggerPushToMultiple = async (
  userIds: string[],
  title: string,
  body: string,
  data: any = {}
) => {
  try {
    await fetch(`${BACKEND_URL}/api/send-push-many`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds, title, body, data }),
    });
  } catch (error) {
    console.error('Multi-push trigger error:', error);
  }
};