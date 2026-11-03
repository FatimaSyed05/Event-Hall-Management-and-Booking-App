// app/(managerapp)/manage-bookings.tsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, BackHandler, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNav from '../../components/manager-bottom-nav';
import { webContainerStyle } from '@/constants/webstyles';
import { useAuth } from '../../backend/context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

type Booking = {
  id: string;
  customerName: string;
  contactNumber: string; 
  eventType: string;
  bookingDate: Date;
  displayDate: string;
  displayTime: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'refunded';
  source: 'online' | 'offline';
  amount: number;
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  hallName: string;
};

export default function ManageBookingsScreen() {
  const { userData } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded' | 'online' | 'offline'>('all');  const [selectedHall, setSelectedHall] = useState<string>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const halls = ['all', ...Array.from(new Set(bookings.map(b => b.hallName)))];
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userData?.uid) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'bookings'),
      where('managerId', '==', userData.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const realBookings: Booking[] = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        let bookingDate = new Date();
        if (d.date) {
          bookingDate = new Date(d.date);  
        } else if (d.bookingCreatedAt?.toDate) {
          bookingDate = d.bookingCreatedAt.toDate();  
        }
        const displayDate = bookingDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });

        const displayTime = d.timeSlot || 'Time not set';
        let paymentStatus: 'paid' | 'unpaid' | 'partial' = 'unpaid';
        const paymentStatusFromDb = d.paymentStatus;
        if (paymentStatusFromDb === 'fully_paid') {
          paymentStatus = 'paid';
        } else if (paymentStatusFromDb === 'advance_paid') {
          paymentStatus = 'partial';
        }
        let totalAmount = 0;

        if (d.totalAmount && d.totalAmount > 0) {
          totalAmount = Number(d.totalAmount);
        } 
        else if (d.advanceRequired && d.remainingBalance) {
          totalAmount = Number(d.advanceRequired) + Number(d.remainingBalance);
        }
        else if (d.advanceRequired && d.advanceRequired > 0) {
          totalAmount = Number(d.advanceRequired) * 3.33; 
        }

        return {
          id: docSnap.id,
          customerName: d.customerName || 'Unknown Customer',
          contactNumber: d.customerPhone || 'N/A',
          eventType: d.functionType || 'Event',
          bookingDate: bookingDate,
          displayDate: displayDate,
          displayTime: displayTime,
          status: (d.status || 'pending') as any,
          source: d.originalRequestId ? 'online' : 'offline',
          amount: totalAmount,
          paymentStatus: paymentStatus,
          hallName: d.hallName || 'Unknown Hall',
        };
      });

      setBookings(realBookings);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.uid]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  const currentMonth = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const previousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const filteredBookings = bookings.filter(booking => {
    const bookingMonth = booking.bookingDate.getMonth();
    const bookingYear = booking.bookingDate.getFullYear();
    const selectedMonth = currentDate.getMonth();
    const selectedYear = currentDate.getFullYear();
    
    if (bookingMonth !== selectedMonth || bookingYear !== selectedYear) {
      return false; 
    }
    
    if (selectedHall !== 'all' && booking.hallName !== selectedHall) {
      return false;
    }
    
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'online') return booking.source === 'online';
    if (selectedFilter === 'offline') return booking.source === 'offline';
    if (selectedFilter === 'pending') return booking.status === 'pending';
    if (selectedFilter === 'confirmed') return booking.status === 'confirmed';
    if (selectedFilter === 'completed') return booking.status === 'completed';
    if (selectedFilter === 'cancelled') return booking.status === 'cancelled';
    if (selectedFilter === 'refunded') return booking.status === 'refunded';
    return true;
  }).sort((a, b) => b.bookingDate.getTime() - a.bookingDate.getTime());

  const monthBookings = bookings.filter(b => {
    return b.bookingDate.getMonth() === currentDate.getMonth() && 
           b.bookingDate.getFullYear() === currentDate.getFullYear();
  });

  const getHallCount = (hall: string) => {
    if (hall === 'all') return monthBookings.length;
    return monthBookings.filter(b => b.hallName === hall).length;
  };

  const relevantBookings = selectedHall === 'all' 
    ? monthBookings 
    : monthBookings.filter(b => b.hallName === selectedHall);

  const onlineCount = relevantBookings.filter(b => b.source === 'online').length;
  const offlineCount = relevantBookings.filter(b => b.source === 'offline').length;
  const pendingCount = relevantBookings.filter(b => b.status === 'pending').length;
  const confirmedCount = relevantBookings.filter(b => b.status === 'confirmed').length;
  const completedCount = relevantBookings.filter(b => b.status === 'completed').length;
  const cancelledCount = relevantBookings.filter(b => b.status === 'cancelled').length;
  const refundedCount = relevantBookings.filter(b => b.status === 'refunded').length;

 useEffect(() => {
  const backAction = () => {
    if (selectedHall !== 'all' || selectedFilter !== 'all') {
      setSelectedHall('all');
      setSelectedFilter('all');
      return true; 
    }
    return false;
  };

  const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
  return () => backHandler.remove();
}, [selectedHall, selectedFilter]);

  const handleBookingPress = (bookingId: string) => {
    router.push({
      pathname: '/(managerapp)/booking-details' as any,
      params: { bookingId }
    });
  };

  const handleAddOfflineBooking = () => {
    router.push({
      pathname: '/(managerapp)/add-offline-booking' as any
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>All Bookings</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.content}>
            <View style={styles.calendarNav}>
              <TouchableOpacity onPress={previousMonth} style={styles.monthBtn}>
                <Ionicons name="chevron-back" size={20} color="#5B21B6" />
              </TouchableOpacity>
              <Text style={styles.monthText}>{currentMonth} {currentYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.monthBtn}>
                <Ionicons name="chevron-forward" size={20} color="#5B21B6" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {halls.map((hall) => (
                <TouchableOpacity 
                  key={hall}
                  style={[styles.filterChip, selectedHall === hall && styles.filterChipActive]}
                  onPress={() => setSelectedHall(hall)} >
                  <Text style={[styles.filterText, selectedHall === hall && styles.filterTextActive]}>
                    {hall === 'all' ? 'All Halls' : hall} ({getHallCount(hall)})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity 
                style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('all')} >
                <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
                  All ({relevantBookings.length})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterChip, selectedFilter === 'pending' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('pending')} >
                <Text style={[styles.filterText, selectedFilter === 'pending' && styles.filterTextActive]}>
                  Pending ({pendingCount})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterChip, selectedFilter === 'confirmed' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('confirmed')} >
                <Text style={[styles.filterText, selectedFilter === 'confirmed' && styles.filterTextActive]}>
                  Confirmed ({confirmedCount})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterChip, selectedFilter === 'completed' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('completed')} >
                <Text style={[styles.filterText, selectedFilter === 'completed' && styles.filterTextActive]}>
                  Completed ({completedCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.filterChip, selectedFilter === 'cancelled' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('cancelled')} >
                <Text style={[styles.filterText, selectedFilter === 'cancelled' && styles.filterTextActive]}>
                  Cancelled ({cancelledCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.filterChip, selectedFilter === 'refunded' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('refunded')} >
                <Text style={[styles.filterText, selectedFilter === 'refunded' && styles.filterTextActive]}>
                  Refunded ({refundedCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.filterChip, selectedFilter === 'online' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('online')} >
                <Text style={[styles.filterText, selectedFilter === 'online' && styles.filterTextActive]}>
                  Online ({onlineCount})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterChip, selectedFilter === 'offline' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('offline')} >
                <Text style={[styles.filterText, selectedFilter === 'offline' && styles.filterTextActive]}>
                  Offline ({offlineCount})
                </Text>
              </TouchableOpacity>                            
            </ScrollView>

            <View style={styles.bookingsSection}>
              {isLoading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="large" color="#5B21B6" />
                  <Text style={styles.emptyText}>Loading bookings...</Text>
                </View>
              ) : filteredBookings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={50} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No bookings found for {currentMonth} {currentYear}</Text>
                </View>
              ) : (
                filteredBookings.map((booking) => {
                  return (
                    <TouchableOpacity
                      key={booking.id}
                      style={styles.bookingCard}
                      onPress={() => handleBookingPress(booking.id)}
                      activeOpacity={0.7} >
                      <View style={styles.cardMain}>
                        <View style={styles.cardLeft}>
                          <Text style={styles.customerName}>{booking.customerName}</Text>
                          <Text style={styles.hallText}>{booking.hallName}</Text>
                          
                          <View style={styles.infoRow}>
                            <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                            <Text style={styles.dateText}>{booking.displayDate}</Text>
                            <Text style={styles.dot}>•</Text>
                            <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                            <Text style={styles.dateText}>{booking.displayTime}</Text>
                          </View>
                          
                          <Text style={styles.amountText}>PKR {booking.amount.toLocaleString()}</Text>
                        </View>
                        
                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>

        <TouchableOpacity 
          style={styles.floatingBtn}
          onPress={handleAddOfflineBooking}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <BottomNav />
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
  filterScroll: { gap: 8, marginBottom: 12 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', gap: 4 },
  filterChipActive: { backgroundColor: '#5B21B6' },
  filterText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF' },
  bookingsSection: { marginBottom: 20, marginTop: 8 },
  bookingCard: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 10 },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  cardLeft: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  hallText: { fontSize: 12, color: '#131416', fontWeight: '500', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  dot: { fontSize: 12, color: '#9CA3AF' },
  dateText: { fontSize: 11, color: '#9CA3AF' },
  amountText: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 12, textAlign: 'center' },
  floatingBtn: { position: 'absolute', bottom: 100, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#5B21B6', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, zIndex: 999 },
});