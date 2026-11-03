// app/(adminapp)/booking-detail.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { webContainerStyle } from '@/constants/webstyles';
import { doc, getDoc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

interface ManagerData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  [key: string]: any;
}

interface HallData {
  id: string;
  hallName?: string;
  address?: string;
  managerId?: string;
  manager?: ManagerData;
  [key: string]: any;
}

interface CustomerData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

interface BookingData {
  id: string;
  status: string;
  bookingDate: string;
  hallName: string;
  eventDate: string;
  eventTime: string;
  eventType: string;
  guests: number;
  totalAmount: string;
  advancePaid: string;
  remainingBalance: string;
  commission: string;
  commissionPercent: string;
  managerShare: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentDate: string;
  transactionId: string;
  customer: CustomerData | null;
  hall: HallData | null;
  refundDate: string;          
  refundTransactionId: string; 
  raw: any;
}
// const dummyBooking = {
//   id: 'B123',
//   status: 'Cancelled', // 'Pending', 'Confirmed', 'Completed', 'Cancelled', 'Refunded'
//   bookingDate: '10 Nov 2024',
//   hallName: 'Imperial Grand Hall', 
//   eventDate: '25 Dec 2024',
//   eventTime: '6:00 PM - 10:00 PM',
//   eventType: 'Wedding Reception',
//   guests: 350,
//   totalAmount: 'PKR 150,000',
//   advancePaid: 'PKR 50,000', 
//   remainingBalance: 'PKR 100,000', 
//   commission: 'PKR 15,000',
//   commissionPercent: '10%',
//   managerShare: 'PKR 135,000',
//   paymentMethod: 'JazzCash',
//   paymentStatus: 'Paid', // Initially 'Paid' for cancelled bookings so refund button shows
//   paymentDate: '12 Nov 2024',
//   transactionId: 'TXN-789456',
//   customer: {
//     id: 'c1', name: 'Usman Malik', email: 'usman.m@example.com', phone: '0333-9876543',
//     address: 'Building 7, Gulberg III, Lahore', status: 'Active', role: 'Customers',
//     docName: 'N/A', docUri: '', halls: [],
//     bookings: [{ id: 'B123', hall: 'Imperial Hall', date: '25 Dec 2024', status: 'Cancelled' }]
//   },
//   hall: {
//     id: 'h1', name: 'Imperial Grand Hall',
//     address: 'Street 5, Wapda Town, Lahore',
//     location: { latitude: 31.5204, longitude: 74.3587, address: 'Street 5, Wapda Town, Lahore' },
//     contactPhone: '0300-1234567', capacity: '500', price: '150,000',
//     tables: '75', chairs: '600', hallType: 'Indoor',
//     otherInfo: 'Ideal for grand weddings.',
//     facilities: ['Parking Available', 'AC / Cooling', 'Sound System'],
//     mediaFiles: [{ uri: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800', type: 'image' }],
//     verificationDoc: { uri: '', name: 'Ownership_Deed.pdf', type: 'application/pdf' },
//     status: 'Approved',
//     manager: {
//       id: 'm1', name: 'Ali Raza', email: 'ali.raza@example.com', phone: '0300-1234567',
//       address: 'House 123, Wapda Town, Lahore', status: 'Active', role: 'Managers',
//       docName: 'CNIC_Front.jpg', docUri: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb130?w=800', halls: ['Imperial Grand Hall']
//     }
//   }
// };

