import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, TextInput, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { webContainerStyle } from '../../constants/webstyles';
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';
import * as FileSystem from 'expo-file-system/src/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';

export default function CustomerBookingDetailScreen() {
  const params = useLocalSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'jazzcash' | 'easypaisa' | 'bank'>('jazzcash');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [showBankModal, setShowBankModal] = useState(false);

  const [accountNumberError, setAccountNumberError] = useState('');
  const [accountNameError, setAccountNameError] = useState('');
  const [bankNameError, setBankNameError] = useState('');
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);


  const bankOptions = [
    'HBL - Habib Bank Limited',
    'UBL - United Bank Limited',
    'MCB - Muslim Commercial Bank',
    'Meezan Bank',
    'Bank Alfalah',
    'Bank Al Habib',
    'Allied Bank',
    'Askari Bank',
    'Faysal Bank',
    'National Bank of Pakistan',
    'JS Bank',
    'Dubai Islamic Bank',
    'BankIslami Pakistan',
    'Standard Chartered Bank',
    'Citibank Pakistan',
  ];

  useEffect(() => {
    const bookingId = params.bookingId as string;
    if (!bookingId) {
      Alert.alert('Error', 'Booking ID not found.');
      router.back();
      return;
    }
    
    setIsLoading(true);
    const docRef = doc(db, 'bookings', bookingId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) {
        Alert.alert('Error', 'Booking not found in database.');
        router.back();
        return;
      }
      
      const data = docSnap.data();
      const total = Number(data.totalAmount) || Number(data.totalCharges) || 0;
      const paid = Number(data.advancePaid) || Number(data.advanceRequired) || 0;
      const remaining = Number(data.remainingBalance) !== undefined ? Number(data.remainingBalance) : (total - paid);

      const formattedBooking = {
        id: docSnap.id,
        status: data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase() : 'Pending',
        bookingDate: data.bookingCreatedAt?.toDate 
          ? data.bookingCreatedAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) 
          : 'N/A',
        hallName: data.hallName || 'N/A',
        eventDate: data.date || 'N/A',
        eventTime: data.timeSlot || 'N/A',
        eventType: data.functionType || 'N/A',
        guests: data.guestsCount || 'N/A',
        totalAmount: `PKR ${total.toLocaleString()}`,
        advancePaid: `PKR ${paid.toLocaleString()}`,
        remainingBalance: `PKR ${remaining.toLocaleString()}`,
        rawRemainingBalance: remaining, 
        paymentMethod: data.paymentMethod || 'SafePay',
        paymentDate: data.paidAt?.toDate 
          ? data.paidAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) 
          : (data.paymentDate || 'N/A'),
        transactionId: data.transactionId || `SP-${bookingId.slice(-8).toUpperCase()}`,
        refundDate: data.refundDate || '-',
        refundAmount: data.refundAmount ? `PKR ${Number(data.refundAmount).toLocaleString()}` : null,
        refundTransactionId: data.refundTransactionId || '-',
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
      };
      setBooking(formattedBooking);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching booking:", error);
      Alert.alert('Error', 'Failed to load booking details.');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [params.bookingId]);

  // useEffect(() => {
  //   const fetchBookingDetails = async () => {
  //     const bookingId = params.bookingId as string;
  //     if (!bookingId) {
  //       Alert.alert('Error', 'Booking ID not found.');
  //       router.back();
  //       return;
  //     }
  //     try {
  //       setIsLoading(true);
  //       const docRef = doc(db, 'bookings', bookingId);
  //       const docSnap = await getDoc(docRef);
  //       if (docSnap.exists()) {
  //         const data = docSnap.data();
  //         const total = Number(data.totalAmount) || Number(data.totalCharges) || 0;
  //         const paid = Number(data.advancePaid) || Number(data.advanceRequired) || 0;
  //         const remaining = Number(data.remainingBalance) !== undefined ? Number(data.remainingBalance) : (total - paid);

  //         const formattedBooking = {
  //           id: docSnap.id,
  //           status: data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase() : 'Pending',
  //           bookingDate: data.bookingCreatedAt?.toDate 
  //             ? data.bookingCreatedAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) 
  //             : 'N/A',
  //           hallName: data.hallName || 'N/A',
  //           eventDate: data.date || 'N/A',
  //           eventTime: data.timeSlot || 'N/A',
  //           eventType: data.functionType || 'N/A',
  //           guests: data.guestsCount || 'N/A',
  //           totalAmount: `PKR ${total.toLocaleString()}`,
  //           advancePaid: `PKR ${paid.toLocaleString()}`,
  //           remainingBalance: `PKR ${remaining.toLocaleString()}`,
  //           rawRemainingBalance: remaining, 
  //           paymentMethod: data.paymentMethod || 'SafePay',
  //           paymentDate: data.paidAt?.toDate 
  //             ? data.paidAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) 
  //             : (data.paymentDate || 'N/A'),
  //           transactionId: data.transactionId || `SP-${bookingId.slice(-8).toUpperCase()}`,
  //           refundDate: data.refundDate || '-',
  //           refundAmount: data.refundAmount ? `PKR ${Number(data.refundAmount).toLocaleString()}` : null,
  //           refundTransactionId: data.refundTransactionId || '-',
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
  //         };
  //         setBooking(formattedBooking);
  //       } else {
  //         Alert.alert('Error', 'Booking not found in database.');
  //         router.back();
  //       }
  //     } catch (error) {
  //       console.error("Error fetching booking:", error);
  //       Alert.alert('Error', 'Failed to load booking details.');
  //       router.back();
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   fetchBookingDetails();
  // }, [params.bookingId]);

  const getBannerConfig = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'pending') {
      return { icon: 'checkmark-circle', color: '#F59E0B', title: 'Request Approved', desc: 'Your request has been approved. Please complete the payment to confirm your booking.' };
    }
    if (s === 'confirmed') {
      return { icon: 'checkmark-circle', color: '#10B981', title: 'Booking Confirmed', desc: 'Your booking is confirmed. Advance payment received.' };
    }
    if (s === 'completed') {
      return { icon: 'checkmark-done-circle', color: '#10B981', title: 'Booking Completed', desc: 'Your event has been successfully completed and all payments are settled.' };
    }
    if (s === 'cancelled') {
      return { icon: 'time-outline', color: '#F59E0B', title: 'Booking Cancelled', desc: 'Your booking was cancelled. The refund is currently being processed by the admin.' };
    }
    if (s === 'refunded') {
      return { icon: 'refresh-circle', color: '#EF4444', title: 'Payment Refunded', desc: 'Your refund has been successfully processed and sent to your account.' };
    }
    return { icon: 'information-circle', color: '#6B7280', title: 'Unknown Status', desc: '' };
  };

  const validateAccountNumber = () => {
    const trimmed = accountNumber.trim().replace(/[\s-]/g, '');
    if (!trimmed) {
      setAccountNumberError(paymentMethod === 'bank' ? 'Account number / IBAN is required' : 'Mobile number is required');
      return false;
    }
    if (paymentMethod === 'bank') {
      const ibanRegex = /^PK\d{2}[A-Z]{4}\d{16}$/i;
      const accRegex = /^\d{10,16}$/;
      if (ibanRegex.test(trimmed) || accRegex.test(trimmed)) {
        setAccountNumberError('');
        return true;
      }
      setAccountNumberError('Enter valid IBAN or 10-16 digit account number');
      return false;
    } else {
      const mobileRegex = /^03\d{9}$/;
      if (mobileRegex.test(trimmed)) {
        setAccountNumberError('');
        return true;
      }
      setAccountNumberError('Enter valid 11-digit mobile number');
      return false;
    }
  };

  const validateAccountName = () => {
    const trimmed = accountName.trim();
    if (!trimmed || trimmed.length < 3) {
      setAccountNameError('Name must be at least 3 characters');
      return false;
    }
    if (!/^[a-zA-Z\s.]+$/.test(trimmed)) {
      setAccountNameError('Name can only contain letters and spaces');
      return false;
    }
    setAccountNameError('');
    return true;
  };

  const validateBankName = () => {
    if (paymentMethod !== 'bank') return true;
    if (!bankName) {
      setBankNameError('Please select your bank');
      return false;
    }
    setBankNameError('');
    return true;
  };
  const openHallDetails = () => {
    if (booking?.hall?.id) {
      router.push({ pathname: '/(customerapp)/hall-details' as any, params: { id: booking.hall.id, hallData: JSON.stringify(booking.hall) } });
    }
  };

  const handleCancelBooking = () => {
  Alert.alert(
    'Cancel Booking',
    'Are you sure you want to cancel this booking? You will need to provide account details for refund.',
    [
      { text: 'No, Keep It', style: 'cancel' },
      { 
        text: 'Yes, Cancel', 
        style: 'destructive',
        onPress: () => {
          setShowRefundModal(true);
        }
      }
    ]
  );
};

