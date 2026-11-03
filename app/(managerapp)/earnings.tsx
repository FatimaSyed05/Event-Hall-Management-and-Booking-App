import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import BottomNav from '../../components/manager-bottom-nav';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '@/constants/webstyles';
import { useAuth } from '../../backend/context/AuthContext';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, doc } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

export default function EarningsScreen() {
  const { userData } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date()); 
  const [selectedHall, setSelectedHall] = useState('all');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [halls, setHalls] = useState<string[]>(['all']);
  const [lifetimeEarnings, setLifetimeEarnings] = useState(0);
  const [lifetimeAvailable, setLifetimeAvailable] = useState(0);
  const [lifetimeWithdrawn, setLifetimeWithdrawn] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [monthlyWithdrawn, setMonthlyWithdrawn] = useState(0);
  const [monthlyAvailable, setMonthlyAvailable] = useState(0);
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState(false);
  const totalEarnings = showMonthlyBreakdown ? monthlyEarnings : lifetimeEarnings;
  const availableAmount = showMonthlyBreakdown ? monthlyAvailable : lifetimeAvailable;
  const withdrawnAmount = showMonthlyBreakdown ? monthlyWithdrawn : lifetimeWithdrawn;
  const [currentCommissionRate, setCurrentCommissionRate] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState<'jazzcash' | 'easypaisa' | 'bank'>('jazzcash');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [showBankModal, setShowBankModal] = useState(false);  

  const [accountNumberError, setAccountNumberError] = useState('');
  const [accountNameError, setAccountNameError] = useState('');
  const [bankNameError, setBankNameError] = useState('');

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

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
  const currentMonth = monthNames[selectedMonth.getMonth()];
  const currentYear = selectedMonth.getFullYear();
  useEffect(() => {
    if (!userData?.uid) return;

    const hallsQuery = query(
      collection(db, 'halls'),
      where('managerId', '==', userData.uid),
      where('status', '==', 'approved')
    );
    const unsubscribe = onSnapshot(hallsQuery, (snapshot) => {
      const hallsList = ['all', ...snapshot.docs.map(doc => 
        doc.data().hallName || doc.data().name || 'Unknown Hall'
      )];
      setHalls(hallsList);
    });
    return () => unsubscribe();
  }, [userData?.uid]);

