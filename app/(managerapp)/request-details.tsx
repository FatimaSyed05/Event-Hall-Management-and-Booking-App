// app/(managerapp)/request-details.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { webContainerStyle } from '@/constants/webstyles';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';
import { triggerPushNotification } from '@/backend/services/notificationServices';

type RequestStatus = 'pending' | 'accepted' | 'rejected';

const getExactTime = (slot: string) => {
  if (slot === 'Morning') return '8:00 AM - 12:00 PM';
  if (slot === 'Afternoon') return '12:00 PM - 4:00 PM';
  if (slot === 'Evening') return '6:00 PM - 10:00 PM';
  return slot || 'N/A';
};

export default function RequestDetailScreen() {
  const params = useLocalSearchParams();
  const requestId = params.requestId as string;

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any>(null);
  const [status, setStatus] = useState<RequestStatus>('pending');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null); 
  const [isProcessing, setIsProcessing] = useState(false);

  // useEffect(() => {
  //   const fetchRequest = async () => {
  //     if (!requestId) {
  //       Alert.alert('Error', 'Request ID missing');
  //       router.back();
  //       return;
  //     }

  //     try {
  //       const docRef = doc(db, 'requests', requestId);
  //       const docSnap = await getDoc(docRef);

  //       if (docSnap.exists()) {
  //         const data = { id: docSnap.id, ...docSnap.data() } as any;
  //         setRequest(data);
  //         setStatus(data.status || 'pending');
  //       } else {
  //         Alert.alert('Error', 'Request not found in Database.');
  //         router.back();
  //       }
  //     } catch (error) {
  //       Alert.alert('Error', 'Failed to load request details.');
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchRequest();
  // }, [requestId]);
  useEffect(() => {
    const fetchRequest = async () => {
      if (!requestId) {
        Alert.alert('Error', 'Request ID missing');
        router.back();
        return;
      }

      try {
        const docRef = doc(db, 'requests', requestId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as any;
          if (data.hallId) {
            try {
              const hallRef = doc(db, 'halls', data.hallId);
              const hallSnap = await getDoc(hallRef);
              if (hallSnap.exists()) {
                const hallData = hallSnap.data();
                if (hallData.address) {
                  data.hallAddress = hallData.address;
                }
              }
            } catch (e) {
              console.error('Error fetching hall address:', e);
            }
          }
          
          setRequest(data);
          setStatus(data.status || 'pending');
        } else {
          Alert.alert('Error', 'Request not found in Database.');
          router.back();
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load request details.');
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [requestId]);

  const handleAcceptPress = async () => {
    try {
      const { getDocs, query, where, collection } = await import('firebase/firestore');
      const conflictsQuery = query(
        collection(db, 'requests'),
        where('hallId', '==', request.hallId),
        where('date', '==', request.date),
        where('timeSlot', '==', request.timeSlot),
        where('status', '==', 'accepted')
      );
      
      const conflictsSnap = await getDocs(conflictsQuery);
      
      if (conflictsSnap.size > 0) {
        Alert.alert(
          'Time Slot Conflict',
          `This time slot already has ${conflictsSnap.size} accepted request(s) waiting for payment.\n\nIf you accept this and another customer pays first, this request will be auto-rejected.\n\nDo you want to continue?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Accept Anyway', 
              style: 'destructive',
              onPress: () => {
                setActionType('accept');
                setShowConfirmModal(true);
              }
            }
          ]
        );
      } else {
        setActionType('accept');
        setShowConfirmModal(true);
      }
    } catch (error) {
      console.error('Conflict check error:', error);
      setActionType('accept');
      setShowConfirmModal(true);
    }
  };

  const handleRejectPress = () => {
    setActionType('reject');
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    setShowConfirmModal(false);
    setIsProcessing(true);
    try {
      if (actionType === 'accept') {
        const hallRef = doc(db, 'halls', request.hallId);
        const hallSnap = await getDoc(hallRef);
        if (!hallSnap.exists()) {
          throw new Error('Hall details not found');
        }
        const hallData = hallSnap.data();
        const price = Number(hallData.price) || 0; 
        const guests = Number(request.guestsCount) || 0;
        const baseTotal = guests * price; 
        const commissionRate = request.commissionRate || 5;
        const adminCommissionPercent = commissionRate / 100; 
        const adminCommission = Math.ceil(baseTotal * adminCommissionPercent);
        const managerNetEarnings = baseTotal - adminCommission;
        // const adminCommissionPercent = 0.05; 
        // const adminCommission = Math.ceil(baseTotal * adminCommissionPercent);
        // const managerNetEarnings = baseTotal - adminCommission; 
        const advancePercent = 0.30; 
        const advanceRequired = Math.ceil(baseTotal * advancePercent);
        const remainingBalance = baseTotal - advanceRequired;
        const bookingRef = await addDoc(collection(db, 'bookings'), {
          customerId: request.customerId,
          customerName: request.customerName,
          customerPhone: request.customerPhone,
          customerEmail: request.customerEmail,
          hallId: request.hallId,
          hallName: request.hallName,
          hallAddress: request.hallAddress,
          managerId: request.managerId,
          date: request.date,
          timeSlot: request.timeSlot,
          guestsCount: request.guestsCount,
          functionType: request.functionType,
          specialRequest: request.specialRequest,
          status: 'pending', // Payment pending
          requestStatus: 'accepted',
          originalRequestId: request.id,
          bookingCreatedAt: serverTimestamp(),
          totalAmount: baseTotal,
          advanceRequired: advanceRequired,
          remainingBalance: remainingBalance,
          adminCommission: adminCommission,
          managerNetEarnings: managerNetEarnings,
          pricePerHeadAtBooking: price,
          commissionRate: commissionRate, 
        });
        
        const newBookingId = bookingRef.id; 
        await updateDoc(doc(db, 'requests', request.id), { 
          status: 'accepted',
          requestStatus: 'accepted',
          totalAmount: baseTotal,
          advanceRequired: advanceRequired,
          remainingBalance: remainingBalance,
        });
        await addDoc(collection(db, 'notifications'), {
          type: 'requests',
          sender: 'Manager',
          senderId: request.managerId,
          targetUserId: request.customerId,
          targetRole: 'customer',
          hallId: request.hallId,
          hallName: request.hallName, 
          requestId: request.id,
          bookingId: newBookingId, 
          title: 'Request Accepted',
          message: `Your booking request for "${request.hallName}" on ${request.date} has been ACCEPTED! 🎉`,
          detailedMessage: `Assalam-o-Alaikum!\n\nYour booking request for ${request.hallName} on ${request.date} (${request.timeSlot}) has been accepted.\n\nEvent Details:\n• Hall: ${request.hallName}\n• Date: ${request.date}\n• Time: ${request.timeSlot}\n• Guests: ${request.guestsCount}\n• Function: ${request.functionType}\n\n💰 Total Amount: PKR ${baseTotal.toLocaleString()}\n💵 Advance Due: PKR ${advanceRequired.toLocaleString()}\n\nPlease proceed with the payment to confirm your booking.\n\nBest Regards,\n${request.hallName}`,
          status: 'unread',
          action: 'request-details',
          timestamp: serverTimestamp()
        });
        await triggerPushNotification(
          request.customerId,
          'Request Accepted!',
          `Your booking request for "${request.hallName}" on ${request.date} has been accepted!`,
          { action: 'booking-details', bookingId: newBookingId, type: 'requests' }
        );

        setStatus('accepted');
        Alert.alert('Success', 'Request accepted successfully! Customer has been notified.', [
          { text: 'OK', onPress: () => router.back() }
        ]);

      } else if (actionType === 'reject') {
        await updateDoc(doc(db, 'requests', request.id), { status: 'rejected' });
        await addDoc(collection(db, 'notifications'), {
          type: 'requests',
          sender: 'Manager',
          senderId: request.managerId,
          targetUserId: request.customerId,
          targetRole: 'customer',
          hallId: request.hallId,
          hallName: request.hallName, 
          requestId: request.id,
          title: 'Request Rejected',
          message: `Your booking request for "${request.hallName}" on ${request.date} has been REJECTED.`,
          detailedMessage: `Assalam-o-Alaikum!\n\nWe regret to inform you that your request for ${request.hallName} on ${request.date} (${request.timeSlot}) could not be processed due to prior commitments on that date.\n\nWe apologize for the inconvenience. Please try booking for another date or explore our other available halls.\n\nBest Regards,\n${request.hallName}`, 
          status: 'unread',
          action: 'request-details',
          timestamp: serverTimestamp()
        });
        await triggerPushNotification(
          request.customerId,
          'Request Rejected',
          `Your booking request for "${request.hallName}" on ${request.date} has been rejected.`,
          { action: 'request-details', requestId: request.id, type: 'requests' }
        );
        setStatus('rejected');
        Alert.alert('Rejected', 'Request rejected successfully! Customer has been notified.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      console.error("Error updating request:", error);
      Alert.alert('Error', error.message || 'Failed to update request status. Please try again.');
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  const handleCancelAction = () => {
    setShowConfirmModal(false);
    setActionType(null);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'accepted': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      default: return 'Pending';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'accepted': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      default: return 'time-outline';
    }
  };

  const formatRequestDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={styles.loadingText}>Loading request details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!request) return null;

  const displayData = {
    customerName: request.customerName || 'N/A',
    phone: request.customerPhone || 'N/A',
    email: request.customerEmail || 'N/A',
    hallName: request.hallName || 'N/A',
    hallLocation: request.hallAddress || 'Address not available', 
    eventDate: request.date || 'N/A',
    eventTime: getExactTime(request.timeSlot), 
    functionType: request.functionType || 'N/A',
    guestCount: request.guestsCount || 0,
    specialRequests: request.specialRequest || '',
    requestDate: formatRequestDate(request.createdAt),
  };

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >  
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>        
          <View style={styles.newDetailRow}>
            <Text style={styles.newRowLabel}>Full Name</Text>
            <Text style={styles.newRowValue}>{displayData.customerName}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.newDetailRow}>
            <Text style={styles.newRowLabel}>Phone Number</Text>
            <Text style={styles.newRowValue}>{displayData.phone}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.newDetailRow}>
            <Text style={styles.newRowLabel}>Email Address</Text>
            <Text style={styles.newRowValue}>{displayData.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          <View style={styles.newDetailRow}>
            <Text style={styles.newRowLabel}>Event Date</Text>
            <Text style={styles.newRowValue}>{displayData.eventDate}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.newDetailRow}>
            <Text style={styles.newRowLabel}>Event Time</Text>
            <Text style={styles.newRowValue}>{displayData.eventTime}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.newDetailRow}>
            <Text style={styles.newRowLabel}>Function Type</Text>
            <Text style={styles.newRowValue}>{displayData.functionType}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.newDetailRow}>
            <Text style={styles.newRowLabel}>Guest Count</Text>
            <Text style={styles.newRowValue}>{displayData.guestCount} guests</Text>
          </View>
          {displayData.specialRequests ? (
            <>
              <View style={styles.divider} />
              <View style={styles.specialRequestContainer}>
                <Text style={styles.specialRequestLabel}>Special Requests</Text>
                <Text style={styles.specialRequestValue}>{displayData.specialRequests}</Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hall Information</Text>         
          <View style={styles.newDetailRow}>
            <Text style={styles.newRowLabel}>Hall Name</Text>
            <Text style={styles.newRowValue}>{displayData.hallName}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.newDetailRow}>
            <Text style={styles.newRowLabel}>Address</Text>
            <Text style={styles.newRowValue}>{displayData.hallLocation}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.newDetailRow}>
            <Text style={styles.newRowLabel}>Request Date</Text>
            <Text style={styles.newRowValue}>{displayData.requestDate}</Text>
          </View>
        </View>

       {status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.acceptButton, isProcessing && { opacity: 0.6 }]} 
            onPress={handleAcceptPress} 
            disabled={isProcessing}
          >
            {isProcessing && actionType === 'accept' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>Accept Request</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.rejectButton, isProcessing && { opacity: 0.6 }]} 
            onPress={handleRejectPress} 
            disabled={isProcessing}
          >
            {isProcessing && actionType === 'reject' ? (
              <ActivityIndicator color="#EF4444" />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text style={styles.rejectButtonText}>Reject Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

        {status !== 'pending' && (
          <View style={styles.statusMessage}>
            <Ionicons name={getStatusIcon()} size={24} color={getStatusColor()} />
            <Text style={[styles.statusMessageText, { color: getStatusColor() }]}>
              This request has been {getStatusText().toLowerCase()}
            </Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {showConfirmModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconContainer, { backgroundColor: actionType === 'accept' ? '#D1FAE5' : '#FEE2E2' }]}>
              <Ionicons name={actionType === 'accept' ? 'checkmark-circle' : 'close-circle'} size={40} color={actionType === 'accept' ? '#10B981' : '#EF4444'} />
            </View>           
            <Text style={styles.modalTitle}>{actionType === 'accept' ? 'Accept Request?' : 'Reject Request?'}</Text>           
            <Text style={styles.modalMessage}>
              {actionType === 'accept' 
                ? `Are you sure you want to accept this request from ${displayData.customerName}? It will be moved to bookings.`
                : `Are you sure you want to reject this request from ${displayData.customerName}?`}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={handleCancelAction}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalActionButton, actionType === 'accept' ? styles.modalAcceptButton : styles.modalRejectButton]}
                onPress={handleConfirmAction}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalActionText}>{actionType === 'accept' ? 'Yes, Accept' : 'Yes, Reject'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, color: '#6B7280' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  section: { marginBottom: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#011515', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  newDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 14 },
  newRowLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500', width: 120 },
  newRowValue: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '600', textAlign: 'right' },
  specialRequestContainer: { paddingVertical: 14 },
  specialRequestLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginBottom: 6 },
  specialRequestValue: { fontSize: 14, color: '#111827', fontWeight: '500', lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  actionButtons: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 10 },
  acceptButton: { flex: 1, flexDirection: 'row', backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  acceptButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  rejectButton: { flex: 1, flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#EF4444', gap: 8 },
  rejectButtonText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
  statusMessage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 20, gap: 8 },
  statusMessageText: { fontSize: 15, fontWeight: '600' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' },
  modalIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#F3F4F6' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  modalActionButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalAcceptButton: { backgroundColor: '#10B981' },
  modalRejectButton: { backgroundColor: '#EF4444' },
  modalActionText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});