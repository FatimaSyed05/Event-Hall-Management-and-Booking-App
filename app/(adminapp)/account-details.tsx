// app/(adminapp)/account-details.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { webContainerStyle } from '@/constants/webstyles';
import { doc, collection, updateDoc, onSnapshot, serverTimestamp, addDoc, where, query, getDocs } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';
import { getHallsByManager } from '../../backend/services/hallServices';

export default function AccountDetailsScreen() {
  const params = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);
  const [managerHalls, setManagerHalls] = useState<any[]>([]);
  const [customerBookings, setCustomerBookings] = useState<any[]>([]);
  const [walletDetails, setWalletDetails] = useState({
    totalEarnings: 0,
    totalWithdrawn: 0,
    currentBalance: 0,
  });

  useEffect(() => {
    if (params.userData && params.userData !== 'null') {
      try {
        const parsedUser = JSON.parse(params.userData as string);
        setUser(parsedUser);
        const unsubscribe = onSnapshot(doc(db, 'users', parsedUser.id), (docSnap) => {
          if (docSnap.exists()) {
            const latestData = docSnap.data();
            setUser((prev: any) => ({
              ...prev,
              ...latestData,
              role: latestData.role === 'customer' ? 'Customers' : 'Managers',
              status: (latestData.accountStatus === 'suspended' ? 'Suspended' : 
                      latestData.accountStatus === 'deleted' ? 'Deleted' : 
                      latestData.approvalStatus === 'pending_approval' ? 'Pending' : 'Active')
            }));
          }
        });
        return () => unsubscribe();
      } catch (error) {
        console.error('Error parsing user data:', error);
        setUser(null);
      }
    }
  }, [params.userData]);

  useEffect(() => {
    const fetchManagerHalls = async () => {
      if (user?.id && user?.role === 'Managers') {
        try {
          const halls = await getHallsByManager(user.id);
          const formattedHalls = halls.map((hall: any) => ({
            id: hall.id,
            name: hall.hallName || 'Unknown Hall'
          }));
          setManagerHalls(formattedHalls);
        } catch (error) {
          console.error("Error fetching manager halls:", error);
        }
      }
    };
    fetchManagerHalls();
  }, [user?.id, user?.role]);

  useEffect(() => {
    const fetchCustomerBookings = async () => {
      if (user?.id && user?.role === 'Customers') {
        try {
          const bookingsQuery = query(
            collection(db, 'bookings'),
            where('customerId', '==', user.id)
          );
          
          const bookingsSnapshot = await getDocs(bookingsQuery);
          const bookings = bookingsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          bookings.sort((a: any, b: any) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
          });
          
          setCustomerBookings(bookings);
        } catch (error) {
          console.error("Error fetching customer bookings:", error);
        }
      }
    };
    fetchCustomerBookings();
  }, [user?.id, user?.role]);

  useEffect(() => {
    const calculateWalletDetails = async () => {
      if (user?.id && user?.role === 'Managers') {
        try {
          const bookingsQuery = query(
            collection(db, 'bookings'),
            where('managerId', '==', user.id)
          );
          const bookingsSnapshot = await getDocs(bookingsQuery);
          let totalEarnings = 0;
          
          bookingsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const paymentStatus = data.paymentStatus;
            const bookingStatus = (data.status || '').toLowerCase();
            if (bookingStatus === 'cancelled' || bookingStatus === 'refunded') return;
            const commissionRate = data.commissionRate || 5;
            if (paymentStatus === 'advance_paid' || paymentStatus === 'fully_paid') {
              const advancePaid = Number(data.advancePaid || 0);
              const adminCommissionAdvance = Math.ceil(advancePaid * (commissionRate / 100));
              const managerShareAdvance = advancePaid - adminCommissionAdvance;
              totalEarnings += managerShareAdvance;
              
              if (paymentStatus === 'fully_paid') {
                const totalAmount = Number(data.totalAmount || 0);
                const finalPaid = totalAmount - advancePaid;
                const finalCommission = Math.ceil(finalPaid * (commissionRate / 100));
                const managerShareFinal = finalPaid - finalCommission;
                totalEarnings += managerShareFinal;
              }
            }
            // if (paymentStatus === 'advance_paid' || paymentStatus === 'fully_paid') {
            //   const advancePaid = Number(data.advancePaid || 0);
            //   const adminCommissionAdvance = Math.ceil(advancePaid * 0.05);
            //   const managerShareAdvance = advancePaid - adminCommissionAdvance;
            //   totalEarnings += managerShareAdvance;
              
            //   if (paymentStatus === 'fully_paid') {
            //     const totalAmount = Number(data.totalAmount || 0);
            //     const finalPaid = totalAmount - advancePaid;
            //     const totalCommission = Number(data.adminCommission || 0);
            //     const advanceCommission = Math.ceil(advancePaid * 0.05);
            //     const finalCommission = totalCommission - advanceCommission;
            //     const managerShareFinal = finalPaid - finalCommission;
            //     totalEarnings += managerShareFinal;
            //   }
            // }
          });
          
          const withdrawalsQuery = query(
            collection(db, 'withdrawals'),
            where('managerId', '==', user.id),
            where('status', 'in', ['approved', 'completed'])
          );
          const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
          let totalWithdrawn = 0;
          withdrawalsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            totalWithdrawn += Number(data.amount || 0);
          });
          const currentBalance = totalEarnings - totalWithdrawn;
          setWalletDetails({
            totalEarnings,
            totalWithdrawn,
            currentBalance,
          });
        } catch (error) {
          console.error("Error calculating wallet details:", error);
        }
      }
    };
    calculateWalletDetails();
  }, [user?.id, user?.role]);

  const handleAction = async (action: string) => {
    if (!user || !user.id) return;

    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action.toLowerCase()} this account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: action, 
          style: action === 'Delete' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              if (action === 'Suspend' || action === 'Activate') {
                const actionText = action === 'Suspend' ? 'suspended' : 'activated';
                const newStatus = action === 'Suspend' ? 'suspended' : 'active';
                
                await addDoc(collection(db, 'notifications'), {
                  type: 'Account Update',
                  message: `Your account has been ${actionText} by the admin. Please contact support for details.`,
                  targetUserId: user.id,
                  targetRole: user.role,
                  status: 'unread',
                  timestamp: serverTimestamp(),
                  action: 'home'
                });

                await updateDoc(doc(db, 'users', user.id), { accountStatus: newStatus });

                Alert.alert('Success', `Account ${action.toLowerCase()}d. notification sent to the user.`);

              } else if (action === 'Delete') {
                const response = await fetch('https://bondless-python-floral.ngrok-free.dev/api/notify-user', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: user.email,
                    name: user.name,
                    accountStatus: 'deleted' 
                  }),
                });

                if (!response.ok) {
                  const errData = await response.json().catch(() => ({}));
                  throw new Error(errData.detail || 'Failed to send deletion email');
                }
                await updateDoc(doc(db, 'users', user.id), { 
                  accountStatus: 'deleted' 
                });
                Alert.alert('Success', 'Account deleted and notification email sent to the user.');
              }
              setTimeout(() => {
                router.back();
              }, 1500);
            } catch (error: any) {
              console.error("Action Error:", error);
              Alert.alert('Error', error.message || 'Failed to perform action.');
            }
          }
        }
      ]
    );
  };

  const handleViewDocument = async () => {
    const docUrl = user?.verificationDoc || user?.docUri;
    if (!docUrl) {
      Alert.alert('Info', 'No verification document uploaded for this user.');
      return;
    }
    try {
      const isPdf = docUrl.toLowerCase().includes('.pdf');
      const urlToOpen = isPdf 
        ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(docUrl)}`
        : docUrl;

      await Linking.openURL(urlToOpen);
    } catch (error) {
      Alert.alert('Error', 'Failed to open the document. Please check your internet connection.');
    }
  };

  const handleViewHall = (hallId: string) => {
    router.push({
      pathname: '/(adminapp)/hall-details' as any,
      params: { 
        hallId: hallId, 
        hideManager: 'true' 
      }
    });
  };

  const handleViewBooking = (bookingId: string) => {
    router.push({
      pathname: '/(adminapp)/booking-details' as any,
      params: { 
        bookingId: bookingId,
        hideCustomer: 'true' 
      }
    });
  };

  const getStatusColor = (status: string) => {
    if (status === 'Active') return '#10B981';
    if (status === 'Suspended') return '#F59E0B';
    if (status === 'Deleted') return '#EF4444';
    return '#9CA3AF';
  };

  const formatAmount = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{user.role === 'Managers' ? 'Manager' : 'Customer'} Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Full Name</Text>
          <Text style={styles.detailValue}>{user?.name || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email Address</Text>
          <Text style={styles.detailValue}>{user?.email || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone Number</Text>
          <Text style={styles.detailValue}>{user?.phone || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Address</Text>
          <Text style={[styles.detailValue, { textAlign: 'right', flex: 1 }]} numberOfLines={2}>{user?.address || 'N/A'}</Text>
        </View>

        {user?.role === 'Managers' && (
          <TouchableOpacity style={styles.detailRow} onPress={handleViewDocument} activeOpacity={0.7}>
            <Text style={styles.detailLabel}>Verification Document</Text>
            <Ionicons name="document-outline" size={22} color="#2563EB" />
          </TouchableOpacity>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Account Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: (getStatusColor(user?.status || 'Active') + '20') }]}>
            <Text style={[styles.statusText, { color: getStatusColor(user?.status || 'Active') }]}>{user?.status || 'Active'}</Text>
          </View>
        </View>

        {user?.role === 'Managers' && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Wallet Balance</Text>
              <Text style={[styles.detailValue, { color: '#10B981', fontWeight: '700' }]}>
                {formatAmount(walletDetails.currentBalance)}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Earnings</Text>
              <Text style={styles.detailValue}>
                {formatAmount(walletDetails.totalEarnings)}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Withdrawn</Text>
              <Text style={styles.detailValue}>
                {formatAmount(walletDetails.totalWithdrawn)}
              </Text>
            </View>
          </>
        )}

        {user?.role === 'Managers' && (
          <View style={styles.roleSection}>
            <View style={styles.listSection}>
              <Text style={styles.listHeader}>Added Halls ({managerHalls.length})</Text>
              {managerHalls.length > 0 ? (
                managerHalls.map((hall: any, idx: number) => (
                  <TouchableOpacity 
                    key={hall.id} 
                    style={styles.subItem} 
                    onPress={() => handleViewHall(hall.id)} 
                    activeOpacity={0.7}
                  >
                    <Ionicons name="business-outline" size={18} color="#6B7280" />
                    <Text style={styles.subItemText}>{hall.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No halls added yet.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {user?.role === 'Customers' && (
          <View style={styles.roleSection}>
            <View style={styles.listSection}>
              <Text style={styles.listHeader}>All Bookings ({customerBookings.length})</Text>
              {customerBookings.length > 0 ? (
                customerBookings.map((booking: any, idx: number) => (
                  <TouchableOpacity 
                    key={booking.id} 
                    style={styles.subItem} 
                    onPress={() => handleViewBooking(booking.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subItemText}>{booking.hallName || 'Unknown Hall'}</Text>
                      <Text style={styles.subItemSubtext}>{booking.date} • {booking.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No bookings found.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {user?.status !== 'Deleted' && (
          <View style={styles.actionButtons}>
            {user?.status === 'Active' ? (
              <>
                <TouchableOpacity style={[styles.actionBtn, styles.suspendBtn]} onPress={() => handleAction('Suspend')}>
                  <Text style={styles.actionBtnText}>Suspend</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleAction('Delete')}>
                  <Text style={styles.actionBtnText}>Delete</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={[styles.actionBtn, styles.activateBtn]} onPress={() => handleAction('Activate')}>
                  <Text style={styles.actionBtnText}>Activate</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleAction('Delete')}>
                  <Text style={styles.actionBtnText}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  detailValue: { fontSize: 15, color: '#111827', fontWeight: '600', textAlign: 'right', flex: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  roleSection: { marginTop: 24 },
  listSection: { marginBottom: 20 },
  listHeader: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  subItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  subItemText: { fontSize: 15, color: '#111827', fontWeight: '500', flex: 1 },
  subItemSubtext: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  emptyList: { padding: 20, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  emptyListText: { fontSize: 14, color: '#9CA3AF' },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 32 },
  actionBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  suspendBtn: { backgroundColor: '#F59E0B' },
  activateBtn: { backgroundColor: '#10B981' },
  deleteBtn: { backgroundColor: '#ff5c5c', borderWidth: 1, borderColor: '#c12f2f' },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});