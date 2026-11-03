// app/(managerapp)/requests.tsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, BackHandler, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useMemo } from 'react';
import BottomNav from '../../components/manager-bottom-nav';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '@/constants/webstyles';
import { useAuth } from '../../backend/context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

type Request = {
  id: string;
  customerName: string;
  hallName: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: string;
};

export default function ManageRequestsScreen() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Accepted' | 'Rejected'>('All');
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userData?.uid) return;
    setIsLoading(true);

    const q = query(
      collection(db, 'requests'),
      where('managerId', '==', userData.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedData = snapshot.docs.map(doc => {
        const data = doc.data();
        const rawDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        return {
          id: doc.id,
          customerName: data.customerName || 'Unknown Customer',
          hallName: data.hallName || 'Unknown Hall',
          status: data.status || 'pending',
          rawDate: rawDate,
        };
      });
      fetchedData.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
      const formattedRequests: Request[] = fetchedData.map(item => ({
        id: item.id,
        customerName: item.customerName,
        hallName: item.hallName,
        status: item.status,
        timestamp: item.rawDate.toLocaleString('en-US', { 
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        })
      }));

      setRequests(formattedRequests);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.uid]);

  const filteredRequests = useMemo(() => {
    if (activeTab === 'All') return requests;
    return requests.filter(request => {
      if (activeTab === 'Pending') return request.status === 'pending';
      if (activeTab === 'Accepted') return request.status === 'accepted';
      if (activeTab === 'Rejected') return request.status === 'rejected';
      return true;
    });
  }, [requests, activeTab]);

  useEffect(() => {
    const backAction = () => {
      if (activeTab !== 'All') {
        setActiveTab('All');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [activeTab]);

  const handleRequestPress = (requestId: string) => {
    router.push({
      pathname: '/(managerapp)/request-details' as any,
      params: { requestId }
    });
  };

  const handleBackPress = () => {
    if (activeTab !== 'All') {
      setActiveTab('All');
    } else {
      router.back();
    }
  };

  const renderCompactCard = (request: Request) => {
    let statusColor = '#F59E0B'; 
    
    if (request.status === 'accepted') {
      statusColor = '#10B981'; 
    } else if (request.status === 'rejected') {
      statusColor = '#EF4444'; 
    }

    return (
      <TouchableOpacity
        key={request.id}
        style={styles.requestCard}
        onPress={() => handleRequestPress(request.id)}
        activeOpacity={0.7} 
      >
        <View style={styles.cardMain}>
          <View style={styles.cardLeft}>
            <Text style={styles.customerName}>{request.customerName}</Text>
            <Text style={styles.hallName}>{request.hallName}</Text>
            <Text style={styles.timestamp}>{request.timestamp}</Text>
          </View>
          
          <View style={styles.cardRight}>
            {request.status === 'pending' ? (
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            ) : request.status === 'accepted' ? (
              <Ionicons name="checkmark" size={24} color={statusColor} style={{ fontWeight: '900', lineHeight: 28 }} />
            ) : (
              <Ionicons name="close" size={24} color={statusColor} style={{ fontWeight: '900', lineHeight: 28 }} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (type: string) => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={type === 'All' ? 'list-outline' : type === 'Pending' ? 'time-outline' : type === 'Accepted' ? 'checkmark-circle-outline' : 'close-circle-outline'} 
        size={60} 
        color="#D1D5DB" 
      />
      <Text style={styles.emptyTitle}>No {type} Requests</Text>
      <Text style={styles.emptyText}>
        {type === 'All' && 'No request history available'}
        {type === 'Pending' && 'No pending requests to review'}
        {type === 'Accepted' && 'You haven\'t accepted any requests yet'}
        {type === 'Rejected' && 'You haven\'t rejected any requests yet'}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={styles.loadingText}>Loading request history...</Text>
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent} 
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Request History</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'All' && styles.activeTab]}
              onPress={() => setActiveTab('All')} 
            >
              <Text style={[styles.tabText, activeTab === 'All' && styles.activeTabText]}>All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'Pending' && styles.activeTab]}
              onPress={() => setActiveTab('Pending')} 
            >
              <Text style={[styles.tabText, activeTab === 'Pending' && styles.activeTabText]}>Pending</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tab, activeTab === 'Accepted' && styles.activeTab]}
              onPress={() => setActiveTab('Accepted')} 
            >
              <Text style={[styles.tabText, activeTab === 'Accepted' && styles.activeTabText]}>Accepted</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'Rejected' && styles.activeTab]}
              onPress={() => setActiveTab('Rejected')} 
            >
              <Text style={[styles.tabText, activeTab === 'Rejected' && styles.activeTabText]}>Rejected</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {filteredRequests.length > 0 ? (
              filteredRequests.map(renderCompactCard)
            ) : (
              renderEmptyState(activeTab)
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 25, paddingBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 0 },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#5B21B6' },
  tabText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  activeTabText: { color: '#5B21B6', fontWeight: '700' },
  content: { paddingHorizontal: 18, paddingTop: 16 },
  requestCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flex: 1, paddingRight: 12 },
  cardRight: { alignItems: 'center', justifyContent: 'center', width: 30 },
  customerName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  hallName: { fontSize: 13, color: '#4B5563', fontWeight: '500', marginBottom: 6 },
  timestamp: { fontSize: 11, color: '#9CA3AF' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});