export default function BookingDetailScreen() {
  const params = useLocalSearchParams();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

useEffect(() => {
  const bookingId = params.bookingId as string;
  if (!bookingId) {
    console.error('No bookingId provided');
    setIsLoading(false);
    return;
  }
  const bookingRef = doc(db, 'bookings', bookingId);
  const unsubscribe = onSnapshot(bookingRef, async (bookingSnap) => {
    if (!bookingSnap.exists()) {
      Alert.alert('Error', 'Booking not found');
      router.back();
      return;
    }

    const bookingData = bookingSnap.data();
    let customerData: CustomerData | null = null;
    if (bookingData.customerId) {
      try {
        const customerRef = doc(db, 'users', bookingData.customerId);
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
          customerData = { id: customerSnap.id, ...customerSnap.data() };
        }
      } catch (error) {
        console.error('Error fetching customer:', error);
      }
    }

    let hallData: HallData | null = null;
    if (bookingData.hallId) {
      try {
        const hallRef = doc(db, 'halls', bookingData.hallId);
        const hallSnap = await getDoc(hallRef);
        if (hallSnap.exists()) {
          const hallDoc = hallSnap.data();
          hallData = { id: hallSnap.id, ...hallDoc };
          if (hallDoc.managerId) {
            try {
              const managerRef = doc(db, 'users', hallDoc.managerId);
              const managerSnap = await getDoc(managerRef);
              if (managerSnap.exists()) {
                hallData.manager = { id: managerSnap.id, ...managerSnap.data() };
              }
            } catch (error) {
              console.error('Error fetching manager:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching hall:', error);
      }
    }

    const totalAmount = Number(bookingData.totalAmount || 0);
    const advancePaid = Number(bookingData.advancePaid || 0);
    const advanceRequired = Number(bookingData.advanceRequired || 0);
    const paymentStatus = bookingData.paymentStatus;
    
    let mappedPaymentStatus = 'Unpaid';
    if (paymentStatus === 'advance_paid' || paymentStatus === 'Partial') {
      mappedPaymentStatus = 'Partial';
    } else if (paymentStatus === 'fully_paid' || paymentStatus === 'Paid') {
      mappedPaymentStatus = 'Paid';
    } else if (paymentStatus === 'refunded' || paymentStatus === 'Refunded') {
      mappedPaymentStatus = 'Refunded';
    } else {
      if (advancePaid > 0 && advancePaid < totalAmount) {
        mappedPaymentStatus = 'Partial';
      } else if (advancePaid > 0 && advancePaid >= totalAmount) {
        mappedPaymentStatus = 'Paid';
      } else if (totalAmount === 0) {
        mappedPaymentStatus = 'Unpaid';
      }
    }

    const formatAmount = (amount: number) => `PKR ${amount.toLocaleString()}`;
    const commissionPercent = 5;
    const commission = Math.ceil(totalAmount * 0.05);
    const managerShare = totalAmount - commission;
    const formatDate = (timestamp: any) => {
      if (!timestamp) return 'N/A';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getExactTime = (slot: string) => {
      if (slot === 'Morning') return '8:00 AM - 12:00 PM';
      if (slot === 'Afternoon') return '12:00 PM - 4:00 PM';
      if (slot === 'Evening') return '6:00 PM - 10:00 PM';
      return slot || 'N/A';
    };

    const normalizedData: BookingData = {
      id: bookingSnap.id,
      status: bookingData.status || 'Pending',
      bookingDate: formatDate(bookingData.bookingCreatedAt),
      hallName: bookingData.hallName || hallData?.hallName || 'N/A',
      eventDate: bookingData.date || 'N/A',
      eventTime: getExactTime(bookingData.timeSlot),
      eventType: bookingData.functionType || 'N/A',
      guests: bookingData.guestsCount || 0,
      totalAmount: formatAmount(totalAmount),
      advancePaid: formatAmount(advancePaid),
      remainingBalance: formatAmount(totalAmount - advancePaid),
      commission: formatAmount(commission),
      commissionPercent: `${commissionPercent}%`,
      managerShare: formatAmount(managerShare),
      paymentMethod: bookingData.paymentMethod || 'N/A',
      paymentStatus: mappedPaymentStatus,
      paymentDate: formatDate(bookingData.paidAt || bookingData.bookingCreatedAt),
      transactionId: bookingData.transactionId || bookingData.stripePaymentId || 'N/A',
      refundDate: formatDate(bookingData.refundedAt),
      refundTransactionId: bookingData.refundTransactionId || `REF-${bookingSnap.id.slice(-8).toUpperCase()}`,
      customer: customerData,
      hall: hallData,
      raw: bookingData,
    };

    setBooking(normalizedData);
    setIsLoading(false);
  }, (error) => {
    console.error('Error listening to booking:', error);
    Alert.alert('Error', 'Failed to load booking details');
    setIsLoading(false);
  });

  return () => unsubscribe();
}, [params.bookingId]);

  const hideCustomer = params.hideCustomer === 'true';

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'confirmed' || s === 'completed') return '#10B981';
    if (s === 'pending') return '#F59E0B';
    if (s === 'cancelled' || s === 'failed' || s === 'refunded') return '#EF4444';
    return '#6B7280';
  };
  
  const getPaymentStatusLabel = (status: string) => {
    if (status === 'Paid') return 'Fully Paid';
    if (status === 'Partial') return 'Advance Received';
    if (status === 'Refunded') return 'Refunded';
    return 'Awaiting Payment';
  };
  const openCustomerDetails = () => {
    if (!booking) return; 
    if (booking.customer) {
      router.push({
        pathname: '/(adminapp)/account-details' as any,
        params: { userData: JSON.stringify(booking.customer) }
      });
    }
  };

  const openHallDetails = () => {
    if (!booking) return;
    if (booking.hall && booking.hall.id) {
      router.push({
        pathname: '/(adminapp)/hall-details' as any,
        params: { hallId: booking.hall.id } 
      });
    } else if (booking.raw?.hallId) {
      router.push({
        pathname: '/(adminapp)/hall-details' as any,
        params: { hallId: booking.raw.hallId } 
      });
    }
  };
  // const handleRefund = () => {
  //   Alert.alert(
  //     'Process Refund',
  //     `Are you sure you want to refund PKR ${booking.totalAmount} to the customer?`,
  //     [
  //       { text: 'Cancel', style: 'cancel' },
  //       { 
  //         text: 'Yes, Process Refund', 
  //         onPress: async () => {
  //           setIsProcessing(true);
  //           try {
  //             const response = await fetch('https://bondless-python-floral.ngrok-free.dev/api/process-refund', {
  //               method: 'POST',
  //               headers: { 'Content-Type': 'application/json' },
  //               body: JSON.stringify({ bookingId: booking.id })
  //             });
              
  //             const data = await response.json();
              
  //             if (response.ok) {
  //               Alert.alert('Success', 'Refund has been processed successfully.');
  //               setBooking((prev: any) => ({ ...prev, status: 'Refunded' }));
  //             } else {
  //               throw new Error(data.detail || 'Failed to process refund');
  //             }
  //           } catch (error: any) {
  //             Alert.alert('Error', error.message || 'Failed to process refund.');
  //           } finally {
  //             setIsProcessing(false);
  //           }
  //         }
  //       }
  //     ]
  //   );
  // };
const handleRefund = async () => {
  if (!safeBooking) return;
  
  Alert.alert(
    'Confirm Refund',
    `Are you sure you have sent the refund of ${safeBooking.advancePaid} to ${safeBooking.customer?.name || 'the customer'}?\n\nAccount: ${safeBooking.raw?.refundDetails?.accountNumber}`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Yes, Process Refund', 
        style: 'destructive',
        onPress: async () => {
          setIsRefunding(true);
          
          try {
            const response = await fetch('https://bondless-python-floral.ngrok-free.dev/api/process-refund', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                bookingId: safeBooking.id,
                amount: safeBooking.raw?.advancePaid || 0,
                refundMethod: safeBooking.raw?.refundDetails?.paymentMethod,
                accountNumber: safeBooking.raw?.refundDetails?.accountNumber,
              })
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.detail || 'Failed to process refund');
            }
            
            Alert.alert(
              'Refund Successful!', 
              `Refund of ${safeBooking.advancePaid} has been processed.\n\n• Customer notified\n• Manager's wallet updated\n• Transaction ID: REF-${safeBooking.id.slice(-8).toUpperCase()}`
            );
            
          } catch (error: any) {
            console.error('Refund error:', error);
            Alert.alert('Error', error.message || 'Failed to process refund. Please try again.');
          } finally {
            setIsRefunding(false);
          }
        }
      }
    ]
  );
};

  if (isLoading) {
  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loading...</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#5B21B6" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading booking details...</Text>
      </View>
    </SafeAreaView>
  );
}

