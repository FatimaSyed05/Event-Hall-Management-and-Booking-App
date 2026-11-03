import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { webContainerStyle } from '@/constants/webstyles';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

interface Manager {
  id: string;
  name: string;
  email: string;
  customCommissionRate?: number;
}

interface WalletDetails {
  totalEarnings: number;
  totalWithdrawn: number;
  availableBalance: number;
}

export default function CommissionDashboard() {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false); 
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [walletDetails, setWalletDetails] = useState<WalletDetails>({
    totalEarnings: 0,
    totalWithdrawn: 0,
    availableBalance: 0,
  });
  const [commissionRate, setCommissionRate] = useState('5');
  const [isUpdating, setIsUpdating] = useState(false);
  const [totalCommission, setTotalCommission] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'manager')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const managersList: Manager[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Unknown',
        email: doc.data().email || '',
        customCommissionRate: doc.data().customCommissionRate || 5,
      }));
      setManagers(managersList);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const calculateTotalCommission = async () => {
      const bookingsQuery = query(collection(db, 'bookings'));
      const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
        let total = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const bookingStatus = (data.status || '').toLowerCase();
          if (bookingStatus === 'cancelled' || bookingStatus === 'refunded') return;
          const paymentStatus = data.paymentStatus;
          const commissionRate = data.commissionRate || 5;
          if (paymentStatus === 'advance_paid' || paymentStatus === 'fully_paid') {
          const advancePaid = Number(data.advancePaid || 0);
          const commission = Math.ceil(advancePaid * (commissionRate / 100));
          total += commission;
          
          if (paymentStatus === 'fully_paid') {
            const totalAmount = Number(data.totalAmount || 0);
            const finalPaid = totalAmount - advancePaid;
            const finalCommission = Math.ceil(finalPaid * (commissionRate / 100));
            total += finalCommission;
            }
          }
        });
        setTotalCommission(total);
      });
      return () => unsubscribe();
    };
    calculateTotalCommission();
  }, []);

  useEffect(() => {
    const calculateWalletDetails = async () => {
      if (!selectedManager) return;

      try {
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('managerId', '==', selectedManager.id)
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        let totalEarnings = 0;
        const commissionRate = selectedManager.customCommissionRate || 5;
        
        bookingsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const bookingStatus = (data.status || '').toLowerCase();
          if (bookingStatus === 'cancelled' || bookingStatus === 'refunded') return;
          const paymentStatus = data.paymentStatus;
          if (paymentStatus === 'advance_paid' || paymentStatus === 'fully_paid') {
            const advancePaid = Number(data.advancePaid || 0);
            const commission = Math.ceil(advancePaid * (commissionRate / 100));
            const managerShare = advancePaid - commission;
            totalEarnings += managerShare;
            
            if (paymentStatus === 'fully_paid') {
              const totalAmount = Number(data.totalAmount || 0);
              const finalPaid = totalAmount - advancePaid;
              const finalCommission = Math.ceil(finalPaid * (commissionRate / 100));
              const managerShareFinal = finalPaid - finalCommission;
              totalEarnings += managerShareFinal;
            }
          }
        });

        const withdrawalsQuery = query(
          collection(db, 'withdrawals'),
          where('managerId', '==', selectedManager.id),
          where('status', 'in', ['approved', 'completed'])
        );
        const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
        
        let totalWithdrawn = 0;
        withdrawalsSnapshot.docs.forEach(doc => {
          totalWithdrawn += Number(doc.data().amount || 0);
        });

        setWalletDetails({
          totalEarnings,
          totalWithdrawn,
          availableBalance: totalEarnings - totalWithdrawn,
        });
      } catch (error) {
        console.error('Error calculating wallet details:', error);
      }
    };

    if (selectedManager) {
      calculateWalletDetails();
    }
  }, [selectedManager]);

  const handleManagerClick = (manager: Manager) => {
    setSelectedManager(manager);
    setCommissionRate(String(manager.customCommissionRate || 5));
    setShowManagerModal(true);
  };

  const handleAvatarClick = async (manager: Manager) => {
    try {
      const userRef = doc(db, 'users', manager.id);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        router.push({
          pathname: '/(adminapp)/account-details' as any,
          params: { 
            userData: JSON.stringify({
              id: userDoc.id,
              name: userData.name || manager.name,
              role: 'Manager',
              status: userData.approvalStatus === 'approved' ? 'Active' : (userData.approvalStatus || 'Pending'),
              email: userData.email || manager.email,
              phone: userData.phone || 'N/A',
              address: userData.address || 'N/A',
              docName: userData.verificationDoc ? 'Document Uploaded' : 'N/A',
              docUri: userData.verificationDoc || '',
              halls: userData.halls || [],
              walletBalance: userData.walletBalance || 0,
              customCommissionRate: userData.customCommissionRate || 5,
            })
          }
        });
      } else {
        Alert.alert('Error', 'Manager account not found');
      }
    } catch (error) {
      console.error('Error fetching manager details:', error);
      Alert.alert('Error', 'Failed to load manager details');
    }
  };

  const handleUpdateCommission = async () => {
    if (!selectedManager) return;
    
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      Alert.alert('Error', 'Please enter a valid commission rate (0-100)');
      return;
    }

    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'users', selectedManager.id), {
        customCommissionRate: rate,
      });
      
      Alert.alert('Success', `Commission rate updated to ${rate}% for ${selectedManager.name}`);
      setShowManagerModal(false);
      setManagers(prev => prev.map(m => 
        m.id === selectedManager.id ? { ...m, customCommissionRate: rate } : m
      ));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update commission rate');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatAmount = (amount: number) => `PKR ${amount.toLocaleString()}`;
  
  const filteredManagers = activeFilter === 'All' 
    ? managers 
    : managers.filter(m => m.id === activeFilter);

  const getFilterDisplayName = () => {
    if (activeFilter === 'All') return 'All Managers';
    const manager = managers.find(m => m.id === activeFilter);
    return manager ? manager.name : 'All Managers';
  };

  const handleFilterSelect = (managerId: string) => {
    setActiveFilter(managerId);
    setShowFilterModal(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={styles.loadingText}>Loading commission data...</Text>
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
        <Text style={styles.headerTitle}>Commission Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Commission Earned</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>
              {formatAmount(totalCommission)}
            </Text>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterDropdown}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="filter" size={20} color="#5B21B6" />
            <Text style={styles.filterDropdownText}>{getFilterDisplayName()}</Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>
          {filteredManagers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No managers found.</Text>
            </View>
          ) : (
           filteredManagers.map((manager) => (
            <View key={manager.id} style={styles.managerCard}>
              <TouchableOpacity
                style={styles.managerIcon}
                onPress={() => handleAvatarClick(manager)}
                activeOpacity={0.7}
              >
                <Ionicons name="person" size={24} color="#5B21B6" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.managerInfoContainer}
                onPress={() => handleManagerClick(manager)}
                activeOpacity={0.7}
              >
                <View style={styles.managerInfo}>
                  <Text style={styles.managerName}>{manager.name}</Text>
                  <Text style={styles.managerEmail}>{manager.email}</Text>
                  <View style={styles.commissionBadge}>
                    <Text style={styles.commissionText}>
                      Commission: {manager.customCommissionRate || 5}%
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
          ))
       )}
        </View>
      </ScrollView>

      <Modal visible={showManagerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedManager?.name}</Text>
              <TouchableOpacity onPress={() => setShowManagerModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.walletSection}>
                <Text style={styles.sectionTitle}>Wallet Details</Text>
                
                <View style={styles.walletCard}>
                  <Text style={styles.walletLabel}>Total Earnings</Text>
                  <Text style={styles.walletValue}>{formatAmount(walletDetails.totalEarnings)}</Text>
                </View>

                <View style={styles.walletCard}>
                  <Text style={styles.walletLabel}>Total Withdrawn</Text>
                  <Text style={[styles.walletValue, { color: '#EF4444' }]}>
                    {formatAmount(walletDetails.totalWithdrawn)}
                  </Text>
                </View>

                <View style={[styles.walletCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Text style={styles.walletLabel}>Available Balance</Text>
                  <Text style={[styles.walletValue, { color: '#10B981', fontSize: 20 }]}>
                    {formatAmount(walletDetails.availableBalance)}
                  </Text>
                </View>
              </View>

              <View style={styles.commissionSection}>
                <Text style={styles.sectionTitle}>Commission Rate</Text>
                
                <View style={styles.commissionInput}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter commission rate"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    value={commissionRate}
                    onChangeText={setCommissionRate}
                  />
                  <Text style={styles.percentText}>%</Text>
                </View>

                <TouchableOpacity
                  style={[styles.updateBtn, isUpdating && { opacity: 0.6 }]}
                  onPress={handleUpdateCommission}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.updateBtnText}>Update Commission Rate</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showFilterModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Select Manager</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterItem, activeFilter === 'All' && styles.filterItemActive]}
                onPress={() => handleFilterSelect('All')}
              >
                <View style={styles.filterItemLeft}>
                  <Text style={[styles.filterItemText, activeFilter === 'All' && styles.filterItemTextActive]}>
                    All Managers
                  </Text>
                </View>
                {activeFilter === 'All' && (
                  <Ionicons name="checkmark-circle" size={22} color="#5B21B6" />
                )}
              </TouchableOpacity>

              {managers.map((manager) => (
                <TouchableOpacity
                  key={manager.id}
                  style={[styles.filterItem, activeFilter === manager.id && styles.filterItemActive]}
                  onPress={() => handleFilterSelect(manager.id)}
                >
                  <View style={styles.filterItemLeft}>
                    <Text style={[styles.filterItemText, activeFilter === manager.id && styles.filterItemTextActive]}>
                      {manager.name}
                    </Text>
                  </View>
                  {activeFilter === manager.id && (
                    <Ionicons name="checkmark-circle" size={22} color="#5B21B6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scrollContent: { paddingBottom: 100 },
  summaryContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  summaryCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  summaryLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginBottom: 8 },
  summaryValue: { fontSize: 24, fontWeight: '800', color: '#111827' },
  filterContainer: { paddingHorizontal: 20, paddingVertical: 16 },
  filterDropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  filterDropdownText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  filterModalHeader: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  filterModalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  filterItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', borderRadius: 8, marginBottom: 4 },
  filterItemActive: { backgroundColor: '#F5F3FF' },
  filterItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  filterItemText: { fontSize: 15, fontWeight: '500', color: '#374151' },
  filterItemTextActive: { color: '#5B21B6', fontWeight: '700' },
  listContainer: { paddingHorizontal: 20 },
  // managerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  // managerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  // managerInfo: { flex: 1 },
  managerName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  managerEmail: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  commissionBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  commissionText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  walletSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  walletCard: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  walletLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500', marginBottom: 4 },
  walletValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  commissionSection: { marginBottom: 20 },
  commissionInput: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#111827' },
  percentText: { fontSize: 18, fontWeight: '700', color: '#6B7280', marginLeft: 8 },
  updateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#5B21B6', paddingVertical: 14, borderRadius: 12 },
  updateBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  managerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  managerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 2, borderColor: '#E9D5FF' },
  managerInfoContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  managerInfo: { flex: 1 },
});