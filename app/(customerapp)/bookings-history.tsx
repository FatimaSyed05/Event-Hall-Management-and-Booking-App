// app/(customerapp)/bookings-history.tsx
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView, ActivityIndicator, BackHandler, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo, useCallback, useEffect } from 'react';
import CustomerBottomNav from '../../components/customer-bottom-nav';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '../../constants/webstyles';
import { useAuth } from '../../backend/context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

type BookingStatus = 'requested' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded' | 'rejected' | 'accepted';
type BookingType = 'request' | 'booking';

type Booking = {
  id: string;
  hallName: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  status: BookingStatus;
  type: BookingType;
  sortDate: Date;
  originalRequestId?: string;
};

// const dummyBookings: Booking[] = [
//   { id: 'B123', hallName: 'Royal Event Marquee', eventType: 'Wedding', eventDate: '20/06/2026', eventTime: '6:00 PM to 10:00 PM', status: 'confirmed', type: 'booking', sortDate: new Date(2026, 5, 20) },
//   { id: 'B125', hallName: 'Grand Regency Hall', eventType: 'Walima', eventDate: '05/06/2026', eventTime: '6:00 PM to 10:00 PM', status: 'pending', type: 'booking', sortDate: new Date(2026, 5, 5) },
//   { id: 'B124', hallName: 'Grand Regency Hall', eventType: 'Walima', eventDate: '05/06/2026', eventTime: '6:00 PM to 10:00 PM', status: 'completed', type: 'booking', sortDate: new Date(2026, 5, 5) },
//   { id: 'B126', hallName: 'City Convention Center', eventType: 'Seminar', eventDate: '12/09/2026', eventTime: '10:00 AM to 2:00 PM', status: 'cancelled', type: 'booking', sortDate: new Date(2026, 8, 12) },
//   { id: 'B127', hallName: 'Pearl Continental', eventType: 'Conference', eventDate: '15/10/2026', eventTime: '9:00 AM to 5:00 PM', status: 'refunded', type: 'booking', sortDate: new Date(2026, 9, 15) },
// ];