if (!booking) return null;

  const safeBooking = booking!;
  const isUnpaid = safeBooking.paymentStatus === 'Unpaid';
  const isPartial = safeBooking.paymentStatus === 'Partial';
  const isPaid = safeBooking.paymentStatus === 'Paid';
  const isRefunded = safeBooking.paymentStatus === 'Refunded';

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookingId}>Booking #{booking.id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {booking.status}
            </Text>
          </View>
        </View>

        {!hideCustomer && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.listItem} onPress={openCustomerDetails} activeOpacity={0.7}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemLabel}>Customer</Text>
                <Text style={styles.itemValue}>{booking.customer?.name || 'N/A'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </>
        )}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.listItem} onPress={openHallDetails} activeOpacity={0.7}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemLabel}>Booked Hall</Text>
            <Text style={styles.itemValue}>{booking.hall?.name || booking.hallName || 'N/A'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          <View style={styles.detailRow}><Text style={styles.rowLabel}>Event Date</Text><Text style={styles.rowValue}>{booking.eventDate}</Text></View>
          <View style={styles.divider} />
          <View style={styles.detailRow}><Text style={styles.rowLabel}>Event Time</Text><Text style={styles.rowValue}>{booking.eventTime}</Text></View>
          <View style={styles.divider} />
          <View style={styles.detailRow}><Text style={styles.rowLabel}>Event Type</Text><Text style={styles.rowValue}>{booking.eventType}</Text></View>
          <View style={styles.divider} />
          <View style={styles.detailRow}><Text style={styles.rowLabel}>Number of Guests</Text><Text style={styles.rowValue}>{booking.guests}</Text></View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          
          {isUnpaid && (
            <View style={styles.awaitingPaymentBox}>
              <Ionicons name="time-outline" size={32} color="#F59E0B" />
              <Text style={styles.awaitingPaymentTitle}>Awaiting Customer Payment</Text>
              <Text style={styles.awaitingPaymentText}>
                The manager has approved this request, but the customer has not paid yet. Financial breakdown will appear once payment is received.
              </Text>
            </View>
          )}

          {isPartial && (
            <View style={styles.partialPaymentBox}>
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Total Booking Charges</Text>
                <Text style={[styles.rowValue, styles.totalAmountValue]}>{booking.totalAmount}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Advance Paid</Text>
                <Text style={[styles.rowValue, { color: '#10B981', fontWeight: '700' }]}>{booking.advancePaid}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Remaining Balance</Text>
                <Text style={[styles.rowValue, { color: '#EF4444', fontWeight: '700' }]}>{booking.remainingBalance}</Text>
              </View>
              <View style={styles.divider} />
              {/* <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Payment Method</Text>
                <Text style={styles.rowValue}>{booking.paymentMethod}</Text>
              </View>
              <View style={styles.divider} /> */}
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Payment Status</Text>
                <View style={[styles.miniBadge, { backgroundColor: getStatusColor(booking.paymentStatus) + '20' }]}>
                  <Text style={[styles.miniBadgeText, { color: getStatusColor(booking.paymentStatus) }]}>
                    {getPaymentStatusLabel(booking.paymentStatus)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {isPaid && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Total Amount Paid</Text>
                <Text style={[styles.rowValue, styles.totalAmountValue]}>{booking.totalAmount}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Platform Commission</Text>
                  <Text style={styles.rowSubLabel}>({booking.commissionPercent} of total)</Text>
                </View>
                <Text style={[styles.rowValue, styles.commissionValue]}>{booking.commission}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Manager's Share</Text>
                <Text style={[styles.rowValue, styles.managerShareValue]}>{booking.managerShare}</Text>
              </View>
              <View style={styles.divider} />
              {/* <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Payment Method</Text>
                <Text style={styles.rowValue}>{booking.paymentMethod}</Text>
              </View>
              <View style={styles.divider} /> */}
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Payment Status</Text>
                <View style={[styles.miniBadge, { backgroundColor: getStatusColor(booking.paymentStatus) + '20' }]}>
                  <Text style={[styles.miniBadgeText, { color: getStatusColor(booking.paymentStatus) }]}>{booking.paymentStatus}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Payment Date</Text>
                <Text style={styles.rowValue}>{booking.paymentDate}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Transaction ID</Text>
                <Text style={styles.rowValue}>{booking.transactionId}</Text>
              </View>
            </>
          )}

          {isRefunded && (
            <View style={styles.refundedPaymentBox}>
              <Ionicons name="refresh-circle" size={32} color="#EF4444" />
              <Text style={styles.refundedPaymentTitle}>Payment Refunded</Text>
              <Text style={styles.refundedPaymentText}>
                This booking was cancelled and a full refund of {booking.advancePaid} has been processed back to the customer.
              </Text>
              {/* <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Refund Date</Text>
                <Text style={styles.rowValue}>{booking.paymentDate}</Text>
              </View> */}
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Refund Date</Text>
                <Text style={styles.rowValue}>{booking.refundDate}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Refund Transaction ID</Text>
                <Text style={styles.rowValue}>{booking.refundTransactionId}</Text>
              </View>
            </View>
          )}
        </View>
        {(safeBooking.status === 'cancelled' || safeBooking.status === 'refunded') && 
        safeBooking.raw?.refundDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Account Details</Text>
            <View style={styles.refundAccountBox}>
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Payment Method</Text>
                <Text style={styles.rowValue}>{safeBooking.raw.refundDetails.paymentMethod}</Text>
              </View>
              <View style={styles.divider} />
              
              {safeBooking.raw.refundDetails.paymentMethod === 'bank' && safeBooking.raw.refundDetails.bankName && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.rowLabel}>Bank Name</Text>
                    <Text style={styles.rowValue}>{safeBooking.raw.refundDetails.bankName}</Text>
                  </View>
                  <View style={styles.divider} />
                </>
              )}
              
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>
                  {safeBooking.raw.refundDetails.paymentMethod === 'bank' ? 'Account Number' : 'Mobile Number'}
                </Text>
                <Text style={styles.rowValue}>{safeBooking.raw.refundDetails.accountNumber}</Text>
              </View>
              <View style={styles.divider} />
              
              <View style={styles.detailRow}>
                <Text style={styles.rowLabel}>Account Holder Name</Text>
                <Text style={styles.rowValue}>{safeBooking.raw.refundDetails.accountName}</Text>
              </View>
            </View>
          </View>
        )}

        {(safeBooking.status === 'cancelled') && 
          (safeBooking.paymentStatus === 'Paid' || safeBooking.paymentStatus === 'Partial') && 
          safeBooking.raw?.refundDetails && (
          <View style={styles.refundContainer}> 
            <TouchableOpacity 
              style={[styles.refundBtn, isRefunding && { opacity: 0.6 }]} 
              onPress={handleRefund}
              disabled={isRefunding}
            >
              {isRefunding ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={20} color="#EF4444" />
                  <Text style={styles.refundText}>Process Refund</Text>
                </>
              )}
            </TouchableOpacity>
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 16, paddingBottom: 8, gap: 12 },
  bookingId: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 0 }, 
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  itemInfo: { flex: 1 },
  itemLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 4 },
  itemValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  section: { paddingVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rowLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500', flex: 1 },
  rowSubLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  rowValue: { fontSize: 14, color: '#111827', fontWeight: '600', textAlign: 'right' },
  totalAmountValue: { fontSize: 16, color: '#111827', fontWeight: '800' },
  commissionValue: { fontSize: 16, color: '#5B21B6', fontWeight: '800' },
  managerShareValue: { fontSize: 16, color: '#10B981', fontWeight: '800' },  
  miniBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  miniBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  awaitingPaymentBox: { alignItems: 'center', padding: 20, backgroundColor: '#FFFBEB', borderRadius: 12, borderWidth: 1, borderColor: '#FEF3C7' },
  awaitingPaymentTitle: { fontSize: 16, fontWeight: '700', color: '#92400E', marginTop: 8, marginBottom: 4 },
  awaitingPaymentText: { fontSize: 13, color: '#A16207', textAlign: 'center', lineHeight: 20 },  
  partialPaymentBox: { padding: 16, backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0' },  
  refundedPaymentBox: { alignItems: 'center', padding: 20, backgroundColor: '#FEF2F2', borderRadius: 12, borderWidth: 1, borderColor: '#FECACA' },
  refundedPaymentTitle: { fontSize: 16, fontWeight: '700', color: '#991B1B', marginTop: 8, marginBottom: 4 },
  refundedPaymentText: { fontSize: 13, color: '#B91C1C', textAlign: 'center', lineHeight: 20 },
  refundContainer: { marginTop: 24 },
  refundBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', gap: 6 },
  refundText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  actionButtonsContainer: { marginTop: 24 },
  actionBar: { flexDirection: 'row', gap: 12 },
  refundAccountBox: { padding: 16, backgroundColor: '#FFF7ED', borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA' },
});