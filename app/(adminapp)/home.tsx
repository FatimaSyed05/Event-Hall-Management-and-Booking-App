// app/(adminapp)/home.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../../components/admin-bottom-nav'; 
import { webContainerStyle } from '@/constants/webstyles';
import { collection, query, where, onSnapshot, count } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';
import { useAuth } from '../../backend/context/AuthContext';

export default function AdminHome() {
  const { userData } = useAuth();
  const [pendingManagersCount, setPendingManagersCount] = useState(0);
  const [pendingHallsCount, setPendingHallsCount] = useState(0); 
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const adminName = userData?.name || "Fatima Syed"; 
    
  const stats = [
    { id: '1', title: 'Managers', count: pendingManagersCount, icon: 'people', route: '/(adminapp)/managers' },
    { id: '2', title: 'Halls', count: pendingHallsCount, icon: 'business', route: '/(adminapp)/halls' },
    { id: '3', title: 'Bookings', count: totalBookingsCount, icon: 'calendar', route: '/(adminapp)/bookings' },
    { id: '4', title: 'Withdrawals', count: pendingWithdrawalsCount, icon: 'wallet', route: '/(adminapp)/withdrawals' },
    { id: '5', title: 'Commission', count: 0, icon: 'cash', route: '/(adminapp)/payments' },
  ];
  useEffect(() => {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'manager'),
    where('status', '==', 'pending_approval')
  );  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    setPendingManagersCount(snapshot.size);
  }, (error) => {
    console.error("Error listening to managers:", error);
  });
  return () => unsubscribe();
}, []);

useEffect(() => {
  const qManagers = query(
    collection(db, 'users'),
    where('role', '==', 'manager'),
    where('status', '==', 'pending_approval')
  );
  const unsubManagers = onSnapshot(qManagers, (snapshot) => {
    setPendingManagersCount(snapshot.size);
  }, (error) => {
    console.error("Error listening to managers:", error);
  });

  const qHalls = query(
    collection(db, 'halls'),
    where('status', '==', 'pending_approval')
  );
  const unsubHalls = onSnapshot(qHalls, (snapshot) => {
    setPendingHallsCount(snapshot.size);
  }, (error) => {
    console.error("Error listening to halls:", error);
  });

  const qBookings = query(collection(db, 'bookings'));
  const unsubBookings = onSnapshot(qBookings, (snapshot) => {
    setTotalBookingsCount(snapshot.size);
  }, (error) => {
    console.error("Error listening to bookings:", error);
  });

  const qWithdrawals = query(
    collection(db, 'withdrawals'),
    where('status', '==', 'pending')
  );
  const unsubWithdrawals = onSnapshot(qWithdrawals, (snapshot) => {
    setPendingWithdrawalsCount(snapshot.size);
  }, (error) => {
    console.error("Error listening to withdrawals:", error);
  });

  const qNotifications = query(
    collection(db, 'notifications'),
    where('targetRole', '==', 'admin'),
    where('status', '==', 'unread')
  );
  const unsubNotifications = onSnapshot(qNotifications, (snapshot) => {
    setUnreadNotificationsCount(snapshot.size);
  }, (error) => {
    console.error("Error listening to notifications:", error);
  });

  return () => {
    unsubManagers();
    unsubHalls();
    unsubBookings();
    unsubWithdrawals();
    unsubNotifications();
  };
}, []);

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>Welcome back,</Text>
            <Text style={styles.headerTitle}>Fatima Syed</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(adminapp)/profile' as any)}>
            <Ionicons name="person-circle-outline" size={28} color="#333333" />
          </TouchableOpacity>
        </View>

        
        <View style={styles.tilesContainer}>
          {stats.map((stat) => (
            <TouchableOpacity 
              key={stat.id} 
              style={styles.statTile}
              onPress={() => router.push(stat.route as any)}
              activeOpacity={0.7}
            >
              <Ionicons name={stat.icon as any} size={24} color="#413f3f" style={{ marginRight: 12 }} />
              
              <View style={styles.tileMiddle}>
                <Text style={styles.tileTitle}>{stat.title}</Text>
              </View>

              <View style={styles.tileRight}>
                {stat.count > 0 && (
                  <Text style={styles.countText}>{stat.count}</Text>
                )}
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
      
      <AdminBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  headerSubtitle: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginTop: 2 },
  profileBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  tilesContainer: { paddingHorizontal: 20, paddingTop: 30 },
  statTile: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  tileMiddle: { flex: 1 },
  tileTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  tileRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  countText: { fontSize: 16, fontWeight: '700', color: '#2563EB', marginRight: 8 }, });