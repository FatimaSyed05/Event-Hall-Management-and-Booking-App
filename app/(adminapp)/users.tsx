// app/(adminapp)/users.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, BackHandler, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import AdminBottomNav from '../../components/admin-bottom-nav'; 
import { webContainerStyle } from '@/constants/webstyles';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig'; 

export default function UsersScreen() {
  const [usersData, setUsersData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const params = useLocalSearchParams();

  const [selectedRole, setSelectedRole] = useState<'All' | 'Customers' | 'Managers'>(
    (params.role as 'All' | 'Customers' | 'Managers') || 'All'
  );
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Active' | 'Suspended' | 'Deleted'>(
    (params.status as 'All' | 'Active' | 'Suspended' | 'Deleted') || 'All'
  );

  useEffect(() => {
    const backAction = () => {
      if (selectedRole !== 'All' || selectedStatus !== 'All') {
        setSelectedRole('All');
        setSelectedStatus('All');
        router.setParams({ role: 'All', status: 'All' });
        return true; 
      }
      
      return false; 
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedRole, selectedStatus]);

  const handleRoleFilter = (role: 'All' | 'Customers' | 'Managers') => {
    setSelectedRole(role);
    router.setParams({ role, status: selectedStatus });
  };

  const handleStatusFilter = (status: 'All' | 'Active' | 'Suspended' | 'Deleted') => {
    setSelectedStatus(status);
    router.setParams({ role: selectedRole, status });
  };

  // const usersData = [
  //   {
  //     id: '1', role: 'Managers', name: 'Ali Raza', email: 'ali.raza@example.com', phone: '0300-1234567',
  //     address: 'House 123, Wapda Town, Lahore', status: 'Active', docName: 'CNIC_Front.jpg',
  //     docUri: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb130?w=800',
  //     halls: ['Imperial Hall', 'Grand Regency']
  //   },
  //   {
  //     id: '2', role: 'Customers', name: 'Usman Malik', email: 'usman.m@example.com', phone: '0333-9876543',
  //     address: 'Building 7, Gulberg III, Lahore', status: 'Active',
  //     bookings: [{ id: 'B1', hall: 'Royal Marquee', date: 'Dec 15, 2024', status: 'Confirmed' }]
  //   },
  //   {
  //     id: '3', role: 'Managers', name: 'Ahmed Khan', email: 'ahmed.k@example.com', phone: '0321-7654321',
  //     address: 'Plot 45, F-10, Islamabad', status: 'Suspended', docName: 'NTN_Letter.pdf',
  //     docUri: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb130?w=800',
  //     halls: ['City Convention Center']
  //   },
  //   {
  //     id: '4', role: 'Customers', name: 'Bilal Sheikh', email: 'bilal.s@example.com', phone: '0345-1122334',
  //     address: 'DHA Phase 6, Karachi', status: 'Deleted',
  //     bookings: []
  //   },
  //   {
  //     id: '5', role: 'Managers', name: 'Sara Ahmed', email: 'sara.a@example.com', phone: '0301-5556667',
  //     address: 'Model Town, Lahore', status: 'Active', docName: 'Bank_Statement.pdf',
  //     docUri: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb130?w=800',
  //     halls: ['Pearl Event Hall', 'Skyline Arena', 'Ocean View Marquee']
  //   }
  // ];

  useEffect(() => {
    setIsLoading(true);
    const q = query(
      collection(db, 'users'), 
      where('role', 'in', ['customer', 'manager']) 
    );    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          role: d.role === 'customer' ? 'Customers' : 'Managers',
          status: d.status === 'approved' ? 'Active' : 
                  d.status === 'suspended' ? 'Suspended' : 
                  d.status === 'deleted' ? 'Deleted' : 'Active'
        };
      });
      setUsersData(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredUsers = usersData.filter(user => {
    const roleMatch = selectedRole === 'All' || user.role === selectedRole;
    const statusMatch = selectedStatus === 'All' || user.status === selectedStatus;
    return roleMatch && statusMatch;
  });

  const roleFilters = ['All', 'Customers', 'Managers'];
  const statusFilters = ['All', 'Active', 'Suspended', 'Deleted'];

  const handleUserClick = (user: any) => {
    router.push({
      pathname: '/(adminapp)/account-details' as any,
      params: { userData: JSON.stringify(user) }
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Users</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {roleFilters.map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.filterChip, selectedRole === role && styles.filterChipActive]}
              onPress={() => handleRoleFilter(role as any)}
            >
              <Text style={[styles.filterText, selectedRole === role && styles.filterTextActive]}>{role}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {statusFilters.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, selectedStatus === status && styles.filterChipActive]}
              onPress={() => handleStatusFilter(status as any)}
            >
              <Text style={[styles.filterText, selectedStatus === status && styles.filterTextActive]}>{status}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.listContainer}>
          {isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#5B21B6" />
              <Text style={styles.emptyText}>Loading users...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="person-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No users found matching these filters.</Text>
            </View>
          ) : (
            filteredUsers.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={styles.listItem}
                onPress={() => handleUserClick(user)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarBox}>
                    <Ionicons name="person-circle" size={40} color="#535157" />
                </View>
                
                <View style={styles.textContainer}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
      <AdminBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scrollContent: { paddingBottom: 40 },
  filterRow: { paddingHorizontal: 20, paddingVertical: 6 }, 
  filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#ffffffa1', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 6 }, 
  filterChipActive: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },
  listContainer: { paddingHorizontal: 20, marginTop: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatarBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  textContainer: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  userEmail: { fontSize: 13, color: '#6B7280' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 12 },
});