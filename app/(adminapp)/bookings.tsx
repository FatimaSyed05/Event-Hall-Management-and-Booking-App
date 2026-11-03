import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { webContainerStyle } from '@/constants/webstyles';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

interface Booking {
  id: string;
  customerName: string;
  hallName: string;
  totalAmount: number;
  status: string;
  date: string;
  timeSlot: string;
  paymentStatus: string;
  customerId: string;
  managerId: string;
  bookingCreatedAt?: any;
}

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const q = query(collection(db, 'bookings'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const bookingsData: Booking[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        bookingsData.push({
          id: docSnap.id,
          customerName: data.customerName || 'Unknown',
          hallName: data.hallName || 'Unknown',
          totalAmount: Number(data.totalAmount || 0),
          status: data.status || 'pending',
          date: data.date || 'N/A',
          timeSlot: data.timeSlot || 'N/A',
          paymentStatus: data.paymentStatus || 'unpaid',
          customerId: data.customerId || '',
          managerId: data.managerId || '',
          bookingCreatedAt: data.bookingCreatedAt, 
        });
      }

    bookingsData.sort((a, b) => {
      const timeA = (a as any).bookingCreatedAt?.seconds || new Date(a.date).getTime() / 1000;
      const timeB = (b as any).bookingCreatedAt?.seconds || new Date(b.date).getTime() / 1000;
      return timeB - timeA; 
    });  

      setBookings(bookingsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredBookings = activeFilter === 'All'
    ? bookings
    : bookings.filter(b => b.status === activeFilter.toLowerCase());

  const filters = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled', 'Refunded'];

  const getStatusColor = (status: string) => {
    if (status === 'confirmed' || status === 'completed') return '#10B981';
    if (status === 'pending') return '#F59E0B';
    if (status === 'cancelled' || status === 'refunded') return '#EF4444';
    return '#6B7280';
  };

  const formatAmount = (amount: number) => `PKR ${amount.toLocaleString()}`;

  const handleBookingClick = (booking: Booking) => {
    router.push({
      pathname: '/(adminapp)/booking-details' as any,
      params: { bookingId: booking.id }
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
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
        <Text style={styles.headerTitle}>All Bookings</Text>
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

        <View style={styles.listContainer}>
          {filteredBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No bookings found.</Text>
            </View>
          ) : (
            filteredBookings.map((booking) => (
              <TouchableOpacity
                key={booking.id}
                style={styles.listItem}
                onPress={() => handleBookingClick(booking)}
                activeOpacity={0.7}
              >
                {/* <View style={styles.iconBox}>
                  <Ionicons name="calendar" size={22} color="#5B21B6" />
                </View> */}

                <View style={styles.infoContainer}>
                  <Text style={styles.customerName}>{booking.customerName}</Text>
                  <Text style={styles.hallName}>{booking.hallName}</Text>
                  <Text style={styles.subText}>{booking.date}</Text>
                  <Text style={styles.subText}>{booking.timeSlot}</Text>
                </View>

                <View style={styles.rightContainer}>
                  <Text style={styles.amountText}>{formatAmount(booking.totalAmount)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
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
  listContainer: { paddingHorizontal: 40 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoContainer: { flex: 1 },
  customerName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  hallName: { fontSize: 13, fontWeight: '500', color: '#121014', marginBottom: 2 },
  subText: { fontSize: 12, color: '#9CA3AF' },
  rightContainer: { alignItems: 'flex-end' },
  amountText: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 12 },
});