const processCancellation = async () => {
  if (!booking) return;
  const isAccValid = validateAccountNumber();
  const isNameValid = validateAccountName();
  const isBankValid = validateBankName();
  if (!isAccValid || !isNameValid || !isBankValid) {
    Alert.alert('Error', 'Please fill all details correctly');
    return;
  }
  setIsProcessing(true);
  
   try {
    const bookingRef = doc(db, 'bookings', booking.id);
    await updateDoc(bookingRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancellationReason: 'Customer requested cancellation',
      refundDetails: {
        paymentMethod: paymentMethod,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        bankName: paymentMethod === 'bank' ? bankName.trim() : '',
        requestedAt: serverTimestamp(),
        refundAmount: booking.advancePaid, 
      },
      refundStatus: 'pending', 
    });

    try {
      const response = await fetch('https://bondless-python-floral.ngrok-free.dev/api/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          reason: 'Customer requested cancellation'
        })
      });
      
      if (!response.ok) {
        console.warn('Backend API failed, but booking cancelled in Firebase');
      }
    } catch (apiError) {
      console.warn('Backend API error:', apiError);
    }

    Alert.alert(
      'Cancellation Request Sent',
      'Your booking has been cancelled. Refund will be processed by admin within 3-5 business days.',
      [{ 
        text: 'OK', 
        onPress: () => {
          setShowRefundModal(false);
          setBooking((prev: any) => ({ ...prev, status: 'Cancelled' }));
          setAccountNumber('');
          setAccountName('');
          setBankName('');
        }
      }]
    );
  } catch (error: any) {
    console.error('Cancellation error:', error);
    Alert.alert('Error', error.message || 'Failed to cancel booking');
  } finally {
    setIsProcessing(false);
  }
};