useEffect(() => {
  if (!userData?.uid) return;
  
  const bookingsQuery = query(
    collection(db, 'bookings'),
    where('managerId', '==', userData.uid)
  );
  
  const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
    let earnings = 0;
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const bookingStatus = (data.status || '').toLowerCase();
      if (bookingStatus === 'cancelled' || bookingStatus === 'refunded') return;
      
      const commissionRate = data.commissionRate || 5;
      const paymentStatus = data.paymentStatus;
      
      if (paymentStatus === 'advance_paid' || paymentStatus === 'fully_paid') {
        const advancePaid = Number(data.advancePaid || 0);
        const commission = Math.ceil(advancePaid * (commissionRate / 100));
        earnings += advancePaid - commission;
      }
      
      if (paymentStatus === 'fully_paid') {
        const totalAmount = Number(data.totalAmount || 0);
        const advancePaid = Number(data.advancePaid || 0);
        const finalPaid = totalAmount - advancePaid;
        const commission = Math.ceil(finalPaid * (commissionRate / 100));
        earnings += finalPaid - commission;
      }
    });
    setLifetimeEarnings(earnings);
  });
  
  return () => unsubscribe();
}, [userData?.uid]);

  useEffect(() => {
    if (!userData?.uid) return;
    
    const withdrawalsQuery = query(
      collection(db, 'withdrawals'),
      where('managerId', '==', userData.uid)
    );
    const unsubscribe = onSnapshot(withdrawalsQuery, (snapshot) => {
      let withdrawn = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'approved' || data.status === 'completed') {
          withdrawn += Number(data.amount || 0);
        }
      });
      setLifetimeWithdrawn(withdrawn);
    });
    return () => unsubscribe();
  }, [userData?.uid]);
  useEffect(() => {
    const available = lifetimeEarnings - lifetimeWithdrawn;
    setLifetimeAvailable(available > 0 ? available : 0);
  }, [lifetimeEarnings, lifetimeWithdrawn]);

  useEffect(() => {
    const available = monthlyEarnings - monthlyWithdrawn;
    setMonthlyAvailable(available > 0 ? available : 0);
  }, [monthlyEarnings, monthlyWithdrawn]);

  useEffect(() => {
    if (!userData?.uid || !showMonthlyBreakdown) {
      setIsLoading(false);
      return;
    }
    
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('managerId', '==', userData.uid)
    );
    
    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      let earnings = 0;
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const paymentStatus = data.paymentStatus;
        const bookingStatus = (data.status || '').toLowerCase();
        if (bookingStatus === 'cancelled' || bookingStatus === 'refunded') return;
        
        const bookingDate = data.bookingCreatedAt?.toDate 
          ? data.bookingCreatedAt.toDate() 
          : new Date(data.date || new Date());
        
        const bookingMonth = bookingDate.getMonth();
        const bookingYear = bookingDate.getFullYear();
        const selectedMonthNum = selectedMonth.getMonth();
        const selectedYear = selectedMonth.getFullYear();
        
        if (bookingMonth !== selectedMonthNum || bookingYear !== selectedYear) return;
        
        const hallName = data.hallName || 'Unknown Hall';
        if (selectedHall !== 'all' && hallName !== selectedHall) return;
        
        const commissionRate = data.commissionRate || 5;
        
        if (paymentStatus === 'advance_paid' || paymentStatus === 'fully_paid') {
          const advancePaid = Number(data.advancePaid || 0);
          const commission = Math.ceil(advancePaid * (commissionRate / 100));
          earnings += advancePaid - commission;
        }
        
        if (paymentStatus === 'fully_paid') {
          const totalAmount = Number(data.totalAmount || 0);
          const advancePaid = Number(data.advancePaid || 0);
          const finalPaid = totalAmount - advancePaid;
          const commission = Math.ceil(finalPaid * (commissionRate / 100));
          earnings += finalPaid - commission;
        }
      });
      
      setMonthlyEarnings(earnings);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [userData?.uid, selectedMonth, selectedHall, showMonthlyBreakdown]);

  useEffect(() => {
    if (!userData?.uid || !showMonthlyBreakdown) return;
    
    const withdrawalsQuery = query(
      collection(db, 'withdrawals'),
      where('managerId', '==', userData.uid)
    );
    
    const unsubscribe = onSnapshot(withdrawalsQuery, (snapshot) => {
      let withdrawn = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'approved' || data.status === 'completed') {
          const withdrawalDate = data.requestedAt?.toDate 
            ? data.requestedAt.toDate() 
            : new Date();
          const withdrawalMonth = withdrawalDate.getMonth();
          const withdrawalYear = withdrawalDate.getFullYear();
          const selectedMonthNum = selectedMonth.getMonth();
          const selectedYear = selectedMonth.getFullYear();
          if (withdrawalMonth === selectedMonthNum && withdrawalYear === selectedYear) {
            withdrawn += Number(data.amount || 0);
          }
        }
      });
      setMonthlyWithdrawn(withdrawn);
    });
    
    return () => unsubscribe();
  }, [userData?.uid, selectedMonth, showMonthlyBreakdown]);

  useEffect(() => {
    if (!userData?.uid) return;
    
    const userRef = doc(db, 'users', userData.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentCommissionRate(data.customCommissionRate || 5);
      }
    });
    
    return () => unsubscribe();
  }, [userData?.uid]);

  const validateAccountNumber = () => {
    const trimmed = accountNumber.trim().replace(/[\s-]/g, '');
    if (!trimmed) {
      setAccountNumberError(paymentMethod === 'bank' ? 'Account number / IBAN is required' : 'Mobile number is required');
      return false;
    }
    if (paymentMethod === 'bank') {
      const ibanRegex = /^PK\d{2}[A-Z]{4}\d{16}$/i;
      const accRegex = /^\d{10,16}$/;
      if (ibanRegex.test(trimmed)) {
        setAccountNumberError('');
        return true;
      }
      if (accRegex.test(trimmed)) {
        setAccountNumberError('');
        return true;
      }
      setAccountNumberError('Enter valid IBAN (PK36HABB0000000000000000) or 10-16 digit account number');
      return false;
    } else {
      const mobileRegex = /^03\d{9}$/;
      if (!mobileRegex.test(trimmed)) {
        setAccountNumberError('Enter valid 11-digit mobile number (e.g., 03001234567)');
        return false;
      }
      setAccountNumberError('');
      return true;
    }
  };

  const validateAccountName = () => {
    const trimmed = accountName.trim();
    if (!trimmed) {
      setAccountNameError('Account holder name is required');
      return false;
    }
    if (trimmed.length < 3) {
      setAccountNameError('Name must be at least 3 characters');
      return false;
    }
    if (trimmed.length > 50) {
      setAccountNameError('Name must be less than 50 characters');
      return false;
    }
    if (!/^[a-zA-Z\s.]+$/.test(trimmed)) {
      setAccountNameError('Name can only contain letters, spaces, and dots');
      return false;
    }
    if (!/^[a-zA-Z]/.test(trimmed)) {
      setAccountNameError('Name must start with a letter');
      return false;
    }
    if (/\s{2,}/.test(trimmed)) {
      setAccountNameError('Remove extra spaces between words');
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

  const previousMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedMonth(newDate);
  };

  // const handleWithdraw = async () => {
  //   const amount = parseFloat(withdrawAmount);
  //   if (!withdrawAmount || amount <= 0) {
  //     Alert.alert('Error', 'Please enter a valid amount');
  //     return;
  //   }
  //   if (amount > availableAmount) {
  //     Alert.alert('Error', 'Amount exceeds available balance');
  //     return;
  //   }
  //   if (!userData?.uid) {
  //     Alert.alert('Error', 'Please login first');
  //     return;
  //   }

   const formatAmount = (amount: number) => {
      return amount.toLocaleString();
    };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!withdrawAmount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (amount > availableAmount) {
      Alert.alert('Error', 'Amount exceeds available balance');
      return;
    }

    const isAccValid = validateAccountNumber();
    const isNameValid = validateAccountName();
    const isBankValid = validateBankName();

    if (!isAccValid || !isNameValid || !isBankValid) {
      Alert.alert('Error', 'Please fill all account details correctly');
      return;
    }

    try {
      setIsWithdrawing(true);

      const withdrawalRef = await addDoc(collection(db, 'withdrawals'), {
        managerId: userData?.uid || '',
        managerName: userData?.name || 'Manager',
        managerEmail: userData?.email || '',
        amount: amount,
        paymentMethod: paymentMethod,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        bankName: paymentMethod === 'bank' ? bankName.trim() : '',
        status: 'pending',
        requestedAt: serverTimestamp(),
      });

      const withdrawalId = withdrawalRef.id; 

      try {
        const adminQuery = query(
          collection(db, 'users'),
          where('role', '==', 'admin')
        );
        const adminSnapshot = await getDocs(adminQuery);
        const adminPromises = adminSnapshot.docs.map(async (adminDoc) => {
          return addDoc(collection(db, 'notifications'), {
            type: 'withdrawal_request',
            targetUserId: adminDoc.id,
            targetRole: 'admin',
            managerId: userData?.uid || '',
            withdrawalId: withdrawalId, 
            managerName: userData?.name || 'Manager',
            amount: amount,
            paymentMethod: paymentMethod,
            bankName: paymentMethod === 'bank' ? bankName.trim() : '',
            accountNumber: accountNumber.trim(),
            accountName: accountName.trim(),
            title: 'New Withdrawal Request',
            message: `${userData?.name} has requested withdrawal of PKR ${amount.toLocaleString()}`,
            detailedMessage: `Manager: ${userData?.name}\nAmount: PKR ${amount.toLocaleString()}\nMethod: ${paymentMethod}\nBank: ${bankName || 'N/A'}\nAccount: ${accountNumber}`,
            action: 'withdrawal-details',
            status: 'unread',
            timestamp: serverTimestamp(),
          });
        });

        await Promise.all(adminPromises);
      } catch (notifError) {
        console.error('Error sending admin notification:', notifError);
      }

    Alert.alert(
      'Withdrawal Request Sent',
      `Your withdrawal request of PKR ${amount.toLocaleString()} has been sent to admin. You will receive the amount within 3-5 business days.`,
      [{ 
        text: 'OK', 
        onPress: () => {
          setShowWithdrawModal(false);
          setWithdrawAmount('');
          setAccountNumber('');
          setAccountName('');
          setBankName('');
        }
      }]
    );
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    Alert.alert('Error', error.message || 'Failed to submit withdrawal request');
  } finally {
    setIsWithdrawing(false);
  }
};
  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Earnings</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.content}>
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>
                {showMonthlyBreakdown ? 'Monthly Breakdown' : 'Wallet Overview'}
              </Text>
              <TouchableOpacity 
                style={styles.toggleBtn}
                onPress={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
              >
                <Ionicons 
                  name={showMonthlyBreakdown ? 'eye-off-outline' : 'calendar-outline'} 
                  size={18} 
                  color="#5B21B6" 
                />
                <Text style={styles.toggleText}>
                  {showMonthlyBreakdown ? 'Show Overall' : 'Monthly View'}
                </Text>
              </TouchableOpacity>
            </View>

            {showMonthlyBreakdown && (
              <View style={styles.calendarNav}>
                <TouchableOpacity onPress={previousMonth} style={styles.monthBtn}>
                  <Ionicons name="chevron-back" size={20} color="#5B21B6" />
                </TouchableOpacity>
                <Text style={styles.monthText}>{currentMonth} {currentYear}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.monthBtn}>
                  <Ionicons name="chevron-forward" size={20} color="#5B21B6" />
                </TouchableOpacity>
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {halls.map((hall) => (
                <TouchableOpacity 
                  key={hall}
                  style={[styles.filterChip, selectedHall === hall && styles.filterChipActive]}
                  onPress={() => setSelectedHall(hall)}
                >
                  <Text style={[styles.filterText, selectedHall === hall && styles.filterTextActive]}>
                    {hall === 'all' ? 'All Halls' : hall}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5B21B6" />
                <Text style={styles.loadingText}>Loading earnings...</Text>
              </View>
            ) : (
              <>
                <View style={styles.earningsContainer}>
                  <View style={styles.earningsCard}>
                    <Text style={styles.cardLabel}>Total Earnings</Text>
                    <Text style={styles.cardValue}>PKR {formatAmount(totalEarnings)}</Text>
                  </View>
                  {selectedHall === 'all' && (
                  <>
                    <View style={styles.earningsCard}>
                      <Text style={styles.cardLabel}>Available in Wallet</Text>
                      <Text style={[styles.cardValue, styles.availableValue]}>
                        PKR {formatAmount(availableAmount)}
                      </Text>
                    </View>

                    <View style={styles.earningsCard}>
                      <Text style={styles.cardLabel}>Withdrawn</Text>
                      <Text style={[styles.cardValue, styles.withdrawnValue]}>
                        PKR {formatAmount(withdrawnAmount)}
                      </Text>
                    </View>
                    <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#5B21B6" />
                    <Text style={styles.infoText}>
                      Earnings are calculated after deducting {currentCommissionRate}% platform commission from each payment. Available amount can be withdrawn to your account.
                    </Text>
                  </View>
                  </>
                )}
                </View>
              </>
            )}

            <View style={{ height: 100 }} />
          </View>
        </ScrollView>

          {availableAmount > 0 && !isLoading && (
            <TouchableOpacity 
              style={styles.withdrawBtn}
              onPress={() => setShowWithdrawModal(true)}
            >
              <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
              <Text style={styles.withdrawText}>Withdraw</Text>
            </TouchableOpacity>
          )}

        <BottomNav />
        <Modal visible={showWithdrawModal} transparent animationType="fade">
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
          <Text style={styles.modalTitle}>Withdraw Funds</Text>
          
          <View style={styles.availableBox}>
            <Text style={styles.availableLabel}>Available for Withdrawal</Text>
            <Text style={styles.availableAmount}>PKR {formatAmount(availableAmount)}</Text>
          </View>

          <Text style={styles.inputLabel}>Amount (PKR)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            value={withdrawAmount}
            onChangeText={setWithdrawAmount}
          />
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

          <View style={styles.modalInfoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#5B21B6" />
            <Text style={styles.modalInfoText}>
              Withdrawal request will be sent to admin. Amount will be transferred to your account within 3-5 business days.
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, isWithdrawing && { opacity: 0.6 }]} 
            onPress={handleWithdraw}
            disabled={isWithdrawing}
          >
            {isWithdrawing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Submit Request</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelBtn}
            onPress={() => {
              setShowWithdrawModal(false);
              setWithdrawAmount('');
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { paddingHorizontal: 20 },
  calendarNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F3FF', padding: 12, borderRadius: 10, marginBottom: 16 },
  monthBtn: { padding: 4 },
  monthText: { fontSize: 16, fontWeight: '600', color: '#5B21B6' },
  filterScroll: { gap: 8, marginBottom: 20 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F3F4F6' },
  filterChipActive: { backgroundColor: '#5B21B6' },
  filterText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 14, color: '#9CA3AF', marginTop: 12 },
  earningsContainer: { gap: 12, marginBottom: 20 },
  earningsCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' },
  cardIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  cardLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4, fontWeight: '500' },
  cardValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  availableValue: { color: '#10B981' },
  withdrawnValue: { color: '#2563EB' },
  infoBox: { flexDirection: 'row', backgroundColor: '#F5F3FF', borderRadius: 10, padding: 16, gap: 12 },
  infoText: { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 20 },
  withdrawBtn: { position: 'absolute', bottom: 100, right: 20, flexDirection: 'row', backgroundColor: '#5B21B6', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 28, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, zIndex: 999 },
  withdrawText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20, textAlign: 'center' },
  availableBox: { backgroundColor: '#F5F3FF', borderRadius: 12, padding: 16, marginBottom: 20, alignItems: 'center' },
  availableLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  availableAmount: { fontSize: 24, fontWeight: '700', color: '#5B21B6' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#111827', marginBottom: 16 },
  modalInfoBox: { flexDirection: 'row', backgroundColor: '#F5F3FF', borderRadius: 8, padding: 12, marginBottom: 20, gap: 8 },
  modalInfoText: { flex: 1, fontSize: 12, color: '#4B5563', lineHeight: 18 },
  submitBtn: { backgroundColor: '#5B21B6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  methodBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB' },
  methodBtnActive: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
  methodText: { fontSize: 13, color: '#4B5563', fontWeight: '600' },
  methodTextActive: { color: '#FFFFFF' },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: -12, marginBottom: 12 },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center',  minWidth: 300,},
  bankSelectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bankSelectText: { fontSize: 14, color: '#9CA3AF' },
  bankSelectTextActive: { color: '#111827', fontWeight: '600' },
  bankModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  bankModalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
  bankModalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' },
  bankOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginBottom: 8, gap: 12 },
  bankOptionActive: { borderColor: '#5B21B6', backgroundColor: '#F5F3FF' },
  bankOptionText: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  bankModalCancel: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  bankModalCancelText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  overviewTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F3FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#f2eff6' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#5B21B6' },
});