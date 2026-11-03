import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';
import { webContainerStyle } from '@/constants/webstyles';

export default function NotificationDetailsScreen() {
  const { notificationId } = useLocalSearchParams();
  const [notification, setNotification] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotification = async () => {
      if (!notificationId) {
        router.back();
        return;
      }

      try {
        setIsLoading(true);
        const docRef = doc(db, 'notifications', notificationId as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          if (data.status !== 'read') {
            await updateDoc(docRef, { status: 'read' });
          }

          setNotification({
            id: docSnap.id,
            type: data.type,
            title: data.title,
            message: data.message || '',
            detailedMessage: data.detailedMessage || data.message || '',
            timestamp: data.timestamp?.toDate?.() || new Date(),
            bookingId: data.bookingId,
            senderName: data.senderName || data.sender || 'EH System',
          });
        } else {
          router.back();
        }
      } catch (error) {
        console.error('Error fetching notification:', error);
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotification();
  }, [notificationId]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!notification) return null;

  const formattedTime = notification.timestamp.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerSender}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(notification.senderName)}</Text>
          </View>
          <Text style={styles.headerName}>{notification.senderName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{notification.detailedMessage}</Text>
        </View>
        <Text style={styles.timeText}>{formattedTime}</Text>

        {notification.bookingId ? (
        <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => router.push(`/(managerapp)/booking-details?bookingId=${notification.bookingId}` as any)}
            activeOpacity={0.7}
        >
            <Text style={styles.linkText}>View Booking Details</Text>
        </TouchableOpacity>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerSender: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 4 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  headerName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  scrollContent: { padding: 16 },
  bubble: { backgroundColor: '#FFFFFF', borderRadius: 12, borderTopLeftRadius: 4, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', alignSelf: 'flex-start', maxWidth: '90%' },
  bubbleText: { fontSize: 14, color: '#111827', lineHeight: 22 },
  timeText: { fontSize: 12, color: '#9CA3AF', marginTop: 6, marginLeft: 4, marginBottom: 24 },
  linkContainer: { alignSelf: 'center', marginTop: 16, paddingVertical: 8, paddingHorizontal: 12 },
  linkText: { fontSize: 14, fontWeight: '600', color: '#5B21B6', textDecorationLine: 'underline' },
});