// app/(customerapp)/payment.tsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview'; 
import { webContainerStyle } from '../../constants/webstyles';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig'; 

export default function PaymentScreen() {
  const params = useLocalSearchParams();
  const bookingId = params.bookingId as string;
  const isRemaining = params.isRemaining === 'true'; 
  const isWebSuccess = params.status === 'success'; 

  const [isFinalPayment, setIsFinalPayment] = useState(isRemaining);
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [payAmount, setPayAmount] = useState(''); 
  const [showSafePayModal, setShowSafePayModal] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) {
        Alert.alert('Error', 'No booking ID found');
        router.back();
        return;
      }
      try {
        setIsLoading(true);
        let docRef = doc(db, 'bookings', bookingId);
        let bookingSnap = await getDoc(docRef);
        if (!bookingSnap.exists()) {
          docRef = doc(db, 'requests', bookingId);
          bookingSnap = await getDoc(docRef);
        }
        if (bookingSnap.exists()) {
          const data = bookingSnap.data();
          setBooking({
            id: bookingSnap.id,
            hallName: data.hallName || data.hall?.name || 'Unknown Hall',
            functionType: data.functionType || data.eventType || 'Event',
            eventDate: data.eventDate || data.date || 'Date not set',
            eventTime: data.eventTime || data.timeSlot || 'Time not set',
            guestsCount: Number(data.guestsCount || data.guests) || 0, 
            totalCharges: Number(data.totalCharges || data.totalAmount) || 0,
            advanceRequired: Number(data.advanceRequired || data.advancePayment) || 0,
            remainingBalance: Number(data.remainingBalance) || 0,
            advancePaid: Number(data.advancePaid) || 0,
          });
          const advance = Number(data.advanceRequired || data.advancePayment) || 0;
          const remaining = Number(data.remainingBalance) || 0;
          const total = Number(data.totalCharges || data.totalAmount) || 0;
          const advancePd = Number(data.advancePaid) || 0;
          if (isRemaining && remaining > 0) {
            setPayAmount(remaining.toString());
          } else {
            setPayAmount(advance > 0 ? advance.toString() : total.toString());
          }
        } else {
          throw new Error('Booking/Request details not found in database');
        }
      } catch (error: any) {
        console.error("Fetch Error:", error);
        Alert.alert('Error', error.message || 'Failed to load booking details.');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchBookingDetails();
  }, [bookingId]);
  
  useEffect(() => {
    if (Platform.OS !== 'web' || !paymentUrl) return;
    const unsubscribe = onSnapshot(doc(db, 'bookings', bookingId), (snap) => {
      const data = snap.data();
      if (data?.paymentStatus === 'advance_paid' || data?.paymentStatus === 'fully_paid' || data?.paymentStatus === 'paid') {
        setIsSuccess(true);
      }
    });

    return () => unsubscribe();
  }, [paymentUrl]);

   const formatCurrency = (amount: number | undefined) => {
    return `PKR ${(amount || 0).toLocaleString()}`;
  };

  const validatePayment = () => {
    if (!booking) return false;
    const amount = parseFloat(payAmount);
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return false;
    }
    if (isFinalPayment) {
      if (amount < booking.remainingBalance) {
        Alert.alert('Error', `Remaining balance is ${formatCurrency(booking.remainingBalance)}`);
        return false;
      }
    } else {
      if (amount < booking.advanceRequired) {
        Alert.alert('Error', `Minimum advance payment is ${formatCurrency(booking.advanceRequired)}`);
        return false;
      }
    }
    return true;
};

  // const handlePayment = async () => {
  //   if (!validatePayment()) return;
  //    setIsProcessing(true);
  //   try {
  //     await new Promise(resolve => setTimeout(resolve, 1500));
  //     setPaymentUrl('https://sandbox.api.getsafepay.com/components?env=sandbox'); 
  //     setShowSafePayModal(true);
  //     setIsProcessing(false);
  //   } catch (error) {
  //     setIsProcessing(false);
  //     Alert.alert('Error', 'Failed to initialize payment. Please try again.');
  //   }
  // };

  //   const handlePayment = async () => {
  //   if (!validatePayment()) return;
  //   setIsProcessing(true);

  //   try {
  //     // const LOCAL_BACKEND_URL = 'http://192.168.97.150:8000'; 
  //     const LOCAL_BACKEND_URL = 'https://bondless-python-floral.ngrok-free.dev';

  //     const response = await fetch(`${LOCAL_BACKEND_URL}/api/create-payment`, {
  //       method: 'POST',
  //       headers: { 
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         bookingId: bookingId,
  //         amount: parseFloat(payAmount),
  //       }),
  //     });

  //     const data = await response.json();
  //     if (response.ok && data.success && data.checkoutUrl) {
  //       setPaymentUrl(data.checkoutUrl);
  //       setShowSafePayModal(true);
  //     } else {
  //       throw new Error(data.detail || 'Payment initialization failed');
  //     }
      
  //     setIsProcessing(false);
  //   } catch (error: any) {
  //     setIsProcessing(false);
  //     console.error("Payment Error:", error);
  //     Alert.alert('Error', error.message || 'Failed to connect to payment gateway. Check if backend is running.');
  //   }
  // };

  const handlePayment = async () => {
    if (!validatePayment()) return;
    setIsProcessing(true);

    try {
      const LOCAL_BACKEND_URL = 'https://bondless-python-floral.ngrok-free.dev';
      // const API_URL = 'http://192.168.1.22:8001/api/send-otp';         
      const frontendUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${LOCAL_BACKEND_URL}/api/create-payment`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: bookingId,
          amount: parseFloat(payAmount),
          frontendUrl: frontendUrl,
        }),
      });

      const data = await response.json();
      console.log("Backend Full Response:", data);
      console.log("FINAL CHECKOUT URL:", data.checkoutUrl); 

      if (response.ok && data.success && data.checkoutUrl) {
        setPaymentUrl(data.checkoutUrl);
        if (Platform.OS === 'web') {
          window.location.href = data.checkoutUrl;   
        } else {
        setShowSafePayModal(true);
        }
      } else {
        throw new Error(data.detail || 'Payment initialization failed');
      }
      
      setIsProcessing(false);
    } catch (error: any) {
      setIsProcessing(false);
      console.error("Payment Error:", error);
      Alert.alert('Error', error.message || 'Failed to connect to payment gateway.');
    }
  };

  // const handleWebViewNavigation = (navState: any) => {
  //   const { url } = navState;
  //   if (url.includes('success') || url.includes('completed')) {
  //     setShowSafePayModal(false);
  //     setIsSuccess(true);
  //   } else if (url.includes('cancel') || url.includes('failed')) {
  //     setShowSafePayModal(false);
  //     Alert.alert('Payment Cancelled', 'You have cancelled the payment.');
  //   }
  // };
const handleWebViewNavigation = (navState: any) => {
  const { url, loading } = navState;
  
  console.log("WebView Navigation:", url, "Loading:", loading);
  if (loading) return;
  const backendUrl = "https://bondless-python-floral.ngrok-free.dev";
  if (url.startsWith(`${backendUrl}/api/payment-success`) || url.includes("eventhall://payment-success")) {
    console.log("Payment Success Detected");
    setShowSafePayModal(false);
    setIsSuccess(true);
    return;
  }
  if (url.startsWith(`${backendUrl}/api/payment-cancel`) || url.includes("eventhall://payment-cancel")) {
    console.log("Payment Cancelled Detected");
    setShowSafePayModal(false);
    Alert.alert('Payment Cancelled', 'Your payment was cancelled.');
    return;
  }
  if (url.includes("/external/complete")) {
    console.log("SafePay External Complete");
    setShowSafePayModal(false);
    setIsSuccess(true);
    return;
  }
  
  if (url.includes("/external/error")) {
    console.log("SafePay External Error");
    setShowSafePayModal(false);
    Alert.alert('Payment Failed', 'Payment was not completed.');
    return;
  }
};

  if (isLoading) {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#5B21B6" />
        <Text style={styles.processingText}>Loading Booking Details...</Text>
      </View>
    );
  }

  if (isSuccess && booking) {
    const paidAmount = parseFloat(payAmount) || 0;
    return (
      <View style={styles.successContainer}>
        <View style={styles.successContent}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successAmount}>{formatCurrency(paidAmount)}</Text>
          <Text style={styles.successMessage}>
            {isFinalPayment 
              ? `Your final payment for ${booking.hallName} has been received. Your booking is now fully completed!` 
              : `Your advance payment for ${booking.hallName} has been received. Your booking is now confirmed.`}
          </Text>
          <View style={styles.transactionBox}>
            <Text style={styles.transactionLabel}>Transaction ID</Text>
            <Text style={styles.transactionValue}>SP{Date.now().toString().slice(-8)}</Text>
          </View>
          <TouchableOpacity style={styles.doneButton} onPress={() => router.replace('/(customerapp)/home')}>
            <Text style={styles.doneButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!booking) return null;

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.titleText}>Payment</Text> 
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Hall Name</Text><Text style={styles.summaryValue}>{booking.hallName}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Event Type</Text><Text style={styles.summaryValue}>{booking.functionType}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Event Date</Text><Text style={styles.summaryValue}>{booking.eventDate}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Event Time</Text><Text style={styles.summaryValue}>{booking.eventTime}</Text></View>
           <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Expected Guests</Text><Text style={styles.summaryValue}>{booking.guestsCount} Guests</Text></View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total Booking Charges</Text><Text style={styles.summaryValue}>{formatCurrency(booking.totalCharges)}</Text></View>
          {/* <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{isFinalPayment ? 'Remaining Balance (Due Now)' : 'Advance Payment (Due Now)'}</Text><Text style={[styles.summaryValue, { color: '#5B21B6', fontWeight: '700' }]}>{formatCurrency(parseFloat(payAmount) || 0)}</Text></View>          
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Remaining Balance</Text><Text style={styles.summaryValue}>{formatCurrency(booking.remainingBalance)}</Text></View> */}
          {isFinalPayment ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Advance Already Paid</Text>
                <Text style={[styles.summaryValue, { color: '#10B981', fontWeight: '600' }]}>
                  {formatCurrency(booking.advancePaid)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Remaining Balance (Due Now)</Text>
                <Text style={[styles.summaryValue, { color: '#5B21B6', fontWeight: '700' }]}>
                  {formatCurrency(parseFloat(payAmount) || 0)}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Advance Payment (Due Now)</Text>
                <Text style={[styles.summaryValue, { color: '#5B21B6', fontWeight: '700' }]}>
                  {formatCurrency(parseFloat(payAmount) || 0)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Remaining Balance (After this)</Text>
                <Text style={styles.summaryValue}>{formatCurrency(booking.remainingBalance)}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.paymentMethodCard}>
          <View style={styles.methodHeader}>
            <Ionicons name="shield-checkmark" size={24} color="#5B21B6" />
            <Text style={styles.methodTitle}>Secure Payment</Text>
          </View>
          <Text style={styles.methodDesc}>
            Your payment information is protected with bank-grade encryption.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Amount to Pay (PKR)</Text>
          <TextInput 
            style={styles.input}
            placeholder={`Min. ${booking.advanceRequired}`}
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={payAmount}
            editable={false}
            onChangeText={setPayAmount}
          />
        </View>

        <TouchableOpacity 
          style={[styles.payButton, isProcessing && styles.payButtonDisabled]} 
          onPress={handlePayment} 
          activeOpacity={0.8}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.payButtonText}>Pay {formatCurrency(parseFloat(payAmount) || 0)} Securely</Text>
            </>
          )}
        </TouchableOpacity>
        
        <View style={styles.securityNote}>
          <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
          <Text style={styles.securityText}>Your sensitive data will be secure.</Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {Platform.OS !== 'web' && (
      <Modal visible={showSafePayModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity onPress={() => setShowSafePayModal(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>SafePay Secure Checkout</Text>
            <View style={{ width: 24 }} />
          </View>
          {paymentUrl ? (
            <WebView 
              source={{ uri: paymentUrl }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              thirdPartyCookiesEnabled={true}
              sharedCookiesEnabled={true}
              originWhitelist={['*']}
              userAgent="Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
              startInLoadingState={true}
              onNavigationStateChange={handleWebViewNavigation}
              onLoadStart={() => console.log("WebView Load Started")}
              onLoadEnd={() => console.log("WebView Load Ended")}
              renderLoading={() => (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#5B21B6" />
                  <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading SafePay Checkout...</Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#5B21B6" />
              <Text style={{ marginTop: 10, color: '#6B7280' }}>Preparing payment...</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    )}
      {/* <Modal visible={showSafePayModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity onPress={() => setShowSafePayModal(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>SafePay Secure Checkout</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
              <Ionicons name="card" size={40} color="#5B21B6" />
            </View>
            
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
              Pay PKR {parseFloat(payAmount).toLocaleString()}
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 8 }}>
              Order ID: {bookingId}
            </Text>
            
            <TouchableOpacity 
              style={{ 
                backgroundColor: isProcessing ? '#9CA3AF' : '#10B981', 
                paddingVertical: 16, 
                paddingHorizontal: 32, 
                borderRadius: 12, 
                width: '100%', 
                alignItems: 'center', 
                marginBottom: 16,
                opacity: isProcessing ? 0.7 : 1.0
              }}
              disabled={isProcessing} 
              onPress={async () => {
                setIsProcessing(true);
                
                try {
                  const response = await fetch('https://bondless-python-floral.ngrok-free.dev/api/safepay-webhook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `tracker=mock_track_123&signature=mock_signature&order_id=${bookingId}`
                  });
                  
                  if (response.ok) {
                    setShowSafePayModal(false); 
                    setIsSuccess(true);         
                  } else {
                    throw new Error("Webhook failed");
                  }
                } catch (error) {
                  console.error("Webhook simulation error:", error);
                  Alert.alert("Error", "Failed to simulate payment. Check backend.");
                } finally {
                  setIsProcessing(false);
                }
              }}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                  Simulate Successful Payment
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ paddingVertical: 12 }}
              onPress={() => {
                setShowSafePayModal(false);
                Alert.alert('Cancelled', 'Payment was cancelled.');
              }}
            >
              <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '600' }}>Cancel Payment</Text>
            </TouchableOpacity>
          </View> */}
        {/* </SafeAreaView>
      </Modal> */}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 80 }, 
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 30, paddingBottom: 20 },
  titleText: { fontSize: 24, fontWeight: '700', color: '#111827' }, 
  summaryCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: '#E5E7EB' },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  summaryValue: { fontSize: 13, color: '#111827', fontWeight: '600', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  paymentMethodCard: { backgroundColor: '#F5F3FF', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#DDD6FE' },
  methodHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  methodTitle: { fontSize: 16, fontWeight: '700', color: '#5B21B6' },
  methodDesc: { fontSize: 13, color: '#4B5563', lineHeight: 20 },
  formContainer: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#111827', backgroundColor: '#FFFFFF' },  
  payButton: { flexDirection: 'row', backgroundColor: '#5B21B6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  payButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  securityText: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  processingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  processingText: { fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 20 },
  processingSubtext: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  successContainer: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  successContent: { paddingHorizontal: 24, alignItems: 'center' },
  successIconContainer: { marginBottom: 20 }, 
  successTitle: { fontSize: 24, fontWeight: '700', color: '#10B981', marginBottom: 12 },
  successAmount: { fontSize: 32, fontWeight: '700', color: '#5B21B6', marginBottom: 16 },
  successMessage: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  transactionBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  transactionLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  transactionValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
  doneButton: { backgroundColor: '#5B21B6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: '100%' },
  doneButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  webViewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  webViewTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  payButtonDisabled: { backgroundColor: '#9CA3AF', opacity: 0.7 }
});