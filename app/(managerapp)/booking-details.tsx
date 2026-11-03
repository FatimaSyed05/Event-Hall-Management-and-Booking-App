// app/(managerapp)/booking-details.tsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, TextInput, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '@/constants/webstyles';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot, addDoc, collection } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

export default function BookingDetailsScreen() {
  const params = useLocalSearchParams();
  const bookingId = params.bookingId as string;
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newTotalAmount, setNewTotalAmount] = useState('');
  const [newAdvanceAmount, setNewAdvanceAmount] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

// useEffect(() => {
//   const fetchBooking = async () => {
//     if (!bookingId) {
//       Alert.alert('Error', 'Booking ID not found');
//       router.back();
//       return;
//     }

//     try {
//       setIsLoading(true);
//       const docRef = doc(db, 'bookings', bookingId);
//       const docSnap = await getDoc(docRef); 

//       if (docSnap.exists()) {
//         const d = docSnap.data();
//         const eventDate = d.date 
//           ? new Date(d.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
//           : 'Date not set';
//         const bookedOn = d.bookingCreatedAt?.toDate
//           ? d.bookingCreatedAt.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
//           : 'N/A';

//         setBooking({
//           id: docSnap.id,
//           customerName: d.customerName || 'Unknown Customer',
//           contactNumber: d.customerPhone || 'N/A',
//           customerEmail: d.customerEmail || 'N/A',
//           eventType: d.functionType || 'Event',
//           date: eventDate,
//           time: d.timeSlot || 'Time not set',
//           status: d.status || 'pending',
//           source: d.originalRequestId ? 'online' : 'offline',
//           totalAmount: Number(d.totalAmount || 0),
//           advanceAmount: Number(d.advanceRequired || 0),
//           remainingAmount: Number(d.remainingBalance || 0),
//           advancePaid: Number(d.advancePaid || 0),
//           advancePaidBool: (d.paymentStatus === 'advance_paid' || d.paymentStatus === 'fully_paid'),
//           finalPaid: d.paymentStatus === 'fully_paid',
//           bookingDate: bookedOn,
//           notes: d.specialRequest || '',
//           hallName: d.hallName || 'Unknown Hall',
//           guestsCount: d.guestsCount || 0,
//           refundStatus: d.refundStatus || 'awaiting_refund',
//         });
//       } else {
//         Alert.alert('Error', 'Booking not found');
//         router.back();
//       }
//     } catch (error) {
//       console.error('Error fetching booking:', error);
//       Alert.alert('Error', 'Failed to load booking details');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   fetchBooking();
// }, [bookingId]);
    useEffect(() => {
      const fetchBooking = async () => {
        if (!bookingId) {
          Alert.alert('Error', 'Booking ID not found');
          router.back();
          return;
        }

        try {
          setIsLoading(true);
          const docRef = doc(db, 'bookings', bookingId);
          const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (!docSnap.exists()) {
              Alert.alert('Error', 'Booking not found');
              router.back();
              return;
            }

            const d = docSnap.data();
            const eventDate = d.date 
              ? new Date(d.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : 'Date not set';
            const bookedOn = d.bookingCreatedAt?.toDate
              ? d.bookingCreatedAt.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : 'N/A';

            setBooking({
              id: docSnap.id,
              customerId: d.customerId || '', 
              managerId: d.managerId || '',
              customerName: d.customerName || 'Unknown Customer',
              contactNumber: d.customerPhone || 'N/A',
              customerEmail: d.customerEmail || 'N/A',
              eventType: d.functionType || 'Event',
              date: eventDate,
              time: d.timeSlot || 'Time not set',
              status: d.status || 'pending',
              source: d.originalRequestId ? 'online' : 'offline',
              totalAmount: Number(d.totalAmount || 0),
              advanceAmount: Number(d.advanceRequired || 0),
              remainingAmount: Number(d.remainingBalance || 0),
              advancePaid: Number(d.advancePaid || 0),
              advancePaidBool: (d.paymentStatus === 'advance_paid' || d.paymentStatus === 'fully_paid'),
              finalPaid: d.paymentStatus === 'fully_paid',
              bookingDate: bookedOn,
              notes: d.specialRequest || '',
              hallName: d.hallName || 'Unknown Hall',
              guestsCount: d.guestsCount || 0,
              refundStatus: d.refundStatus || 'awaiting_refund',
              commissionRate: d.commissionRate || 5,
            });
            setIsLoading(false);
          });

          return () => unsubscribe();
        } catch (error) {
          console.error('Error fetching booking:', error);
          Alert.alert('Error', 'Failed to load booking details');
          setIsLoading(false);
        }
      };

      fetchBooking();
    }, [bookingId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#10B981';
      case 'pending': return '#D97706';
      case 'completed': return '#2563EB';
      case 'cancelled': return '#EF4444';
      case 'refunded': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending': return 'Booking is pending';
      case 'confirmed': return 'Booking is confirmed';
      case 'completed': return 'Booking is completed';
      case 'cancelled': return 'Booking was cancelled';
      case 'refunded': return 'Booking was refunded';
      default: return ''; 
    }
  };

  // const handleCall = () => {
  //   Linking.openURL(`tel:${booking.contactNumber}`);
  // };

  // const statusColor = getStatusColor(booking.status);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!booking) return null;

  const handleCall = () => {
    Linking.openURL(`tel:${booking.contactNumber}`);
  };
    const handleUpdateCharges = async () => {
    if (!booking || !newTotalAmount || !newAdvanceAmount) {
      Alert.alert('Error', 'Please enter both Total and Advance amounts.');
      return;
    }
    const newTotal = Number(newTotalAmount);
    const newAdvance = Number(newAdvanceAmount);
    if (isNaN(newTotal) || newTotal <= 0) {
      Alert.alert('Error', 'Please enter a valid Total amount greater than 0.');
      return;
    }
    if (isNaN(newAdvance) || newAdvance < 0) {
      Alert.alert('Error', 'Please enter a valid Advance amount.');
      return;
    }
    if (newAdvance > newTotal) {
      Alert.alert('Invalid Amount', 'Advance amount cannot be greater than the Total amount.');
      return;
    }
    if (booking.advancePaid > 0 && newAdvance < booking.advancePaid) {
      Alert.alert('Invalid Amount', `New advance cannot be less than the amount already paid (PKR ${booking.advancePaid}).`);
      return;
    }

    setIsUpdating(true);
    try {
      const newRemainingBalance = newTotal - newAdvance; 
      const commissionRate = booking.commissionRate || 5;
      const newAdminCommission = Math.ceil(newTotal * (commissionRate / 100));
      const newManagerNetEarnings = newTotal - newAdminCommission;
      const oldTotal = booking.totalAmount;
      const concessionAmount = oldTotal - newTotal;

      const bookingRef = doc(db, 'bookings', booking.id);
      await updateDoc(bookingRef, {
        totalAmount: newTotal,
        advanceRequired: newAdvance, 
        remainingBalance: newRemainingBalance,
        adminCommission: newAdminCommission,
        managerNetEarnings: newManagerNetEarnings,
        chargesUpdatedAt: serverTimestamp(),
        chargesUpdatedBy: 'manager',
      });

      if (booking.customerId) {
        try {
          await addDoc(collection(db, 'notifications'), {
            type: 'bookings',
            targetRole: 'customer',
            targetUserId: booking.customerId,
            bookingId: booking.id,
            senderName: booking.hallName || 'Hall Manager',
            senderId: booking.managerId || 'manager', 
            hallName: booking.hallName,
            title: 'Booking Charges Updated! 📋',
            message: `Your booking charges at ${booking.hallName} have been updated.`,
            detailedMessage: (
              `Assalam-o-Alaikum!\n\n` +
              `The hall management has updated the charges for your booking.\n\n` +
              `📋 Updated Charges:\n` +
              `• Previous Total: PKR ${oldTotal.toLocaleString()}\n` +
              `• New Total: PKR ${newTotal.toLocaleString()}\n` +
              (concessionAmount > 0 ? `• Discount/Concession: PKR ${concessionAmount.toLocaleString()} 💰\n` : '') +
              `• New Advance Required: PKR ${newAdvance.toLocaleString()}\n` +
              `• New Remaining Balance: PKR ${newRemainingBalance.toLocaleString()}\n\n` +
              `Please proceed with the payment to confirm your booking.\n\n` +
              `Best Regards,\n${booking.hallName}`
            ),
            status: 'unread',
            action: 'booking-details',
            timestamp: serverTimestamp(),
          });
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
        }
      }

      Alert.alert(
        'Success', 
        `Charges updated successfully!\nTotal: PKR ${newTotal.toLocaleString()}\nAdvance: PKR ${newAdvance.toLocaleString()}`
      );
      
      setShowUpdateModal(false);
      setNewTotalAmount('');
      setNewAdvanceAmount('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update');
    } finally {
      setIsUpdating(false);
    }
  };

  const statusColor = getStatusColor(booking.status);
  const advancePaidAmount =
    Number(booking.advancePaid) > 0 ? Number(booking.advancePaid) : Number(booking.advanceAmount);
  const finalPaidAmount =
    Math.max(Number(booking.totalAmount) - advancePaidAmount, 0);

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{booking.customerName}</Text>
          </View>
          <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
            <Text style={styles.infoLabel}>Contact</Text>
            <Text style={[styles.infoValue, { color: '#5B21B6' }]}>{booking.contactNumber}</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Event Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Event</Text>
            <Text style={styles.infoValue}>{booking.eventType}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{booking.date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>{booking.time}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Guests</Text>
            <Text style={styles.infoValue}>{booking.guestsCount > 0 ? booking.guestsCount : 'Not specified'}</Text>
          </View>

          <Text style={styles.sectionTitle}>Booking Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Source</Text>
            <Text style={styles.infoValue}>{booking.source === 'online' ? 'Online' : 'Offline'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created On</Text>
            <Text style={styles.infoValue}>{booking.bookingDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: statusColor, fontWeight: '700' }]}>
              {getStatusMessage(booking.status)}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total</Text>
            <Text style={[styles.infoValue, { fontWeight: '700' }]}>
              PKR {booking.totalAmount.toLocaleString()}
            </Text>
          </View>

          {booking?.status === 'pending' && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Advance Due</Text>
                <Text style={[styles.infoValue, { color: '#000000', fontWeight: '600' }]}>
                  PKR {booking.advanceAmount.toLocaleString()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payment Status</Text>
                <Text style={[styles.infoValue, { color: '#D97706', fontWeight: '600' }]}>
                  Pending
                </Text>
              </View>
              
              {booking.advancePaid === 0 && (
                <TouchableOpacity 
                  style={styles.updateChargesBtn}
                  onPress={() => {
                    setNewTotalAmount(booking.totalAmount.toString());
                    setNewAdvanceAmount(booking.advanceAmount.toString());
                    setShowUpdateModal(true);
                  }}
                >
                  <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.updateChargesBtnText}>Update Charges</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {booking?.status === 'confirmed' && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Advance Paid</Text>
                <Text style={[styles.infoValue, { color: '#0b0c0c' }]}>
                  PKR {booking.advancePaid.toLocaleString()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Remaining</Text>
                <Text style={[styles.infoValue, { color: '#D97706', fontWeight: '600' }]}>
                  PKR {booking.remainingAmount.toLocaleString()}
                </Text>
              </View>
               <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payment Status</Text>
                <Text style={[styles.infoValue, { color: '#D97706', fontWeight: '600' }]}>
                  Partially Paid
                </Text>
              </View>
            </>
          )}

          {booking.status === 'completed' && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Advance Paid</Text>
                <Text style={[styles.infoValue, { color: '#060606' }]}>
                  PKR {booking.advanceAmount.toLocaleString()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Final Paid</Text>
                <Text style={[styles.infoValue, { color: '#050606' }]}>
                PKR {(booking.totalAmount - booking.advanceAmount).toLocaleString()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={[styles.infoValue, { color: '#10B981', fontWeight: '600' }]}>
                  Fully Paid ✓
                </Text>
              </View>
            </>
          )}

          {booking.status === 'cancelled' && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Advance Paid</Text>
                <Text style={[styles.infoValue, { color: '#10B981' }]}>
                  PKR {booking.advancePaid.toLocaleString()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payment Status</Text>
                <Text style={[styles.infoValue, { 
                  color: booking.refundStatus === 'completed' ? '#10B981' : '#D97706', 
                  fontWeight: '600' 
                }]}>
                  {booking.refundStatus === 'completed' ? '✓ Refunded' : 'Waiting for refund approval.'}
                </Text>
              </View>
            </>
          )}

          {booking.status === 'refunded' && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Refund Amount</Text>
                <Text style={[styles.infoValue, { color: '#8B5CF6', fontWeight: '600' }]}>
                  PKR {booking.advancePaid.toLocaleString()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={[styles.infoValue, { color: '#10B981', fontWeight: '600' }]}>
                  ✓ Refunded
                </Text>
              </View>
            </>
          )}

          {booking.notes && (
            <>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{booking.notes}</Text>
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
      <Modal visible={showUpdateModal} transparent animationType="fade">
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Booking Charges</Text>
            
            <View style={styles.currentChargesBox}>
              <Text style={styles.currentChargesLabel}>Current Total</Text>
              <Text style={styles.currentChargesValue}>PKR {booking?.totalAmount.toLocaleString()}</Text>
              <Text style={[styles.currentChargesLabel, { marginTop: 8 }]}>Current Advance</Text>
              <Text style={[styles.currentChargesValue, { fontSize: 16 }]}>PKR {booking?.advanceAmount.toLocaleString()}</Text>
            </View>

            <Text style={styles.inputLabel}>New Total Amount (PKR)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new total amount"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={newTotalAmount}
              onChangeText={setNewTotalAmount}
            />
            <Text style={styles.inputLabel}>New Advance Amount (PKR)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new advance amount"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={newAdvanceAmount}
              onChangeText={setNewAdvanceAmount}
            />
            <View style={styles.calculatedBox}>
              <Text style={styles.calculatedLabel}>Remaining Balance:</Text>
              <Text style={styles.calculatedValue}>
                PKR {Math.max(0, (Number(newTotalAmount) || 0) - (Number(newAdvanceAmount) || 0)).toLocaleString()}
              </Text>
            </View>

            <View style={styles.modalInfoBox}>
              <Ionicons name="information-circle-outline" size={16} color="#5B21B6" />
              <Text style={styles.modalInfoText}>
                You can adjust both total and advance amounts based on negotiation. Remaining balance is calculated automatically.
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.submitBtn, isUpdating && { opacity: 0.6 }]}
              onPress={handleUpdateCharges}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>Update Charges</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => {
                setShowUpdateModal(false);
                setNewTotalAmount('');
                setNewAdvanceAmount('');
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 24, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 20 },
  infoLabel: { fontSize: 13, color: '#6B7280', width: 100 },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 1 },
  notesBox: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#F3F4F6' },
  notesText: { fontSize: 13, color: '#4B5563', lineHeight: 20 },
  updateChargesBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#5B21B6', paddingVertical: 12, borderRadius: 10, marginTop: 16, gap: 8 },
  updateChargesBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20, textAlign: 'center' },
  currentChargesBox: { backgroundColor: '#F5F3FF', borderRadius: 10, padding: 16, marginBottom: 20, alignItems: 'center' },
  currentChargesLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  currentChargesValue: { fontSize: 20, fontWeight: '700', color: '#5B21B6' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#111827', marginBottom: 16 },
  modalInfoBox: { flexDirection: 'row', backgroundColor: '#F5F3FF', borderRadius: 8, padding: 12, marginBottom: 20, gap: 8 },
  modalInfoText: { flex: 1, fontSize: 12, color: '#4B5563', lineHeight: 18 },
  submitBtn: { backgroundColor: '#5B21B6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  calculatedBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#BBF7D0' },
  calculatedLabel: { fontSize: 14, color: '#166534', fontWeight: '600'},
  calculatedValue: { fontSize: 16, color: '#15803D', fontWeight: '700' },
});