export default function BookingsHistoryScreen() {
  const { userData } = useAuth();
  const [mainCategory, setMainCategory] = useState<'all' | 'request' | 'booking'>('all');
  const [subFilter, setSubFilter] = useState('all'); 
  
  const [realRequests, setRealRequests] = useState<Booking[]>([]);
  const [realBookings, setRealBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const handleFilterChange = (main: 'all' | 'request' | 'booking', sub: string = 'all') => {
    setMainCategory(main);
    setSubFilter(sub);
  };

  const isAtRoot = mainCategory === 'all' && subFilter === 'all';

  const handleBackPress = () => {
    if (!isAtRoot) {
      setMainCategory('all');
      setSubFilter('all');
    } else {
      router.back();
    }
  };

  useEffect(() => {
    const backAction = () => {
      if (!isAtRoot) {
        setMainCategory('all');
        setSubFilter('all');
        return true; 
      }
      return false; 
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isAtRoot]);

  useEffect(() => {
    if (!userData?.uid) return;
    setIsLoading(true);
    const qReq = query(collection(db, 'requests'), where('customerId', '==', userData.uid));
    const unsubReq = onSnapshot(qReq, (snapshot) => {
      const reqs = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          hallName: d.hallName || 'Unknown Hall',
          eventType: d.functionType || 'Event',
          eventDate: d.date || 'N/A',
          eventTime: d.timeSlot || 'N/A',
          status: (d.status === 'rejected' ? 'rejected' : d.status === 'accepted' ? 'accepted' : 'requested') as BookingStatus,
          type: 'request' as BookingType,
          sortDate: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(0)
        };
      });
      setRealRequests(reqs);
    });

    const qBook = query(collection(db, 'bookings'), where('customerId', '==', userData.uid));
    const unsubBook = onSnapshot(qBook, (snapshot) => {
      const books = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          hallName: d.hallName || 'Unknown Hall',
          eventType: d.functionType || 'Event',
          eventDate: d.date || 'N/A',
          eventTime: d.timeSlot || 'N/A',
          status: d.status as BookingStatus, 
          type: 'booking' as BookingType,
          sortDate: d.bookingCreatedAt?.toDate ? d.bookingCreatedAt.toDate() : new Date(0),
          originalRequestId: d.originalRequestId || undefined,
        };
      });
      setRealBookings(books);
      setIsLoading(false);
    });

    return () => {
      unsubReq();
      unsubBook();
    };
  }, [userData?.uid]);

     const allData = useMemo(() => {
    const paidBookingRequestIds = new Set(
      realBookings
        .filter(b => 
          b.originalRequestId && 
          b.status !== 'pending' &&    
          b.status !== 'rejected'       
        )
        .map(b => b.originalRequestId)
    );
    
    const filteredRequests = realRequests.filter(
      req => !paidBookingRequestIds.has(req.id)
    );
    
    const combined = [...filteredRequests, ...realBookings];
    combined.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
    
    const uniqueData = combined.filter((item, index, self) => 
      index === self.findIndex((t) => t.id === item.id)
    );
    return uniqueData;
  }, [realRequests, realBookings]);

  const filteredData = useMemo(() => {
    let data = allData;
    if (mainCategory === 'request') {
      data = data.filter(b => b.type === 'request');
    } else if (mainCategory === 'booking') {
      data = data.filter(b => b.type === 'booking');
    }
    if (subFilter !== 'all') {
      data = data.filter(b => b.status === subFilter);
    }
    return data;
  }, [allData, mainCategory, subFilter]);

  const renderBooking = ({ item }: { item: Booking }) => (
    <TouchableOpacity 
      style={styles.bookingCard}
     onPress={() => {
        if (item.type === 'request') {
          router.push(`/(customerapp)/request-details?requestId=${item.id}` as any);
        } else if (item.status === 'pending' && item.originalRequestId) {
          router.push(`/(customerapp)/request-details?requestId=${item.originalRequestId}` as any);
        } else {
          router.push(`/(customerapp)/booking-details?bookingId=${item.id}` as any);
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <Text style={styles.hallName}>{item.hallName}</Text>
        <Text style={styles.eventType}>{item.eventType}</Text>       
        <Text style={styles.detailText}>{item.eventDate}</Text>
        <Text style={styles.detailText}>{item.eventTime}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={styles.loadingText}>Loading your history...</Text>
        </View>
        <CustomerBottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={26} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.titleText}>My Bookings</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mainFiltersContent}style={styles.horizontalFix}>
            {['all', 'request', 'booking'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.mainFilterBtn, mainCategory === cat && styles.mainFilterBtnActive]}
                onPress={() => handleFilterChange(cat as any, 'all')}
              >
                <Text style={[styles.mainFilterText, mainCategory === cat && styles.mainFilterTextActive]}>
                  {cat === 'all' ? 'All' : cat === 'request' ? 'Requests' : 'Bookings'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {mainCategory === 'request' && (
            <View style={styles.subFilterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subFiltersContent}style={styles.horizontalFix}>
                {[
                  { id: 'all', name: 'All' },
                  { id: 'requested', name: 'Pending' },
                  { id: 'accepted', name: 'Accepted' },
                  { id: 'rejected', name: 'Rejected' }
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[styles.subFilterTab, subFilter === filter.id && styles.subFilterTabActive]}
                    onPress={() => handleFilterChange(mainCategory, filter.id)}
                  >
                    <Text style={[styles.subFilterText, subFilter === filter.id && styles.subFilterTextActive]}>
                      {filter.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {mainCategory === 'booking' && (
            <View style={styles.subFilterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subFiltersContent} style={styles.horizontalFix}>
                {[
                  { id: 'all', name: 'All' },
                  { id: 'pending', name: 'Pending' },
                  { id: 'confirmed', name: 'Confirmed' },
                  { id: 'completed', name: 'Completed' },
                  { id: 'cancelled', name: 'Cancelled' },
                  { id: 'refunded', name: 'Refunded' }
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[styles.subFilterTab, subFilter === filter.id && styles.subFilterTabActive]}
                    onPress={() => handleFilterChange(mainCategory, filter.id)}
                  >
                    <Text style={[styles.subFilterText, subFilter === filter.id && styles.subFilterTextActive]}>
                      {filter.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.listWrapper}>
            <FlatList
              data={filteredData}
              keyExtractor={(item) => item.id}
              renderItem={renderBooking}
              scrollEnabled={false} 
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
               style={styles.flatListFix}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={60} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No records found</Text>
                  <Text style={styles.emptySubtext}>
                    {mainCategory === 'all' ? "You haven't made any requests or bookings yet." : `No ${mainCategory} records match this filter.`}
                  </Text>
                </View>
              }
            />
          </View>

        </ScrollView>
        
        <CustomerBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  titleText: { fontSize: 20, fontWeight: '700', color: '#111827' },
  mainFiltersContent: { paddingHorizontal: 24, paddingBottom: 12, gap: 12, alignItems: 'center' },
  mainFilterBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  mainFilterBtnActive: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
  mainFilterText: { fontSize: 14, color: '#4B5563', fontWeight: '600' },
  mainFilterTextActive: { color: '#FFFFFF', fontWeight: '600' },
  subFilterSection: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 12 },
  subFiltersContent: { paddingHorizontal: 24, gap: 12, alignItems: 'center' },
  subFilterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  subFilterTabActive: { backgroundColor: '#EDE9FE', borderColor: '#5B21B6' },
  subFilterText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  subFilterTextActive: { color: '#5B21B6', fontWeight: '600' },
  listWrapper: { ...(Platform.OS === 'web' ? { flex: 0, minHeight: 0, } : { flex: 1, minHeight: 300 }) },
  listContainer: { paddingHorizontal: 24, paddingBottom: 20 },
  bookingCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardContent: { flex: 1, paddingRight: 12 },
  hallName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  eventType: { fontSize: 13, color: '#6B7280', fontWeight: '500', marginBottom: 6 }, 
  detailText: { fontSize: 13, color: '#6B7280', marginBottom: 3 }, 
  emptyContainer: { alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? { marginTop: 20, paddingBottom: 20,} : { marginTop: 40, paddingBottom: 40, }) },  emptyText: { fontSize: 16, color: '#9CA3AF', marginTop: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  horizontalFix: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', height: 'auto' },
  flatListFix: { ...(Platform.OS === 'web' ? { flex: 0, flexGrow: 0, flexShrink: 0, flexBasis: 'auto', height: 'auto', } : {}) },
});