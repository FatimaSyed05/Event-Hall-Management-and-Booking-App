// app/(adminapp)/withdrawals.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { webContainerStyle } from '@/constants/webstyles';
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

interface ManagerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  role: string;
  docName: string;
  docUri: string;
  halls: string[];
}

interface Withdrawal {
  id: string;
  managerId: string;
  managerName: string;
  managerEmail: string;
  amount: number;
  paymentMethod: string;
  accountNumber: string;
  accountName: string;
  bankName?: string;
  status: string;
  requestedAt: any;
  manager?: ManagerInfo;
  viewedByAdmin?: boolean;
}

export default function WithdrawalsScreen() {
  const params = useLocalSearchParams(); 
  const [activeFilter, setActiveFilter] = useState('All');
  const [withdrawalsData, setWithdrawalsData] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'withdrawals')
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const withdrawals: Withdrawal[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let managerInfo: ManagerInfo | undefined;
        try {
          const managerDoc = await getDoc(doc(db, 'users', data.managerId));
          if (managerDoc.exists()) {
            const managerData = managerDoc.data();
            managerInfo = {
              id: managerDoc.id,
              name: managerData.name || data.managerName || 'Unknown',
              email: managerData.email || data.managerEmail || 'N/A',
              phone: managerData.phone || 'N/A',
              address: managerData.address || 'N/A',
              status: managerData.approvalStatus === 'approved' ? 'Active' : (managerData.approvalStatus || 'Pending'),
              role: 'Managers',
              docName: managerData.verificationDoc ? 'Document Uploaded' : 'N/A',
              docUri: managerData.verificationDoc || '',
              halls: managerData.halls || [],
            };
          }
        } catch (error) {
          console.error('Error fetching manager:', error);
        }
        withdrawals.push({
          id: docSnap.id,
          managerId: data.managerId || '',
          managerName: data.managerName || 'Unknown Manager',
          managerEmail: data.managerEmail || '',
          amount: data.amount || 0,
          paymentMethod: data.paymentMethod || 'Unknown',
          accountNumber: data.accountNumber || '',
          accountName: data.accountName || '',
          bankName: data.bankName || '',
          status: data.status || 'pending',
          requestedAt: data.requestedAt,
          viewedByAdmin: data.viewedByAdmin || false, 
          manager: managerInfo,
        });
      }

      withdrawals.sort((a, b) => {
        const timeA = a.requestedAt?.toMillis ? a.requestedAt.toMillis() : 0;
        const timeB = b.requestedAt?.toMillis ? b.requestedAt.toMillis() : 0;
        return timeB - timeA;
      });

      setWithdrawalsData(withdrawals);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const [shouldAutoOpen, setShouldAutoOpen] = useState(true); 

  useEffect(() => {
    setShouldAutoOpen(true);
  }, [params.withdrawalId]);

  useEffect(() => {
    if (params.withdrawalId && !isLoading && withdrawalsData.length > 0 && shouldAutoOpen) {
      const targetId = Array.isArray(params.withdrawalId) 
        ? params.withdrawalId[0] 
        : String(params.withdrawalId);
      
      const targetWithdrawal = withdrawalsData.find(w => w.id === targetId);
      
      if (targetWithdrawal) {
        setTimeout(() => { 
          setSelectedWithdrawal(targetWithdrawal);
          setShowDetailModal(true);
          setShouldAutoOpen(false);
          if (!targetWithdrawal.viewedByAdmin) {
            updateDoc(doc(db, 'withdrawals', targetWithdrawal.id), {
              viewedByAdmin: true
            }).catch(err => console.error('Error marking as viewed:', err));
          }
        }, 500); 
      } else {
        setShouldAutoOpen(false);
      }
    }
  }, [params.withdrawalId, isLoading, withdrawalsData, shouldAutoOpen]);

  const filteredWithdrawals = activeFilter === 'All' 
    ? withdrawalsData 
    : withdrawalsData.filter(w => w.status === activeFilter);

  const filters = ['All', 'pending', 'approved', 'rejected'];

  const getStatusColor = (status: string) => {
    if (status === 'approved') return '#10B981';
    if (status === 'rejected') return '#EF4444';
    return '#F59E0B'; 
  };

  const formatAmount = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const handleManagerClick = (manager: ManagerInfo, e: any) => {
    e.stopPropagation(); 
    router.push({
      pathname: '/(adminapp)/account-details' as any,
      params: { userData: JSON.stringify(manager) }
    });
  };

  const handleWithdrawalClick = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowDetailModal(true);
  };

  const handleApprove = async () => {
    if (!selectedWithdrawal) return;
    Alert.alert(
      'Confirm Approval',
      `Have you transferred ${formatAmount(selectedWithdrawal.amount)} to ${selectedWithdrawal.accountNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Approve', 
          onPress: async () => {
            setIsProcessing(true);
            try {
              await updateDoc(doc(db, 'withdrawals', selectedWithdrawal.id), {
                status: 'approved',
                approvedAt: new Date(),
                viewedByAdmin: true,
              });
              await addDoc(collection(db, 'notifications'), {
                type: 'payments',
                targetRole: 'manager',
                targetUserId: selectedWithdrawal.managerId,
                senderName: 'Admin',
                senderId: 'admin',
                title: 'Withdrawal Approved! ✅',
                message: `Your withdrawal request of ${formatAmount(selectedWithdrawal.amount)} has been approved and transferred to your ${selectedWithdrawal.paymentMethod} account (${selectedWithdrawal.accountNumber}).`,
                detailedMessage: `Assalam-o-Alaikum!\n\nYour withdrawal request has been approved.\n\n💰 Amount: ${formatAmount(selectedWithdrawal.amount)}\n🏦 Method: ${selectedWithdrawal.paymentMethod}\n📱 Account: ${selectedWithdrawal.accountNumber}\n👤 Account Name: ${selectedWithdrawal.accountName}\n${selectedWithdrawal.bankName ? `🏛️ Bank: ${selectedWithdrawal.bankName}\n` : ''}\nPlease check your account.\n\nThank you for using our platform!\n\nBest Regards,\nAdmin`,
                status: 'unread',
                timestamp: serverTimestamp(),
              });
              
              Alert.alert(
                'Success', 
                `Withdrawal approved! ${formatAmount(selectedWithdrawal.amount)} has been deducted from manager's wallet and notification sent.`,
                [{ text: 'OK', onPress: () => {
                  setShowDetailModal(false);
                  setSelectedWithdrawal(null);
                }}]
              );
            } catch (error) {
              console.error('Error approving withdrawal:', error);
              Alert.alert('Error', 'Failed to approve withdrawal. Please try again.');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleReject = async () => {
    if (!selectedWithdrawal) return;
    
    Alert.alert(
      'Reject Withdrawal',
      `Are you sure you want to reject ${formatAmount(selectedWithdrawal.amount)} for ${selectedWithdrawal.managerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await updateDoc(doc(db, 'withdrawals', selectedWithdrawal.id), {
                status: 'rejected',
                rejectedAt: new Date(),
              });
              
              Alert.alert('Rejected', 'Withdrawal request has been rejected.');
              setShowDetailModal(false);
              setSelectedWithdrawal(null);
            } catch (error) {
              console.error('Error rejecting withdrawal:', error);
              Alert.alert('Error', 'Failed to reject withdrawal. Please try again.');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={styles.loadingText}>Loading withdrawals...</Text>
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
        <Text style={styles.headerTitle}>All Withdrawals</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                {filter === 'All' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.listContainer}>
          {filteredWithdrawals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No withdrawals found in this category.</Text>
            </View>
          ) : (
            filteredWithdrawals.map((withdrawal) => (
              <TouchableOpacity
                key={withdrawal.id}
                style={styles.listItem}
                activeOpacity={0.7}
                onPress={() => {
                  if (!withdrawal.viewedByAdmin && withdrawal.status === 'pending') {
                    updateDoc(doc(db, 'withdrawals', withdrawal.id), {
                      viewedByAdmin: true
                    }).catch(err => console.error('Error marking as viewed:', err));
                  }
                  handleWithdrawalClick(withdrawal);
                }}
              >
                <TouchableOpacity 
                  style={styles.managerAvatar} 
                  onPress={(e) => handleManagerClick(withdrawal.manager!, e)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person" size={22} color="#5B21B6" />
                </TouchableOpacity>

                <View style={styles.infoContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.managerNameText}>{withdrawal.managerName}</Text>
                    {withdrawal.status === 'pending' && !withdrawal.viewedByAdmin && (
                      <View style={styles.unreadDot} />
                    )}
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountText}>{formatAmount(withdrawal.amount)}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{withdrawal.paymentMethod}</Text>
                    <Text style={styles.metaSeparator}>•</Text>
                    <Text style={styles.accountText}>{withdrawal.accountNumber}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(withdrawal.requestedAt)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdrawal Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedWithdrawal && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Manager Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedWithdrawal.managerName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>{selectedWithdrawal.managerEmail}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Withdrawal Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Amount</Text>
                      <Text style={[styles.detailValue, styles.amountValue]}>
                        {formatAmount(selectedWithdrawal.amount)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedWithdrawal.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(selectedWithdrawal.status) }]}>
                          {selectedWithdrawal.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Requested</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedWithdrawal.requestedAt)}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Account Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment Method</Text>
                      <Text style={styles.detailValue}>{selectedWithdrawal.paymentMethod}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Account Number</Text>
                      <Text style={styles.detailValue}>{selectedWithdrawal.accountNumber}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Account Name</Text>
                      <Text style={styles.detailValue}>{selectedWithdrawal.accountName}</Text>
                    </View>
                    {selectedWithdrawal.bankName && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Bank Name</Text>
                        <Text style={styles.detailValue}>{selectedWithdrawal.bankName}</Text>
                      </View>
                    )}
                  </View>

                  {selectedWithdrawal.status === 'pending' && (
                    <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity 
                        style={styles.rejectButton}
                        onPress={handleReject}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <ActivityIndicator color="#EF4444" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={20} color="#EF4444" />
                            <Text style={styles.rejectButtonText}>Reject</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.approveButton}
                        onPress={handleApprove}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.approveButtonText}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
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
  filtersContainer: { paddingHorizontal: 20, paddingVertical: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 10 },
  filterChipActive: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },
  listContainer: { paddingHorizontal: 20 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  managerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginRight: 14, marginTop: 2 },
  infoContainer: { flex: 1 },
  managerNameText: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 }, 
  amountRow: { marginBottom: 2 },
  amountText: { fontSize: 16, fontWeight: '800', color: '#111827' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  metaText: { fontSize: 12, fontWeight: '600', color: '#5B21B6' },
  metaSeparator: { fontSize: 12, color: '#D1D5DB' },
  accountText: { fontSize: 12, color: '#4B5563', fontWeight: '500' }, 
  dateText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  rightContainer: { justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },  
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  detailSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  detailLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '600', flex: 1, textAlign: 'right' },
  amountValue: { fontSize: 18, fontWeight: '800', color: '#10B981' },
  actionButtonsContainer: { flexDirection: 'row', gap: 12, marginTop: 20 },
  approveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12 },
  approveButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  rejectButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#EF4444', paddingVertical: 14, borderRadius: 12 },
  rejectButtonText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
});