// app/(customerapp)/request-details.tsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'; 
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { webContainerStyle } from '@/constants/webstyles';
import { doc, getDoc, getDocs, query, collection, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

export default function RequestDetailsScreen() {
  const params = useLocalSearchParams();
  const [request, setRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [linkedBookingId, setLinkedBookingId] = useState<string | null>(null);
  const [linkedBookingStatus, setLinkedBookingStatus] = useState<string | null>(null);

  const formatEventTime = (timeStr: string) => {
  if (!timeStr || timeStr === 'N/A' || timeStr.trim() === '') return 'N/A';
  let clean = timeStr.replace(/morning|evening|afternoon|night/gi, '');
  clean = clean.replace(/[-–—]/g, ' to ');
  clean = clean.replace(/\s+/g, ' ').trim();
  clean = clean.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
  return clean.length > 0 ? clean : timeStr;
};

  const formatCurrency = (amount: number) => {
    return `PKR ${Number(amount).toLocaleString()}`;
  };
    useEffect(() => {
    const requestId = params.requestId as string;
    if (!requestId) {
      router.back();
      return;
    }

    let bookingUnsubscribe: (() => void) | null = null;
    const fetchRequestDetails = async () => {
      try {
        setIsLoading(true);
        let docRef = doc(db, 'requests', requestId);
        let docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          docRef = doc(db, 'bookings', requestId);
          docSnap = await getDoc(docRef);
        }
        
        if (!docSnap.exists()) {
          Alert.alert('Error', 'Request not found in database.');
          router.back();
          return;
        }

        const data = docSnap.data();
        setRequest({
          id: docSnap.id,
          hallName: data.hallName || 'N/A',
          eventType: data.functionType || 'N/A', 
          eventDate: data.date || 'N/A',
          eventTime: data.timeSlot || 'N/A',
          guests: data.guestsCount || 'N/A',
          status: data.status || 'requested', 
          totalAmount: Number(data.totalAmount) || 0,
          advanceRequired: Number(data.advanceRequired) || 0,
          remainingBalance: Number(data.remainingBalance) || 0,
          requestedOn: data.createdAt?.toDate 
            ? data.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) 
            : 'N/A',
          hall: {
            id: data.hallId || 'h1',
            name: data.hallName || 'N/A',
            address: data.hallAddress || 'N/A',
            contactPhone: data.managerPhone || 'N/A', 
            capacity: data.capacity || 'N/A', 
            price: data.price || 'N/A', 
            hallType: data.hallType || 'N/A', 
            facilities: data.facilities || [], 
            mediaFiles: data.mediaFiles || [], 
            status: 'Approved'
          }
        });
        const bookingsQuery = query(collection(db, 'bookings'), where('originalRequestId', '==', requestId));
        const bookingSnap = await getDocs(bookingsQuery);
        
        if (!bookingSnap.empty) {
          const bookingDoc = bookingSnap.docs[0];
          const bookingData = bookingDoc.data();
          console.log("Linked Booking ID:", bookingDoc.id);
          
          setLinkedBookingId(bookingDoc.id);
          setLinkedBookingStatus(bookingData.status || 'pending');

          const bookingRef = doc(db, 'bookings', bookingDoc.id);
          bookingUnsubscribe = onSnapshot(bookingRef, (bookingDocSnap) => {
            if (bookingDocSnap.exists()) {
              const bData = bookingDocSnap.data();
              setRequest((prev: any) => prev ? {
                ...prev,
                totalAmount: Number(bData.totalAmount) || prev.totalAmount,
                advanceRequired: Number(bData.advanceRequired) || prev.advanceRequired,
                remainingBalance: Number(bData.remainingBalance) || prev.remainingBalance,
              } : prev);
              
              setLinkedBookingStatus(bData.status || 'pending');
              console.log("Booking updated:", {
                total: bData.totalAmount,
                advance: bData.advanceRequired,
                remaining: bData.remainingBalance
              });
            }
          });
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching request:", error);
        Alert.alert('Error', 'Failed to load request details.');
        setIsLoading(false);
      }
    };

    fetchRequestDetails();

    return () => {
      if (bookingUnsubscribe) bookingUnsubscribe();
    };
  }, [params.requestId]);

  // useEffect(() => {
  //   const fetchRequestDetails = async () => {
  //     const requestId = params.requestId as string;
  //     if (!requestId) {
  //       router.back();
  //       return;
  //     }
  //     try {
  //       setIsLoading(true);
  //       let docRef = doc(db, 'requests', requestId);
  //       let docSnap = await getDoc(docRef);
  //       if (!docSnap.exists()) {
  //         docRef = doc(db, 'bookings', requestId);
  //         docSnap = await getDoc(docRef);
  //       }
  //       if (docSnap.exists()) {
  //         const data = docSnap.data();
  //         setRequest({
  //           id: docSnap.id,
  //           hallName: data.hallName || 'N/A',
  //           eventType: data.functionType || 'N/A', 
  //           eventDate: data.date || 'N/A',
  //           eventTime: data.timeSlot || 'N/A',
  //           guests: data.guestsCount || 'N/A',
  //           status: data.status || 'requested', 
  //           totalAmount: Number(data.totalAmount) || 0,
  //           advanceRequired: Number(data.advanceRequired) || 0,
  //           remainingBalance: Number(data.remainingBalance) || 0,
  //           requestedOn: data.createdAt?.toDate 
  //             ? data.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) 
  //             : 'N/A',
  //           // totalAmount: data.totalAmount || 'N/A',
  //           hall: {
  //             id: data.hallId || 'h1',
  //             name: data.hallName || 'N/A',
  //             address: data.hallAddress || 'N/A',
  //             contactPhone: data.managerPhone || 'N/A', 
  //             capacity: data.capacity || 'N/A', 
  //             price: data.price || 'N/A', 
  //             hallType: data.hallType || 'N/A', 
  //             facilities: data.facilities || [], 
  //             mediaFiles: data.mediaFiles || [], 
  //             status: 'Approved'
  //           }
            
  //         });
  //         const bookingsQuery = query(collection(db, 'bookings'), where('originalRequestId', '==', requestId));
  //         const bookingSnap = await getDocs(bookingsQuery);
          
  //         if (!bookingSnap.empty) {
  //           const bookingDoc = bookingSnap.docs[0];
  //           const bookingData = bookingDoc.data();
  //           console.log("Linked Booking ID:", bookingDoc.id);
  //           console.log("Linked Booking Status:", bookingData.status);
  
  //           setLinkedBookingId(bookingDoc.id);
  //           setLinkedBookingStatus(bookingData.status || 'pending');
  //         }
  //       } else {
  //         Alert.alert('Error', 'Request not found in database.');
  //         router.back();
  //       }
  //     } catch (error) {
  //       console.error("Error fetching request:", error);
  //       Alert.alert('Error', 'Failed to load request details.');
  //       router.back();
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
  //   fetchRequestDetails();
  // }, [params.requestId]);

  const openHallDetails = () => {
    if (request?.hall?.id) {
      router.push({
        pathname: '/(customerapp)/hall-details' as any, 
        params: { 
          id: request.hall.id,
          hallId: request.hall.id,
          hallData: JSON.stringify(request.hall)
        }
      });
    } else {
      Alert.alert('Error', 'Hall information is not available.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B21B6" />
           <Text style={styles.loadingText}>Loading request details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!request) return null;

  let bannerIcon = "time-outline";
  let bannerColor = "#F59E0B"; 
  let bannerTitle = "Pending Manager Approval";
  let bannerDesc = "Your request has been sent to the hall manager. You will be notified once they approve or reject it.";
  let showActions = false;

  if (request.status === 'rejected') {
    bannerIcon = "close-circle";
    bannerColor = "#EF4444";
    bannerTitle = "Request Rejected";
    bannerDesc = "The hall manager has rejected your request. You can modify details and send a new request.";
  } else if (request.status === 'accepted') { 
    bannerIcon = "checkmark-circle";
    bannerColor = "#10B981";
    bannerTitle = "Request Approved!";
    bannerDesc = "Your request has been approved by the manager. Please complete the payment to confirm your booking.";
    showActions = true; 
  }

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={[styles.statusBanner, { borderColor: bannerColor + '40', backgroundColor: bannerColor + '10' }]}>
          <Ionicons name={bannerIcon as any} size={40} color={bannerColor} />
          <Text style={[styles.statusTitle, { color: bannerColor }]}>
            {bannerTitle}
          </Text>
          <Text style={styles.statusDesc}>
            {bannerDesc}
          </Text>
        </View>

        <TouchableOpacity style={styles.listItem} onPress={openHallDetails} activeOpacity={0.7}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemLabel}>Requested Hall</Text>
            <Text style={styles.itemValue}>{request.hall?.name || request.hallName || 'N/A'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>Event Type</Text>
            <Text style={styles.rowValue}>{request.eventType}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>Event Date</Text>
            <Text style={styles.rowValue}>{request.eventDate}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>Event Time</Text>
            <Text style={styles.rowValue}>{formatEventTime(request.eventTime)}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>Expected Guests</Text>
            <Text style={styles.rowValue}>{request.guests}</Text>
          </View>
        </View>

        {request.status === 'accepted' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.rowLabel}>Total Hall Charges</Text>
              <Text style={styles.rowValue}>{formatCurrency(request.totalAmount)}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={[styles.rowLabel, { color: '#6a6565', fontWeight: '600' }]}>Advance</Text>
              <Text style={[styles.rowValue, { color: '#5B21B6', fontWeight: '700' }]}>{formatCurrency(request.advanceRequired)}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.rowLabel}>Remaining Balance</Text>
              <Text style={styles.rowValue}>{formatCurrency(request.remainingBalance)}</Text>
            </View>

            {/* <View style={styles.paymentNote}>
              <Ionicons name="information-circle" size={16} color="#10B981" />
              <Text style={styles.paymentNoteText}>
                Pay the advance amount now to confirm your booking. Remaining balance is due before the event.
              </Text>
            </View> */}
          </View>
        )}

        {showActions && (
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => router.push(`/(customerapp)/chat?requestId=${request.id}` as any)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#5B21B6" />
              <Text style={styles.actionBtnText}>Chat</Text>
            </TouchableOpacity>

            {isLoading && (
              <View style={[styles.payBtn, { opacity: 0.5 }]}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.payBtnText}>Loading...</Text>
              </View>
            )}

            {!isLoading && linkedBookingStatus === 'pending' && linkedBookingId && (
              <TouchableOpacity 
                style={styles.payBtn} 
                onPress={() => router.push(`/(customerapp)/payment?bookingId=${linkedBookingId}` as any)}
              >
                <Ionicons name="card-outline" size={20} color="#FFFFFF" />
                <Text style={styles.payBtnText}>Pay Now</Text>
              </TouchableOpacity>
            )}

            {!isLoading && linkedBookingStatus && linkedBookingStatus !== 'pending' && linkedBookingId && (
              <TouchableOpacity 
                style={styles.payBtn} 
                onPress={() => router.push(`/(customerapp)/booking-details?bookingId=${linkedBookingId}` as any)}
              >
                <Ionicons name="eye-outline" size={20} color="#FFFFFF" />
                <Text style={styles.payBtnText}>View Booking</Text>
              </TouchableOpacity>
            )}

            {!isLoading && !linkedBookingId && (
              <View style={[styles.payBtn, { backgroundColor: '#9CA3AF', opacity: 0.6 }]}>
                <Ionicons name="alert-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.payBtnText}>No Booking Found</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  statusBanner: { alignItems: 'center', padding: 24, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  statusTitle: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  statusDesc: { fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 20 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  itemInfo: { flex: 1 },
  itemLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 4 },
  itemValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  section: { backgroundColor: '#FFFFFF', borderRadius: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rowLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  rowValue: { fontSize: 14, color: '#111827', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  actionContainer: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#E9D5FF', gap: 8 },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#5B21B6' },
  payBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#10B981', gap: 8 },
  payBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  paymentNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16, backgroundColor: '#ECFDF5', padding: 12, borderRadius: 8 },
  paymentNoteText: { flex: 1, fontSize: 12, color: '#065F46', lineHeight: 18 },
  viewBookingBtn: {  flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#3B82F6', gap: 8, marginLeft: 8 },
  viewBookingBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});