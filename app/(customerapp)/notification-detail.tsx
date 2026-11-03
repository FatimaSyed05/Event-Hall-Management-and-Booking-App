// app/(customerapp)/notification-detail.tsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { webContainerStyle } from '@/constants/webstyles';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';
import { useAuth } from '../../backend/context/AuthContext';

export default function NotificationDetailScreen() {
  const params = useLocalSearchParams();
  const { userData } = useAuth();
  const notificationId = params.id as string;
  
  const [detailData, setDetailData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const notifRef = doc(db, 'notifications', notificationId);
        const notifSnap = await getDoc(notifRef);
        
        if (!notifSnap.exists()) {
          setLoading(false);
          return;
        }

        const notifData: any = { id: notifSnap.id, ...notifSnap.data() };
        if (notifData.status !== 'read' && notifData.targetUserId === userData?.uid) {
          await updateDoc(notifRef, { status: 'read' }).catch(() => {});
        }

        let realHallName = notifData.hallName || 'Hall Manager';
        let realDate = notifData.date || 'the selected date';
        let realStatus = notifData.status || 'pending';
        let detailedMsg = notifData.detailedMessage || notifData.message;

        if (notifData.type === 'requests' && notifData.requestId) {
          try {
            const reqRef = doc(db, 'requests', notifData.requestId);
            const reqSnap = await getDoc(reqRef);
            if (reqSnap.exists()) {
              const reqData: any = reqSnap.data();
              realHallName = reqData.hallName || realHallName; 
              realDate = reqData.date || realDate;             
              realStatus = reqData.status || realStatus;       
            }
          } catch (err) {
            console.log("Request fetch failed, using notification data");
          }
        }

        if (!detailedMsg) {
          const managerSignOff = `Manager, ${realHallName}`;
          if (notifData.type === 'requests') {
            if (realStatus === 'accepted') {
              detailedMsg = `Assalam-o-Alaikum!\n\nYour booking request for ${realHallName} on ${realDate} has been ACCEPTED! 🎉\n\nWe are excited to host your event. Please proceed with the payment to confirm your booking.\n\nBest Regards,\n${managerSignOff}`;
            } else if (realStatus === 'rejected') {
              detailedMsg = `Assalam-o-Alaikum!\n\nWe regret to inform you that your request for ${realHallName} on ${realDate} could not be processed due to prior commitments.\n\nBest Regards,\n${managerSignOff}`;
            } else {
              detailedMsg = `Your booking request for ${realHallName} is currently pending.`;
            }
          } else if (notifData.type === 'payments') {
            detailedMsg = `Dear Customer,\n\nYour payment for ${realHallName} has been successfully received.\n\nRegards,\nPayment Department`;
          } else if (notifData.type === 'bookings') {
            detailedMsg = `Dear Customer,\n\nReminder for your upcoming event at ${realHallName} on ${realDate}.\n\nEventHall Team`;
          } else {
            detailedMsg = notifData.message || 'You have a new notification.';
          }
        }

        setDetailData({
          type: notifData.type,
          status: realStatus,
          hallName: realHallName,
          date: realDate,
          sender: notifData.senderName || (notifData.type === 'requests' ? realHallName : (notifData.sender || realHallName)),          message: detailedMsg,
          timestamp: notifData.timestamp,
          bookingId: notifData.bookingId || notifData.requestId,
          isAccepted: realStatus === 'accepted'
        });

      } catch (error) {
        console.error("Error fetching notification details:", error);
      } finally {
        setLoading(false); 
      }
    };

    fetchData();
  }, [notificationId, userData?.uid]);

  const getAvatarColor = (type: string, status: string) => {
    switch (type) {
      case 'requests': return status === 'accepted' ? '#10B981' : status === 'rejected' ? '#EF4444' : '#F59E0B';
      case 'payments': return '#3B82F6';
      case 'bookings': return '#8B5CF6';
      case 'chats': return '#5B21B6';
      default: return '#6B7280';
    }
  };

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', { 
      hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, webContainerStyle]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!detailData) {
    return (
      <SafeAreaView style={[styles.container, webContainerStyle]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={{ marginTop: 10, color: '#111827', fontWeight: '600', fontSize: 16 }}>Notification not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, backgroundColor: '#5B21B6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const avatarColor = getAvatarColor(detailData.type, detailData.status);
  const realBookingId = detailData.bookingId || '';

  return (
    <SafeAreaView style={[styles.container, webContainerStyle]} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>        
        <View style={[styles.headerAvatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.headerAvatarText}>{getInitials(detailData.sender)}</Text>
        </View>        
        <Text style={styles.headerTitle} numberOfLines={1}>{detailData.sender}</Text>
        <View style={{ width: 32 }} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bubbleWrapper}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{detailData.message}</Text>
          </View>
          <Text style={styles.timestamp}>
            {formatTimestamp(detailData.timestamp)}
          </Text>
        </View>
        
        {!detailData.isAccepted && (
          <View style={styles.noticeBox}>
            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.noticeText}>
              You cannot reply to this message.
            </Text>
          </View>
        )}
        
        {detailData.isAccepted && (
          <View style={styles.actionFooter}>
            <Text style={styles.footerText}>If you want more information </Text>
            <TouchableOpacity onPress={async () => {
              try {
                let docRef = doc(db, 'bookings', realBookingId);
                let docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                  docRef = doc(db, 'requests', realBookingId);
                  docSnap = await getDoc(docRef);
                }
                let chatId = realBookingId;
                if (docSnap.exists()) {
                  const data = docSnap.data();
                  chatId = data.originalRequestId || data.requestId || realBookingId;
                }
                
                router.push(`/(customerapp)/chat?bookingId=${chatId}` as any);
              } catch (error) {
                console.error('Error resolving chat ID:', error);
                router.push(`/(customerapp)/chat?bookingId=${realBookingId}` as any);
              }
            }}>
              <Text style={styles.linkText}>Chat</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity onPress={() => router.push(`/(customerapp)/chat?bookingId=${realBookingId}` as any)}>
              <Text style={styles.linkText}>Chat</Text>
            </TouchableOpacity> */}
            <Text style={styles.footerText}> Or confirm your booking: </Text>
            <TouchableOpacity onPress={() => router.push(`/(customerapp)/payment?bookingId=${realBookingId}` as any)}>
              <Text style={styles.linkText}>PayNow</Text>
            </TouchableOpacity>
            <Text style={styles.footerText}>.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  headerAvatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', marginLeft: 10 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  bubbleWrapper: { maxWidth: '90%' },
  bubble: { backgroundColor: '#FFFFFF', borderRadius: 16, borderTopLeftRadius: 4, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  bubbleText: { fontSize: 15, color: '#111827', lineHeight: 24 },
  timestamp: { fontSize: 11, color: '#9CA3AF', marginTop: 6, marginLeft: 4 },
  noticeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginTop: 24, gap: 6, alignSelf: 'center' },
  noticeText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  actionFooter: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 40, paddingHorizontal: 8 },
  footerText: { fontSize: 13, color: '#6B7280', lineHeight: 22, textAlign: 'center' },
  linkText: { fontSize: 14, color: '#5B21B6', fontWeight: '700', textDecorationLine: 'underline' },
});