const handleDownloadReceipt = async () => {
  if (!booking) return;
  setIsDownloadingReceipt(true);   
  const fileName = `receipt_${booking.id}.pdf`;
  const fileUri = FileSystem.cacheDirectory + fileName;

  try {
    const response = await fetch('https://bondless-python-floral.ngrok-free.dev/api/generate-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: booking.id }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate receipt (status: ${response.status})`);
    }

    const blob = await response.blob();
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64data = reader.result as string;
        await FileSystem.writeAsStringAsync(fileUri, base64data.split(',')[1], {
          encoding: 'base64',
        });
        setIsDownloadingReceipt(false);   
        Alert.alert(
          'Receipt Ready',
          'Your receipt has been generated.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Share',
              onPress: async () => {
                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                  await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Share Receipt',
                  });
                }
              },
            },
            {
              text: 'Open',
              onPress: async () => {
                if (Platform.OS === 'android') {
                  const contentUri = await FileSystem.getContentUriAsync(fileUri);
                  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                    data: contentUri,
                    flags: 1,
                    type: 'application/pdf',
                  });
                } else {
                  await Linking.openURL(fileUri);
                }
              },
            },
          ]
        );
      } catch (saveError) {
        console.error('Save error:', saveError);
        setIsDownloadingReceipt(false);
        Alert.alert('Error', 'Failed to save receipt.');
      }
    };

    reader.readAsDataURL(blob);

  } catch (error: any) {
    console.error('Receipt download error:', error);
    setIsDownloadingReceipt(false);
    Alert.alert('Error', 'Failed to generate receipt. Please try again.');
  }
};

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) return null;

  const banner = getBannerConfig(booking.status);
  const isCancelled = booking.status?.toLowerCase() === 'cancelled';
  const isRefunded = booking.status?.toLowerCase() === 'refunded';
  const isConfirmed = booking.status?.toLowerCase() === 'confirmed';
  const isCompleted = booking.status?.toLowerCase() === 'completed'; 
  const isPending = booking.status?.toLowerCase() === 'pending';
  const hasRemainingBalance = booking.rawRemainingBalance > 0;

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
       <TouchableOpacity 
          onPress={handleDownloadReceipt} 
          style={styles.backBtn}
          disabled={isDownloadingReceipt}
        >
          {isDownloadingReceipt ? (
            <ActivityIndicator size="small" color="#5B21B6" />
          ) : (
            <Ionicons name="download-outline" size={24} color="#5B21B6" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.statusBanner, { borderColor: banner.color + '40', backgroundColor: banner.color + '10' }]}>
          <Ionicons name={banner.icon as any} size={40} color={banner.color} />
          <Text style={[styles.bannerTitle, { color: banner.color }]}>{banner.title}</Text>
          <Text style={styles.bannerDesc}>{banner.desc}</Text>
        </View>

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
          <View style={styles.detailRow}><Text style={styles.rowLabel}>Expected Guests</Text><Text style={styles.rowValue}>{booking.guests}</Text></View>
        </View>
        <View style={styles.divider} />

        {!isPending && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isRefunded ? 'Refund Details' : 'Payment & Financial Details'}
            </Text>
            
            {!isRefunded ? (
              <>
                <View style={styles.detailRow}><Text style={styles.rowLabel}>Total Charges</Text><Text style={[styles.rowValue, styles.totalAmountValue]}>{booking.totalAmount}</Text></View>
                <View style={styles.divider} />
                <View style={styles.detailRow}><Text style={styles.rowLabel}>Advance Paid</Text><Text style={[styles.rowValue, { color: '#10B981', fontWeight: '700' }]}>{booking.advancePaid}</Text></View>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.rowLabel}>{isCompleted ? 'Remaining Balance (Settled)' : 'Remaining Balance'}</Text>
                  <Text style={[styles.rowValue, { color: hasRemainingBalance ? '#EF4444' : '#10B981', fontWeight: '700' }]}>{booking.remainingBalance}</Text>
                </View>
                <View style={styles.divider} />
                {/* <View style={styles.detailRow}><Text style={styles.rowLabel}>Payment Method</Text><Text style={styles.rowValue}>{booking.paymentMethod}</Text></View>
                <View style={styles.divider} /> */}
                <View style={styles.detailRow}><Text style={styles.rowLabel}>Payment Date</Text><Text style={styles.rowValue}>{booking.paymentDate}</Text></View>
                <View style={styles.divider} />
                <View style={styles.detailRow}><Text style={styles.rowLabel}>Transaction ID</Text><Text style={styles.rowValue}>{booking.transactionId}</Text></View>
              </>
            ) : (
              <>
                <View style={styles.detailRow}><Text style={styles.rowLabel}>Refunded Amount</Text><Text style={[styles.rowValue, { color: '#EF4444', fontWeight: '700' }]}>{booking.totalAmount}</Text></View>
                <View style={styles.divider} />
                <View style={styles.detailRow}><Text style={styles.rowLabel}>Refund Date</Text><Text style={styles.rowValue}>{booking.refundDate !== '-' ? booking.refundDate : booking.paymentDate}</Text></View>
                <View style={styles.divider} />
                <View style={styles.detailRow}><Text style={styles.rowLabel}>Refund Transaction ID</Text><Text style={styles.rowValue}>{booking.refundTransactionId !== '-' ? booking.refundTransactionId : booking.transactionId}</Text></View>
              </>
            )}
          </View>
        )}
        {isCancelled && (
          <>
            <View style={styles.awaitingRefundBadge}>
              <Ionicons name="hourglass-outline" size={18} color="#F59E0B" />
              <Text style={styles.awaitingRefundText}>Awaiting Admin Approval for Refund</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}><Text style={styles.rowLabel}>Refund Amount</Text><Text style={[styles.rowValue, { color: '#F59E0B', fontWeight: '700' }]}>{booking.refundAmount || booking.advancePaid || 'PKR 0'}</Text></View>
            <View style={styles.divider} />
            <View style={styles.detailRow}><Text style={styles.rowLabel}>Cancellation Date</Text><Text style={styles.rowValue}>{booking.paymentDate}</Text></View>
          </>
        )}
        <View style={styles.actionContainer}>
          {isPending && (
            <TouchableOpacity style={styles.payBtnFull} onPress={() => router.push(`/(customerapp)/payment?bookingId=${booking.id}` as any)}>
              <Ionicons name="card-outline" size={20} color="#FFFFFF" />
              <Text style={styles.payBtnText}>Pay Advance Now</Text>
            </TouchableOpacity>
          )}

          {isConfirmed && hasRemainingBalance && (
            <TouchableOpacity style={styles.payBtnFull} onPress={() => router.push(`/(customerapp)/payment?bookingId=${booking.id}&isRemaining=true` as any)}>
              <Ionicons name="card-outline" size={20} color="#FFFFFF" />
              <Text style={styles.payBtnText}>Pay Remaining Balance</Text>
            </TouchableOpacity>
          )}

          {isConfirmed && (
            <View style={styles.secondaryRow}>
              <TouchableOpacity 
                style={styles.chatBtnSmall} 
                onPress={() => router.push(`/(customerapp)/chat?bookingId=${booking.id}` as any)}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#5B21B6" />
                <Text style={styles.chatBtnSmallText}>Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.cancelBtnSmall, isProcessing && { opacity: 0.6 }]} 
                onPress={handleCancelBooking}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                    <Text style={styles.cancelBtnSmallText}>Cancel</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {isCompleted && (
            <TouchableOpacity 
              style={[styles.chatBtnSmall, { flex: 1 }]} 
              onPress={() => router.push(`/(customerapp)/chat?bookingId=${booking.id}` as any)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#5B21B6" />
              <Text style={styles.chatBtnSmallText}>Chat with Hall</Text>
            </TouchableOpacity>
          )}

          {isCancelled && (
            <TouchableOpacity 
              style={[styles.chatBtnSmall, { flex: 1 }]} 
              onPress={() => router.push(`/(customerapp)/chat?bookingId=${booking.id}` as any)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#5B21B6" />
              <Text style={styles.chatBtnSmallText}>Chat with Hall</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
      <Modal visible={showRefundModal} transparent animationType="fade">
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Refund Account Details</Text>
              
              <View style={styles.refundInfoBox}>
                <Ionicons name="information-circle-outline" size={16} color="#5B21B6" />
                <Text style={styles.refundInfoText}>
                  Please provide your account details for refund of {booking?.advancePaid}
                </Text>
              </View>

              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.methodRow}>
                <TouchableOpacity
                  style={[styles.methodBtn, paymentMethod === 'jazzcash' && styles.methodBtnActive]}
                  onPress={() => setPaymentMethod('jazzcash')}
                >
                  <Text style={[styles.methodText, paymentMethod === 'jazzcash' && styles.methodTextActive]}>JazzCash</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodBtn, paymentMethod === 'easypaisa' && styles.methodBtnActive]}
                  onPress={() => setPaymentMethod('easypaisa')}
                >
                  <Text style={[styles.methodText, paymentMethod === 'easypaisa' && styles.methodTextActive]}>EasyPaisa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodBtn, paymentMethod === 'bank' && styles.methodBtnActive]}
                  onPress={() => setPaymentMethod('bank')}
                >
                  <Text style={[styles.methodText, paymentMethod === 'bank' && styles.methodTextActive]}>Bank</Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === 'bank' && (
                <>
                  <Text style={styles.inputLabel}>Bank Name</Text>
                  <TouchableOpacity 
                    style={[styles.input, styles.bankSelectBtn, bankNameError && styles.inputError]}
                    onPress={() => setShowBankModal(true)}
                  >
                    <Text style={[styles.bankSelectText, bankName && styles.bankSelectTextActive]}>
                      {bankName || 'Select your bank'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
                  </TouchableOpacity>
                  {bankNameError ? <Text style={styles.errorText}>{bankNameError}</Text> : null}
                </>
              )}

              <Text style={styles.inputLabel}>
                {paymentMethod === 'bank' ? 'Account Number / IBAN' : 'Mobile Number'}
              </Text>
              <TextInput
                style={[styles.input, accountNumberError && styles.inputError]}
                placeholder={paymentMethod === 'bank' ? 'e.g., PK36HABB0000000000000000' : 'e.g., 03001234567'}
                placeholderTextColor="#9CA3AF"
                keyboardType={paymentMethod === 'bank' ? 'default' : 'phone-pad'}
                value={accountNumber}
                onChangeText={setAccountNumber}
                onBlur={validateAccountNumber}
              />
              {accountNumberError ? <Text style={styles.errorText}>{accountNumberError}</Text> : null}

              <Text style={styles.inputLabel}>Account Holder Name</Text>
              <TextInput
                style={[styles.input, accountNameError && styles.inputError]}
                placeholder="Name as registered on account"
                placeholderTextColor="#9CA3AF"
                value={accountName}
                onChangeText={setAccountName}
                onBlur={validateAccountName}
              />
              {accountNameError ? <Text style={styles.errorText}>{accountNameError}</Text> : null}

              <TouchableOpacity 
                style={[styles.submitBtn, isProcessing && { opacity: 0.6 }]} 
                onPress={processCancellation}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>Submit Cancellation</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelModalBtn}
                onPress={() => {
                  setShowRefundModal(false);
                  setAccountNumber('');
                  setAccountName('');
                  setBankName('');
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showBankModal} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.bankModalOverlay}
          activeOpacity={1}
          onPress={() => setShowBankModal(false)}
        >
          <View style={styles.bankModalContent}>
            <Text style={styles.bankModalTitle}>Select Bank</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {bankOptions.map((bank) => (
                <TouchableOpacity
                  key={bank}
                  style={[styles.bankOption, bankName === bank && styles.bankOptionActive]}
                  onPress={() => {
                    setBankName(bank);
                    setBankNameError('');
                    setShowBankModal(false);
                  }}
                >
                  <Ionicons name="business-outline" size={20} color="#5B21B6" />
                  <Text style={styles.bankOptionText}>{bank}</Text>
                  {bankName === bank && <Ionicons name="checkmark" size={20} color="#5B21B6" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.bankModalCancel}
              onPress={() => setShowBankModal(false)}
            >
              <Text style={styles.bankModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  statusBanner: { alignItems: 'center', padding: 24, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  bannerTitle: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  bannerDesc: { fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 20 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  itemInfo: { flex: 1 },
  itemLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 4 },
  itemValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 0 },
  section: { paddingVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rowLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500', flex: 1 },
  rowValue: { fontSize: 14, color: '#111827', fontWeight: '600', textAlign: 'right' },
  totalAmountValue: { fontSize: 16, color: '#111827', fontWeight: '800' },
  actionContainer: { marginTop: 32, gap: 16 },
  payBtnFull: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 12, backgroundColor: '#10B981', gap: 8 },
  secondaryActions: { flexDirection: 'row', gap: 12 },
  downloadBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#5B21B6', gap: 8 },
  downloadBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  chatBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#E9D5FF', gap: 8 },
  chatBtnText: { fontSize: 14, fontWeight: '700', color: '#5B21B6' },
  cancelBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', gap: 8 },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  payBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  awaitingRefundBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF3C7', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, marginVertical: 8, gap: 8 },
  awaitingRefundText: { fontSize: 13, fontWeight: '700', color: '#D97706' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
modalScrollContent: { flexGrow: 1, justifyContent: 'center', minWidth: 300 },
modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20, textAlign: 'center' },
refundInfoBox: { flexDirection: 'row', backgroundColor: '#F5F3FF', borderRadius: 8, padding: 12, marginBottom: 20, gap: 8 },
refundInfoText: { flex: 1, fontSize: 12, color: '#4B5563', lineHeight: 18 },
inputLabel: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 },
input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#111827', marginBottom: 16 },
methodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
methodBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB' },
methodBtnActive: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
methodText: { fontSize: 13, color: '#4B5563', fontWeight: '600' },
methodTextActive: { color: '#FFFFFF' },
bankSelectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
bankSelectText: { fontSize: 14, color: '#9CA3AF' },
bankSelectTextActive: { color: '#111827', fontWeight: '600' },
submitBtn: { backgroundColor: '#EF4444', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
cancelModalBtn: { paddingVertical: 12, alignItems: 'center' },
cancelText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
inputError: { borderColor: '#EF4444' },
errorText: { color: '#EF4444', fontSize: 12, marginTop: -12, marginBottom: 12 },
bankModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
bankModalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
bankModalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' },
bankOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginBottom: 8, gap: 12 },
bankOptionActive: { borderColor: '#5B21B6', backgroundColor: '#F5F3FF' },
bankOptionText: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
bankModalCancel: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
bankModalCancelText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
chatBtnSmall: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#E9D5FF', gap: 6 },
chatBtnSmallText: { fontSize: 14, fontWeight: '700', color: '#5B21B6' },
secondaryRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
cancelBtnSmall: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', gap: 6 },
cancelBtnSmallText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});