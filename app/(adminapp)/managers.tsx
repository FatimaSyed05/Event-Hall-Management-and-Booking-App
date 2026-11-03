// app/(adminapp)/managers.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router'; 
import { Linking } from 'react-native'; 
import { useState, useEffect } from 'react';
import { webContainerStyle } from '@/constants/webstyles';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';
import * as IntentLauncher from 'expo-intent-launcher';

interface ManagerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  verificationDoc: string;
}

export default function ManagersScreen() {
  const { managerId } = useLocalSearchParams();
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedManager, setSelectedManager] = useState<any>(null);
  const [managersData, setManagersData] = useState<ManagerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldAutoOpen, setShouldAutoOpen] = useState(true);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

 const fetchManagers = async () => {
    setIsLoading(true);
    try {
      const constraints: any[] = [where('role', '==', 'manager')];
      if (activeFilter !== 'All') {
        const dbStatus = activeFilter === 'Pending' ? 'pending_approval' : activeFilter.toLowerCase();
        constraints.push(where('approvalStatus', '==', dbStatus));
      }
      const q = query(collection(db, 'users'), ...constraints);
      const querySnapshot = await getDocs(q);      
      const data: ManagerData[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Unknown',
        email: doc.data().email || '',
        phone: doc.data().phone || '',
        address: doc.data().address || '',
        approvalStatus: (doc.data().approvalStatus === 'pending_approval' ? 'Pending' : doc.data().approvalStatus === 'approved' ? 'Approved' : 'Rejected') as any,
        verificationDoc: doc.data().verificationDoc || '',
      }));

      setManagersData(data);
    } catch (error) {
      console.error("Error fetching managers:", error);
        Alert.alert('Error', 'Failed to load managers data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setShouldAutoOpen(true);
  }, [managerId]);

  useEffect(() => {
    if (managerId && !isLoading && managersData.length > 0 && shouldAutoOpen) {
      const targetId = Array.isArray(managerId) ? managerId[0] : String(managerId);
      if (activeFilter !== 'Pending' && activeFilter !== 'All') {
        setActiveFilter('Pending');
      }
      const targetManager = managersData.find(m => m.id === targetId);      
      if (targetManager) {
        setTimeout(() => {
          setSelectedManager(targetManager);
          setShouldAutoOpen(false); 
        }, 500);
      } else {
        setShouldAutoOpen(false);
      }
    }
  }, [managerId, managersData, isLoading, activeFilter, shouldAutoOpen]);

  useEffect(() => {
    fetchManagers();
  }, [activeFilter]); 

  const filteredManagers = activeFilter === 'All' 
    ? managersData 
    : managersData.filter(m => m.approvalStatus === activeFilter);
  const filters = ['All', 'Pending', 'Approved', 'Rejected'];
  
  const handleViewDocument = async () => {
    const docUrl = selectedManager?.verificationDoc || selectedManager?.docUri;
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

    const handleApprove = async (managerId: string) => {
    try {
      console.log(" Approving Manager Data:", selectedManager);
      await updateDoc(doc(db, 'users', managerId), { approvalStatus: 'approved' });
      const response = await fetch('https://bondless-python-floral.ngrok-free.dev/api/notify-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedManager?.email,
          name: selectedManager?.name,
          approvalStatus: 'approved'
        }),
      });
      if (response.ok) {
        Alert.alert('Success', 'Manager approved and notification email sent.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Warning', errorData.detail || 'Manager approved, but failed to send email.');
      }      
      setSelectedManager(null);
      fetchManagers(); 
    } catch (error) {
      Alert.alert('Error', 'Failed to approve manager.');
    }
  };

  const handleReject = async (managerId: string) => {
    try {
      console.log(" Rejecting Manager Data:", selectedManager);
      await updateDoc(doc(db, 'users', managerId), { approvalStatus: 'rejected' });
      const response = await fetch('https://bondless-python-floral.ngrok-free.dev/api/notify-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedManager?.email,
          name: selectedManager?.name,
          approvalStatus: 'rejected'
        }),
      });
      if (response.ok) {
        Alert.alert('Success', 'Manager rejected and notification email sent.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Warning', errorData.detail || 'Manager rejected, but failed to send notification email.');
      }      
      setSelectedManager(null);
      fetchManagers(); 
    } catch (error) {
      Alert.alert('Error', 'Failed to reject manager.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Managers</Text>
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
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
 
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5B21B6" />
            <Text style={styles.loadingText}>Loading managers...</Text>
          </View>
        ) : (
        <View style={styles.listContainer}>
          {filteredManagers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="person-circle-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No managers found in this category.</Text>
            </View>
          ) : (
            filteredManagers.map((manager) => (
              <TouchableOpacity
                key={manager.id}
                style={styles.listItem}
                onPress={() => setSelectedManager(manager)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarBox}>
                    <Ionicons name="person-circle" size={40} color="#535157" />
                </View>
                
                <View style={styles.textContainer}>
                  <Text style={styles.managerName}>{manager.name}</Text>
                  <Text style={styles.managerAddress} numberOfLines={1}>{manager.address}</Text>
                </View>

                <View style={styles.rightContainer}>
                  {manager.approvalStatus === 'Approved' ? (
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    ) : manager.approvalStatus === 'Pending' ? (
                      <View style={styles.statusDotPending} />
                    ) : (
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                    )}
                    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        )}
      </ScrollView>

      {selectedManager && (
        <Modal visible={true} transparent animationType="slide" onRequestClose={() => setSelectedManager(null)}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setSelectedManager(null)} activeOpacity={1} />
          <View style={styles.modalOverlayContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Manager Details</Text>
                <TouchableOpacity onPress={() => setSelectedManager(null)}>
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Full Name</Text>
                  <Text style={styles.detailValue}>{selectedManager.name}</Text>
                </View>
                <View style={styles.divider} />
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email Address</Text>
                  <Text style={styles.detailValue}>{selectedManager.email}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone Number</Text>
                  <Text style={styles.detailValue}>{selectedManager.phone}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{selectedManager.address}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.documentSection}>
                <Text style={styles.detailLabel}>Submitted Document</Text>
               <TouchableOpacity 
                  style={[styles.docButton, (!selectedManager.verificationDoc || isGeneratingDoc) && { opacity: 0.5 }]} 
                  onPress={handleViewDocument}
                  disabled={!selectedManager.verificationDoc || isGeneratingDoc}
                >
                  {isGeneratingDoc ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <Ionicons 
                      name={selectedManager.verificationDoc?.toLowerCase().includes('.pdf') ? 'document-text-outline' : 'image-outline'} 
                      size={20} 
                      color="#2563EB" 
                    />
                  )}
                  <Text style={styles.docButtonText}>
                    {isGeneratingDoc ? 'Downloading...' : selectedManager.verificationDoc ? 'View Document' : 'No Document Uploaded'}
                  </Text>
                </TouchableOpacity>
                </View>
                {/* <View style={styles.documentSection}>
                  <Text style={styles.detailLabel}>Submitted Document</Text>
                  <TouchableOpacity style={styles.docButton} onPress={handleViewDocument}>
                    <Ionicons 
                      name={selectedManager.docName.toLowerCase().endsWith('.pdf') ? 'document-text-outline' : 'image-outline'} 
                      size={20} 
                      color="#2563EB" 
                    />
                    <Text style={styles.docButtonText}>View {selectedManager.docName}</Text>
                  </TouchableOpacity>
                </View> */}
                <View style={styles.divider} />
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Registration Status</Text>
                  <Text style={[styles.detailValue, { color: selectedManager.approvalStatus === 'Approved' ? '#10B981' : selectedManager.approvalStatus === 'Rejected' ? '#EF4444' : '#F59E0B', fontWeight: '700' }]}>
                    {selectedManager.approvalStatus}
                  </Text>
                </View>

                {selectedManager.approvalStatus === 'Pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]}  onPress={() => handleReject(selectedManager.id)}>
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(selectedManager.id)}>
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scrollContent: { paddingBottom: 40 },
  filtersContainer: { paddingHorizontal: 20, paddingVertical: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#ffffff64', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 10 },
  filterChipActive: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },
  listContainer: { paddingHorizontal: 20 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatarBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  textContainer: { flex: 1 },
  managerName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  managerAddress: { fontSize: 13, color: '#6B7280' },
  rightContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDotPending: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' }, 
  emptyState: { alignItems: 'center', paddingVertical: 60 }, 
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 12 },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalOverlayContent: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  detailRow: { paddingVertical: 8 },
  detailLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  documentSection: { marginTop: 8, marginBottom: 24 },
  docButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 14, borderRadius: 12, marginTop: 8, gap: 10 },
  docButtonText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { backgroundColor: '#dd4643' },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' }, 
  loadingContainer: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
});