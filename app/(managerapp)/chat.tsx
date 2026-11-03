// app/(managerapp)/chat.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, Image, PanResponder, Keyboard, Modal, BackHandler, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef, useEffect, useMemo } from 'react'; 
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Video, ResizeMode } from 'expo-av';
import { webContainerStyle } from '@/constants/webstyles';
import { useAuth } from '../../backend/context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, setDoc, increment, getDocs } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { triggerPushNotification } from '@/backend/services/notificationServices';

type MessageType = 'text' | 'image' | 'video';
type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  localTime?: string; 
  type: MessageType;
  imageUrl?: string;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
    type: MessageType;
  };
  deletedFor?: string[]; 
};
type PendingMedia = {
  uri: string;
  type: 'image' | 'video';
} | null;
type ChatInfo = {
  bookingId: string;
  customerId: string;
  customerName: string;
  hallName: string;
  eventDate: string;
  originalRequestId?: string; 
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { userData } = useAuth(); 
  const scrollViewRef = useRef<ScrollView>(null);
  const [, setTick] = useState(0); 
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [swipedMessageId, setSwipedMessageId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia>(null);
  const [mediaCaption, setMediaCaption] = useState('');
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showSelectionBar, setShowSelectionBar] = useState(false);  
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInfoLoaded, setChatInfoLoaded] = useState(false); 
  const [chatInfo, setChatInfo] = useState<ChatInfo>({
    bookingId: params.bookingId as string || params.requestId as string || '',
    customerId: params.customerId as string || '',
    customerName: 'Customer',
    hallName: 'Event Hall',
    eventDate: 'N/A',
  });
  const chatId = useMemo(() => {
    if (!userData?.uid || !chatInfo.customerId) return '';
    const specificChatId = chatInfo.originalRequestId || chatInfo.bookingId;
    if (!specificChatId) return '';
    const sortedUsers = [userData.uid, chatInfo.customerId].sort().join('_');
    return `${specificChatId}_${sortedUsers}`;
  }, [userData?.uid, chatInfo.customerId, chatInfo.bookingId, chatInfo.originalRequestId]);

  useEffect(() => {
  const fetchChatInfo = async () => {
    const currentId = String(params.bookingId || params.requestId || chatInfo.bookingId);
    if (!currentId || currentId === '1' || currentId === 'undefined') {
      setChatInfoLoaded(true); 
      return;
    }
    
    try {
      let docRef = doc(db, 'bookings', currentId);
      let docSnap = await getDoc(docRef);
      let isRequest = false;
      
      if (!docSnap.exists()) {
        docRef = doc(db, 'requests', currentId);
        docSnap = await getDoc(docRef);
        isRequest = true; 
      }
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setChatInfo(prev => ({
          ...prev,
          customerId: data.customerId || prev.customerId,
          customerName: data.customerName || 'Customer',
          hallName: data.hallName || 'Event Hall',
          eventDate: data.date || 'N/A',
          originalRequestId: data.originalRequestId || (isRequest ? currentId : prev.originalRequestId),
        }));
      }
      
      setChatInfoLoaded(true); 
    } catch (error) { 
      console.error("Error fetching chat info:", error);
      setChatInfoLoaded(true); 
    }
  };
  
  fetchChatInfo();
}, [params.bookingId, params.requestId, chatInfo.bookingId]);

  useEffect(() => {
    if (!chatId) return;
    const settingsRef = doc(db, 'chatSettings', chatId);
    const unsub = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsMuted(docSnap.data().muted || false);
      }
    });
    return () => unsub();
  }, [chatId]);

  const toggleMute = async () => {
    if (!chatId) {
      Alert.alert('Error', 'Chat information is missing.');
      return;
    }
    try {
      await setDoc(doc(db, 'chatSettings', chatId), { muted: !isMuted }, { merge: true });
      Alert.alert('Success', isMuted ? 'Chat Unmuted' : 'Chat Muted');
    } catch (error) {
      console.error("Mute error:", error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };
  useEffect(() => {
    const markChatNotificationsRead = async () => {
      if (!userData?.uid) return;

      const specificChatId = chatInfo.originalRequestId || chatInfo.bookingId;
      if (!specificChatId) return;

      try {
        const notifQuery = query(
          collection(db, 'notifications'),
          where('targetUserId', '==', userData.uid),
          where('targetRole', '==', 'manager'),
          where('type', '==', 'chats'),
          where('bookingId', '==', specificChatId)
        );

        const snap = await getDocs(notifQuery);

        await Promise.all(
          snap.docs.map((docSnap) =>
            updateDoc(doc(db, 'notifications', docSnap.id), {
              status: 'read',
              unreadCount: 0,
            })
          )
        );
      } catch (error) {
        console.log('Failed to mark manager chat notifications read:', error);
      }
    };

    markChatNotificationsRead();
  }, [
    userData?.uid,
    chatInfo.originalRequestId,
    chatInfo.bookingId
  ]);

 useEffect(() => {
  if (!chatInfoLoaded || !userData?.uid || !chatInfo.customerId || !chatId) {
    return;
  }
  
  const q = query(
    collection(db, 'messages'),
    where('chatId', '==', chatId),
    orderBy('timestamp', 'asc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const fetchedMessages: any[] = [];
    snapshot.forEach((d) => fetchedMessages.push({ id: d.id, ...d.data() }));
    setMessages(fetchedMessages);
    setIsLoading(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  });
  
  return () => unsubscribe();
}, [chatInfoLoaded, userData?.uid, chatInfo.customerId, chatId]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => { scrollViewRef.current?.scrollToEnd({ animated: true }); }, 100);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => { setTick(t => t + 1); });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    setTimeout(() => { scrollViewRef.current?.scrollToEnd({ animated: true }); }, 100);
  }, [messages, pendingMedia]);

  useEffect(() => {
    const backAction = () => {
      if (showSelectionBar) { cancelSelection(); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showSelectionBar]);

  const handleAttachmentPress = () => setShowMediaModal(true);

  const handleCameraPick = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission Required', 'Please allow camera access'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPendingMedia({ uri: result.assets[0].uri, type: result.assets[0].type as 'image' | 'video' });
      setMediaCaption('');
    }
  };

  const handleGalleryPick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission Required', 'Please allow gallery access'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPendingMedia({ uri: result.assets[0].uri, type: result.assets[0].type as 'image' | 'video' });
      setMediaCaption('');
    }
  };

  const handleCancelMedia = () => { setPendingMedia(null); setMediaCaption(''); };
  // const handleSendMedia = async () => {
  //   if (!pendingMedia || !userData?.uid || !chatInfo.customerId || !chatId) {
  //     Alert.alert('Error', 'Missing chat information.');
  //     return;
  //   }
  //   setIsUploading(true);
  //   try {
  //     const blob = await new Promise<Blob>((resolve, reject) => {
  //       const xhr = new XMLHttpRequest();
  //       xhr.onload = () => resolve(xhr.response);
  //       xhr.onerror = () => reject(new Error('Network request failed'));
  //       xhr.responseType = 'blob';
  //       xhr.open('GET', pendingMedia.uri, true);
  //       xhr.send(null);
  //     });

  //     const filename = `${userData.uid}_${Date.now()}.${pendingMedia.type === 'video' ? 'mp4' : 'jpg'}`;
  //     const storageRef = ref(getStorage(), `chat_media/${filename}`);
  //     await uploadBytes(storageRef, blob);
  //     const downloadURL = await getDownloadURL(storageRef);
  //     const localTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  //     await addDoc(collection(db, 'messages'), {
  //       chatId, senderId: userData.uid, receiverId: chatInfo.customerId,
  //       text: mediaCaption.trim(), type: pendingMedia.type, imageUrl: downloadURL,
  //       replyTo: replyingTo || null, bookingId: chatInfo.bookingId, localTime, timestamp: serverTimestamp(),
  //     });

  //     await addDoc(collection(db, 'notifications'), {
  //       senderId: userData.uid, targetUserId: chatInfo.customerId, targetRole: 'customer',
  //       title: userData?.name || 'Manager', message: `Sent you a ${pendingMedia.type} regarding ${chatInfo.hallName}`,
  //       type: 'chats', bookingId: chatInfo.bookingId, timestamp: serverTimestamp(), status: 'unread',
  //     });

  //     setPendingMedia(null); setMediaCaption(''); setReplyingTo(null);
  //   } catch (error) {
  //     console.error("Media upload error:", error);
  //     Alert.alert('Error', 'Failed to upload media.');
  //   } finally {
  //     setIsUploading(false);
  //   }
  // };

    const upsertChatNotification = async ({
    targetUserId,
    targetRole,
    senderId,
    senderName,
    hallName,
    message,
    bookingId,
    isSenderCopy = false,
  }: {
    targetUserId: string;
    targetRole: 'customer' | 'manager';
    senderId: string;
    senderName: string;
    hallName: string;
    message: string;
    bookingId: string;
    isSenderCopy?: boolean;
  }) => {
    const notifQuery = query(
      collection(db, 'notifications'),
      where('targetUserId', '==', targetUserId),
      where('targetRole', '==', targetRole),
      where('type', '==', 'chats'),
      where('bookingId', '==', bookingId)
    );

    const snap = await getDocs(notifQuery);

    if (!snap.empty) {
      const notifDoc = snap.docs[0];

      await updateDoc(doc(db, 'notifications', notifDoc.id), {
        senderId,
        senderName,
        hallName,
        title: senderName,
        message,
        lastMessage: message,
        timestamp: serverTimestamp(),
        status: isSenderCopy ? 'read' : 'unread',
        unreadCount: isSenderCopy ? 0 : increment(1),
      });
    } else {
      await addDoc(collection(db, 'notifications'), {
        senderId,
        senderName,
        hallName,
        targetUserId,
        targetRole,
        title: senderName,
        message,
        lastMessage: message,
        type: 'chats',
        bookingId,
        requestId: bookingId,
        timestamp: serverTimestamp(),
        status: isSenderCopy ? 'read' : 'unread',
        unreadCount: isSenderCopy ? 0 : 1,
      });
    }
  };
  const handleSendMessage = async () => {
    if (!chatInfoLoaded) {
      Alert.alert('Loading', 'Please wait while chat loads...');
      return;
    }
    
    if (!messageText.trim() || !userData?.uid || !chatInfo.customerId || !chatId) {
      Alert.alert('Error', 'Chat information incomplete. Please wait...');
      return;
    }
    const textToSend = messageText.trim();
    const currentReplyingTo = replyingTo;
    const localTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const specificChatId = chatInfo.originalRequestId || chatInfo.bookingId;
    setMessageText('');
    setReplyingTo(null);

    try {
      await addDoc(collection(db, 'messages'), {
        chatId, 
        senderId: userData.uid, 
        receiverId: chatInfo.customerId,
        text: textToSend, 
        type: 'text', 
        replyTo: currentReplyingTo || null,
        bookingId: specificChatId,
        requestId: specificChatId, 
        localTime, 
        timestamp: serverTimestamp(),
      });

      // await addDoc(collection(db, 'notifications'), {
      //   senderId: userData.uid, 
      //   senderName: chatInfo.hallName || userData?.name || 'Manager', 
      //   hallName: chatInfo.hallName || '', 
      //   targetUserId: chatInfo.customerId, 
      //   targetRole: 'customer',
      //   title: chatInfo.hallName || userData?.name || 'Manager',  
      //   message: messageText.trim(), 
      //   lastMessage: messageText.trim(),
      //   type: 'chats', 
      //   bookingId: specificChatId, 
      //   requestId: specificChatId, 
      //   timestamp: serverTimestamp(), 
      //   status: 'unread',
      // });
      // await addDoc(collection(db, 'notifications'), {
      //   senderId: userData.uid, 
      //   targetUserId: chatInfo.customerId, 
      //   targetRole: 'customer',
      //   title: userData?.name || 'Manager', 
      //   message: messageText.trim(), 
      //   lastMessage: messageText.trim(),
      //   // message: `Sent you a message regarding ${chatInfo.hallName}`,
      //   type: 'chats', 
      //   bookingId: specificChatId, 
      //   requestId: specificChatId, 
      //   timestamp: serverTimestamp(), 
      //   status: 'unread',
      // });
      await upsertChatNotification({
        targetUserId: chatInfo.customerId,
        targetRole: 'customer',
        senderId: userData.uid,
        senderName: chatInfo.hallName || userData?.name || 'Manager',
        hallName: chatInfo.hallName || '',
        message: textToSend,
        bookingId: specificChatId,
        isSenderCopy: false,
      });

      await upsertChatNotification({
        targetUserId: userData.uid,
        targetRole: 'manager',
        senderId: chatInfo.customerId,
        senderName: chatInfo.customerName || 'Customer',
        hallName: chatInfo.hallName || '',
        message: textToSend,
        bookingId: specificChatId,
        isSenderCopy: true,
      });
      await triggerPushNotification(
        chatInfo.customerId,
        `${chatInfo.hallName || 'Manager'}`,
        textToSend.substring(0, 100) + (textToSend.length > 100 ? '...' : ''),
        { action: 'chat', bookingId: specificChatId, type: 'chats' }
      );
      
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleSendMedia = async () => {
    if (!pendingMedia || !userData?.uid || !chatInfo.customerId || !chatId) {
      Alert.alert('Error', 'Missing chat information.');
      return;
    }
    
    const currentPendingMedia = pendingMedia;
    const currentMediaCaption = mediaCaption.trim();
    const currentReplyingTo = replyingTo;
    const specificChatId = chatInfo.originalRequestId || chatInfo.bookingId;
    
    setPendingMedia(null);
    setMediaCaption('');
    setReplyingTo(null);
    setIsUploading(true);

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new Error('Network request failed'));
        xhr.responseType = 'blob';
        xhr.open('GET', currentPendingMedia.uri, true);
        xhr.send(null);
      });

      const filename = `${userData.uid}_${Date.now()}.${currentPendingMedia.type === 'video' ? 'mp4' : 'jpg'}`;
      const storageRef = ref(getStorage(), `chat_media/${filename}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      const localTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      await addDoc(collection(db, 'messages'), {
        chatId, 
        senderId: userData.uid, 
        receiverId: chatInfo.customerId,
        text: currentMediaCaption, 
        type: currentPendingMedia.type, 
        imageUrl: downloadURL,
        replyTo: currentReplyingTo || null, 
        bookingId: specificChatId, 
        requestId: specificChatId, 
        localTime, 
        timestamp: serverTimestamp(),
      });

      await addDoc(collection(db, 'notifications'), {
        senderId: userData.uid, 
        targetUserId: chatInfo.customerId, 
        targetRole: 'customer',
        title: userData?.name || 'Manager', 
        message: `Sent you a ${currentPendingMedia.type} regarding ${chatInfo.hallName}`,
        type: 'chats', 
        bookingId: specificChatId, 
        requestId: specificChatId, 
        timestamp: serverTimestamp(), 
        status: 'unread',
      });
      await triggerPushNotification(
        chatInfo.customerId,
        `${chatInfo.hallName || 'Manager'}`,
        `Sent you a ${currentPendingMedia.type}${currentMediaCaption ? ': ' + currentMediaCaption : ''}`,
        { action: 'chat', bookingId: specificChatId, type: 'chats' }
      );

    } catch (error) {
      console.error("Media upload error:", error);
      Alert.alert('Error', 'Failed to upload media.');
    } finally {
      setIsUploading(false);
    }
  };
  // const handleSendMessage = async () => {
  //   if (!messageText.trim() || !userData?.uid || !chatInfo.customerId || !chatId) return;
    
  //   const textToSend = messageText.trim();
  //   const currentReplyingTo = replyingTo;
  //   const localTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  //   const specificChatId = chatInfo.originalRequestId || chatInfo.bookingId;
  //   setMessageText('');
  //   setReplyingTo(null);

  //   try {
  //     await addDoc(collection(db, 'messages'), {
  //       chatId, 
  //       senderId: userData.uid, 
  //       receiverId: chatInfo.customerId,
  //       text: textToSend, 
  //       type: 'text', 
  //       replyTo: currentReplyingTo || null,
  //       bookingId: specificChatId,
  //       requestId: specificChatId, 
  //       localTime, 
  //       timestamp: serverTimestamp(),
  //     });

  //     const { getDocs } = require('firebase/firestore');
  //     const existingNotifQuery = query(
  //       collection(db, 'notifications'),
  //       where('bookingId', '==', specificChatId),
  //       where('type', '==', 'chats'),
  //       where('targetUserId', '==', chatInfo.customerId)
  //     );
      
  //     const existingNotifSnap = await getDocs(existingNotifQuery);
      
  //     if (!existingNotifSnap.empty) {
  //       const existingNotifDoc = existingNotifSnap.docs[0];
  //       await updateDoc(doc(db, 'notifications', existingNotifDoc.id), {
  //         lastMessage: textToSend,
  //         message: textToSend,
  //         timestamp: serverTimestamp(),
  //         status: 'unread',
  //         unreadCount: increment(1),
  //         senderName: chatInfo.hallName || userData?.name || 'Manager',
  //       });
  //     } else {
  //       await addDoc(collection(db, 'notifications'), {
  //         senderId: userData.uid, 
  //         senderName: chatInfo.hallName || userData?.name || 'Manager',
  //         hallName: chatInfo.hallName || '',
  //         targetUserId: chatInfo.customerId, 
  //         targetRole: 'customer',
  //         title: chatInfo.hallName || userData?.name || 'Manager',
  //         message: textToSend, 
  //         lastMessage: textToSend,
  //         type: 'chats', 
  //         bookingId: specificChatId, 
  //         requestId: specificChatId, 
  //         timestamp: serverTimestamp(), 
  //         status: 'unread',
  //         unreadCount: 1,
  //       });
  //     }
      
  //     const senderNotifQuery = query(
  //       collection(db, 'notifications'),
  //       where('bookingId', '==', specificChatId),
  //       where('type', '==', 'chats'),
  //       where('targetUserId', '==', userData.uid)
  //     );
      
  //     const senderNotifSnap = await getDocs(senderNotifQuery);
      
  //     if (!senderNotifSnap.empty) {
  //       const senderNotifDoc = senderNotifSnap.docs[0];
  //       await updateDoc(doc(db, 'notifications', senderNotifDoc.id), {
  //         lastMessage: textToSend,
  //         message: textToSend,
  //         timestamp: serverTimestamp(),
  //         status: 'read',
  //         senderName: chatInfo.hallName || userData?.name || 'Manager',
  //       });
  //     } else {
  //       await addDoc(collection(db, 'notifications'), {
  //         senderId: userData.uid, 
  //         senderName: chatInfo.hallName || userData?.name || 'Manager',
  //         hallName: chatInfo.hallName || '',
  //         targetUserId: userData.uid,
  //         targetRole: 'manager',
  //         title: chatInfo.hallName || userData?.name || 'Manager',
  //         message: textToSend, 
  //         lastMessage: textToSend,
  //         type: 'chats', 
  //         bookingId: specificChatId, 
  //         requestId: specificChatId, 
  //         timestamp: serverTimestamp(), 
  //         status: 'read',
  //       });
  //     }
  //   } catch (error) {
  //     console.error('Error sending message:', error);
  //     Alert.alert('Error', 'Failed to send message');
  //   }
  // };
  const handleMessagePress = (message: Message) => {
    if (showSelectionBar) {
      if (selectedMessages.includes(message.id)) {
        const updated = selectedMessages.filter(id => id !== message.id);
        setSelectedMessages(updated);
        if (updated.length === 0) { setShowSelectionBar(false); }
      } else {
        setSelectedMessages([...selectedMessages, message.id]);
      }
    }
  };

  const handleLongPress = (message: Message) => {
    if (!selectedMessages.includes(message.id)) {
      setSelectedMessages([...selectedMessages, message.id]);
      setShowSelectionBar(true);
    }
  };

  const handleCopyMessage = async () => {
    const textToCopy = messages.filter(m => selectedMessages.includes(m.id)).map(m => m.text).join('\n');    
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      Alert.alert('Copied', 'Message copied to clipboard');
    }   
    setSelectedMessages([]); setShowSelectionBar(false);
  };

  const handleDeleteMessages = async () => {
    Alert.alert(
      'Delete Messages',
      `Delete ${selectedMessages.length} message(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatePromises = selectedMessages.map(id => 
              updateDoc(doc(db, 'messages', id), {
                deletedFor: arrayUnion(userData?.uid || '') 
              })
            );
            await Promise.all(updatePromises);
            setSelectedMessages([]);
            setShowSelectionBar(false);
          }
        }
      ]
    );
  };

  const handleReplyToSelected = () => {
    const selectedMsg = messages.find(m => selectedMessages[0] === m.id);
    if (selectedMsg) { setReplyingTo(selectedMsg); setSelectedMessages([]); setShowSelectionBar(false); }
  };

  const cancelSelection = () => { setSelectedMessages([]); setShowSelectionBar(false); };
  const handleSelectAll = () => { setSelectedMessages(messages.map(m => m.id)); setShowSelectionBar(true); setShowMenu(false); };

  const createPanResponder = (message: Message) => {
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let pressStartTime = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true, 
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => { pressStartTime = Date.now(); pressTimer = setTimeout(() => handleLongPress(message), 500); },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 15 || Math.abs(g.dy) > 15) { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }
        if (g.dx > 30 && selectedMessages.length === 0 && !showSelectionBar) setSwipedMessageId(message.id);
      },
      onPanResponderRelease: (_, g) => {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        const pressDuration = Date.now() - pressStartTime;
        if (g.dx > 60 && selectedMessages.length === 0 && !showSelectionBar) {
          setReplyingTo(message);
        } else if (showSelectionBar && pressDuration < 400 && Math.abs(g.dx) < 20 && Math.abs(g.dy) < 20) {
          handleMessagePress(message);
        }
        setSwipedMessageId(null);
      },
      onPanResponderTerminate: () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } setSwipedMessageId(null); }
    });
  };

  const handleMenuAction = (action: string) => {
    setShowMenu(false);    
    switch (action) {
      case 'mute':
        toggleMute(); 
        break;
     case 'clear':
        Alert.alert('Clear Chat', 'All messages will delete for you. Clear all messages?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: async () => {
              setMessages([]); 
              const clearPromises = messages.map(msg =>
                updateDoc(doc(db, 'messages', msg.id), {
                  deletedFor: arrayUnion(userData?.uid || '')
                })
              );
              await Promise.all(clearPromises);
            }
          }
        ]);
        break;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
          <ActivityIndicator size="large" color="#5B21B6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior= "padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#111827" /></TouchableOpacity>            
            <View style={styles.headerInfo}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{chatInfo.customerName.charAt(0)}</Text></View>              
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerName}>{chatInfo.customerName}</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionBtn} onPress={() => setShowMenu(!showMenu)}>
              <Ionicons name="ellipsis-vertical" size={22} color="#111827" />
            </TouchableOpacity>
          </View>
        </View>

        {showMenu && (
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); toggleMute(); }}>
                <Ionicons name={isMuted ? "notifications-outline" : "notifications-off-outline"} size={18} color="#111827" />
                <Text style={styles.menuItemText}>{isMuted ? 'Unmute Notifications' : 'Mute Notifications'}</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuAction('clear')}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" /><Text style={styles.menuItemTextDestructive}>Clear Chat</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.requestBanner}
          onPress={() => {
            const targetId = chatInfo.originalRequestId || params.requestId || chatInfo.bookingId;
            router.push({ 
              pathname: '/(managerapp)/request-details' as any, 
              params: { requestId: targetId, id: targetId } 
            });
          }}
          activeOpacity={0.7} 
        >
          <Ionicons name="calendar-outline" size={16} color="#5B21B6" />
          <Text style={styles.requestBannerText}>Request: {chatInfo.hallName} • {chatInfo.eventDate}</Text>
          <Ionicons name="chevron-forward" size={16} color="#5B21B6" style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <ScrollView ref={scrollViewRef} style={styles.messagesContainer} contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.dateSeparator}><View style={styles.dateLine} /><Text style={styles.dateText}>Today</Text><View style={styles.dateLine} /></View>
          
          {messages
            .filter(message => !message.deletedFor?.includes(userData?.uid || '')) 
            .map((message) => {
              const isManager = message.senderId === userData?.uid;
              const isSelected = selectedMessages.includes(message.id);
              return (
                <View key={message.id} style={[styles.messageRow, isManager ? styles.messageRowRight : styles.messageRowLeft, swipedMessageId === message.id && styles.messageSwiped, isSelected && styles.messageSelected]} {...createPanResponder(message).panHandlers}>
                  <View style={[styles.messageBubble, isManager ? styles.managerBubble : styles.customerBubble, (message.type === 'image' || message.type === 'video') && (isManager ? styles.imageBubbleManager : styles.imageBubbleCustomer)]}>
                    {message.replyTo && (
                      <View style={[styles.replyPreview, isManager ? styles.replyPreviewManager : styles.replyPreviewCustomer]}>
                        <Text style={[styles.replyPreviewName, { color: message.replyTo.senderId === userData?.uid ? '#FFFFFF' : '#5B21B6' }]}>
                          {message.replyTo.senderId === userData?.uid ? 'You' : chatInfo.customerName}
                        </Text>
                        <Text style={[styles.replyPreviewText, isManager ? styles.replyPreviewTextManager : styles.replyPreviewTextCustomer]} numberOfLines={1}>
                          {message.replyTo.text || (message.replyTo.type === 'video' ? '🎥 Video' : '📷 Photo')}
                        </Text>
                      </View>
                    )}
                    
                    {message.type === 'video' && message.imageUrl ? (
                      <TouchableOpacity onPress={() => router.push({ pathname: '/(managerapp)/media-viewer' as any, params: { mediaFiles: JSON.stringify([{ uri: message.imageUrl, type: 'video' }]), index: '0' } })} activeOpacity={0.9}>
                        <View style={styles.videoMessageContainer}>
                          <Image source={{ uri: message.imageUrl }} style={styles.videoThumbnail} resizeMode="cover" />
                          <View style={styles.videoPlayOverlay}><Ionicons name="play-circle" size={50} color="#FFFFFF" /></View>
                          <View style={styles.videoDurationBadge}><Ionicons name="videocam" size={12} color="#FFFFFF" /><Text style={styles.videoDurationText}>Video</Text></View>
                        </View>
                        {message.text ? <Text style={[styles.messageText, styles.imageCaption, isManager ? styles.managerText : styles.customerText]}>{message.text}</Text> : null}
                      </TouchableOpacity>
                    ) : message.type === 'image' && message.imageUrl ? (                
                      <TouchableOpacity onPress={() => router.push({ pathname: '/(managerapp)/media-viewer' as any, params: { mediaFiles: JSON.stringify([{ uri: message.imageUrl, type: 'image' }]), index: '0' } })} activeOpacity={0.9}>
                        <Image source={{ uri: message.imageUrl }} style={styles.messageImage} resizeMode="cover" />
                        {message.text ? <Text style={[styles.messageText, styles.imageCaption, isManager ? styles.managerText : styles.customerText]}>{message.text}</Text> : null}
                      </TouchableOpacity>
                    ) : (
                      <Text style={[styles.messageText, isManager ? styles.managerText : styles.customerText]}>{message.text}</Text>
                    )}
                    
                    <View style={[styles.messageFooter, message.type !== 'text' && styles.messageFooterOverlay]}>
                      <Text style={[styles.messageTime, message.type !== 'text' && isManager && styles.messageTimeOnImage]}>
                        {message.localTime || (message.timestamp?.seconds ? new Date(message.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...')}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          <View style={{ height: 20 }} />
        </ScrollView>

        {replyingTo && !showSelectionBar && (
          <View style={styles.replyBar}>
            <View style={styles.replyBarContent}>
              <Ionicons name="arrow-undo" size={16} color="#5B21B6" />
              <View style={styles.replyBarTextContainer}>
                <Text style={styles.replyBarName}>Replying to {replyingTo.senderId === userData?.uid ? 'yourself' : chatInfo.customerName}</Text>
                <Text style={styles.replyBarText} numberOfLines={1}>{replyingTo.text || (replyingTo.type === 'video' ? '🎥 Video' : '📷 Photo')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}><Ionicons name="close" size={20} color="#6B7280" /></TouchableOpacity>
          </View>
        )}

        <Modal visible={!!pendingMedia} animationType="slide" transparent={false}>
          <SafeAreaView style={[styles.mediaPreviewScreen, webContainerStyle]}>
            <View style={styles.mediaPreviewHeader}>
              <TouchableOpacity style={styles.mediaPreviewBtn} onPress={handleCancelMedia}><Ionicons name="close" size={24} color="#FFFFFF" /></TouchableOpacity>              
              <Text style={styles.mediaPreviewTitle}>Preview</Text><View style={{ width: 40 }} />
            </View>
            <View style={styles.mediaPreviewContent}>
              {pendingMedia?.type === 'video' ? (
                <Video source={{ uri: pendingMedia.uri }} style={styles.mediaPreviewVideo} useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay />
              ) : (
                <Image source={{ uri: pendingMedia?.uri }} style={styles.mediaPreviewImageLarge} resizeMode="contain" />
              )}
            </View>
            <View style={styles.mediaPreviewFooter}>
              <View style={styles.mediaPreviewInputRow}>
                <TextInput style={styles.mediaCaptionInputLarge} placeholder="Add a caption..." placeholderTextColor="#9CA3AF" value={mediaCaption} onChangeText={setMediaCaption} multiline maxLength={500} />
                <TouchableOpacity style={styles.mediaPreviewSendBtn} onPress={handleSendMedia} disabled={isUploading}>
                  {isUploading ? <ActivityIndicator color="#FFF" /> : <Ionicons name="send" size={22} color="#FFFFFF" />}
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        <Modal visible={showMediaModal} transparent animationType="fade" onRequestClose={() => setShowMediaModal(false)}>
          <TouchableOpacity style={styles.mediaModalOverlay} activeOpacity={1} onPress={() => setShowMediaModal(false)}>
            <TouchableOpacity style={styles.mediaModalContent} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.mediaModalTitle}>Add Media</Text>
              <Text style={styles.mediaModalSubtitle}>Choose a source</Text>            
              <TouchableOpacity style={styles.mediaModalOption} onPress={() => { setShowMediaModal(false); handleCameraPick(); }}>
                <View style={styles.mediaModalIcon}><Ionicons name="camera" size={24} color="#5B21B6" /></View>
                <View style={styles.mediaModalTextContainer}><Text style={styles.mediaModalOptionTitle}>Take Photo or Video</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaModalOption} onPress={() => { setShowMediaModal(false); handleGalleryPick(); }}>
                <View style={styles.mediaModalIcon}><Ionicons name="images" size={24} color="#5B21B6" /></View>
                <View style={styles.mediaModalTextContainer}><Text style={styles.mediaModalOptionTitle}>Choose from Gallery</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaModalCancel} onPress={() => setShowMediaModal(false)}><Text style={styles.mediaModalCancelText}>Cancel</Text></TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {showSelectionBar && (
          <View style={styles.selectionBar}>
            <TouchableOpacity style={styles.selectionBarBtn} onPress={cancelSelection}><Ionicons name="close" size={22} color="#FFFFFF" /></TouchableOpacity>            
            <Text style={styles.selectionBarCount}>{selectedMessages.length} selected</Text>           
            <View style={styles.selectionBarActions}>
              <TouchableOpacity style={styles.selectionBarActionBtn} onPress={handleCopyMessage}><Ionicons name="copy-outline" size={20} color="#FFFFFF" /></TouchableOpacity>              
              <TouchableOpacity style={styles.selectionBarActionBtn} onPress={handleDeleteMessages}><Ionicons name="trash-outline" size={20} color="#FFFFFF" /></TouchableOpacity>
            </View>
          </View>
        )}

        {!pendingMedia && !showSelectionBar && (
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton} onPress={handleAttachmentPress}><Ionicons name="attach" size={22} color="#6B7280" /></TouchableOpacity>
            <TextInput style={styles.input} placeholder="Type a message..." placeholderTextColor="#9CA3AF" value={messageText} onChangeText={setMessageText} multiline maxLength={1000} />
            <TouchableOpacity style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]} onPress={handleSendMessage} disabled={!messageText.trim()}>
              <Ionicons name="send" size={20} color={messageText.trim() ? '#FFFFFF' : '#9CA3AF'} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView> 
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#5B21B6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  headerTextContainer: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerActionBtn: { padding: 8 },
  menuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 },
  menuContainer: { position: 'absolute', top: 60, right: 16, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 8, width: 220, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8, zIndex: 100 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  menuItemText: { fontSize: 14, color: '#111827', fontWeight: '500' },
  menuItemTextDestructive: { fontSize: 14, color: '#EF4444', fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  requestBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E9D5FF' },
  requestBannerText: { fontSize: 12, color: '#5B21B6', fontWeight: '500', flex: 1 },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16 },
  dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  dateLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dateText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  messageRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end', gap: 8 },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  messageSwiped: { transform: [{ translateX: 20 }] },
  messageSelected: { opacity: 0.7 },
  messageBubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  managerBubble: { backgroundColor: '#5B21B6', borderBottomRightRadius: 4 },
  customerBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F3F4F6' },
  imageBubbleManager: { backgroundColor: 'transparent', padding: 0, overflow: 'hidden' },
  imageBubbleCustomer: { backgroundColor: 'transparent', padding: 0, borderWidth: 0, overflow: 'hidden' },
  messageText: { fontSize: 15, lineHeight: 20 },
  managerText: { color: '#FFFFFF' },
  customerText: { color: '#111827' },
  imageCaption: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.3)' },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  messageFooterOverlay: { position: 'absolute', bottom: 8, right: 12, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginTop: 0 },
  messageTime: { fontSize: 10, color: '#9CA3AF' },
  messageTimeOnImage: { color: '#FFFFFF' },
  replyPreview: { padding: 8, borderRadius: 8, marginBottom: 6, borderLeftWidth: 3 },
  replyPreviewManager: { backgroundColor: 'rgba(255,255,255,0.15)', borderLeftColor: '#FFFFFF' },
  replyPreviewCustomer: { backgroundColor: '#F5F3FF', borderLeftColor: '#5B21B6' },
  replyPreviewName: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  replyPreviewText: { fontSize: 12 },
  replyPreviewTextManager: { color: 'rgba(255,255,255,0.9)' },
  replyPreviewTextCustomer: { color: '#6B7280' },
  messageImage: { width: 220, height: 220, borderRadius: 12 },
  typingIndicator: { flexDirection: 'row', gap: 4, paddingVertical: 8 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9CA3AF' },
  typingDot1: { opacity: 0.4 },
  typingDot2: { opacity: 0.7 },
  typingDot3: { opacity: 1 },
  replyBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#E9D5FF', gap: 12 },
  replyBarContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  replyBarTextContainer: { flex: 1 },
  replyBarName: { fontSize: 12, color: '#5B21B6', fontWeight: '600' },
  replyBarText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  videoMessageContainer: { width: 220, height: 220, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  videoThumbnail: { width: '100%', height: '100%' },
  videoPlayOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  videoDurationBadge: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  videoDurationText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  mediaPreviewScreen: { flex: 1, backgroundColor: '#000000' },
  mediaPreviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16, backgroundColor: 'rgba(0,0,0,0.8)' },
  mediaPreviewBtn: { padding: 8 },
  mediaPreviewTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  mediaPreviewContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mediaPreviewImageLarge: { width: '100%', height: '100%' },
  mediaPreviewVideo: { width: '100%', height: '100%' },
  mediaPreviewFooter: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.8)' },
  mediaPreviewInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  mediaCaptionInputLarge: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#FFFFFF', maxHeight: 80 },
  mediaPreviewSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#5B21B6', justifyContent: 'center', alignItems: 'center' },
  selectionBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#5B21B6', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  selectionBarBtn: { padding: 8 },
  selectionBarCount: { flex: 1, fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  selectionBarActions: { flexDirection: 'row', gap: 16 },
  selectionBarActionBtn: { padding: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 8 },
  inputContainerWithKeyboard: { paddingBottom: 4 },
  attachButton: { padding: 8 },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827', maxHeight: 100 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#5B21B6', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#E5E7EB' },
  mediaModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  mediaModalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  mediaModalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 4 },
  mediaModalSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  mediaModalOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  mediaModalIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  mediaModalTextContainer: { flex: 1 },
  mediaModalOptionTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  mediaModalOptionSubtitle: { fontSize: 12, color: '#6B7280' },
  mediaModalCancel: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  mediaModalCancelText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
});