import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, FlatList, Image, Modal, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useMemo } from 'react';
import BottomNav from '../../components/manager-bottom-nav';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '@/constants/webstyles';
import { useAuth } from '../../backend/context/AuthContext';
import { getHallsByManager } from '../../backend/services/hallServices';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

type MediaItem = {
  id: string;
  uri: string;
  type: 'image' | 'video';
};

type Hall = {
  id: string;
  name: string;
  location: string;
  area: string;
  status: 'Approved' | 'Pending' | 'Rejected'; 
  mediaFiles: MediaItem[];
};

export default function ManagerHome() {
  const { userData } = useAuth();
  const [myHalls, setMyHalls] = useState<Hall[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userData?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('targetUserId', '==', userData.uid),
      where('targetRole', '==', 'manager'),
      where('status', '==', 'unread')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [userData?.uid]);

  useEffect(() => {
    const fetchHalls = async () => {
      if (!userData?.uid) return;
      setIsLoading(true);
      try {
        const halls = await getHallsByManager(userData.uid);
          const formattedHalls: Hall[] = halls.map((h: any) => {
          const addressParts = h.address ? h.address.split(',') : [];
          let locationName = 'Other';
          if (addressParts.length > 1) {
            locationName = addressParts[addressParts.length - 1].trim();
          }
          //  else if (h.address && h.address.trim().length > 0 && h.address.trim().length < 30) {
          //   locationName = h.address.trim();
          // }

          let status: 'Approved' | 'Pending' | 'Rejected' = 'Pending';
          if (h.status === 'approved') status = 'Approved';
          else if (h.status === 'rejected') status = 'Rejected';

          return {
            id: h.id,
            name: h.hallName,
            location: h.address || 'Address not provided',
            area: locationName, 
            status: status,
            mediaFiles: h.mediaFiles || []
          };
        });
        setMyHalls(formattedHalls);
      } catch (error) {
        console.error("Error fetching halls:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHalls();
  }, [userData?.uid]);

  const areas = useMemo(() => {
    const uniqueAreas = [...new Set(myHalls.map(hall => hall.area))];
    return ['all', ...uniqueAreas]; 
  }, [myHalls]);

  const filteredHalls = useMemo(() => {
    return myHalls.filter(hall => {
      const matchesSearch = hall.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesArea = selectedArea === 'all' || hall.area === selectedArea;
      const matchesStatus = selectedStatus === 'all' || hall.status === selectedStatus;
      
      return matchesSearch && matchesArea && matchesStatus;
    });
  }, [myHalls, searchQuery, selectedArea, selectedStatus]);

const displayHalls = filteredHalls; 
  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.mainContainer}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Home</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity 
                style={styles.notificationIconContainer}
                onPress={() => router.push('/(managerapp)/notifications')}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="notifications-outline" size={28} color="#111827" />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              {/* <TouchableOpacity onPress={() => router.push('/(managerapp)/notifications')}>
                <Ionicons name="notifications-outline" size={28} color="#111827" />
              </TouchableOpacity> */}
              <TouchableOpacity onPress={() => router.push('/(managerapp)/account')}>
                <Ionicons name="person-circle-outline" size={28} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search halls by name"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery} 
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={() => setShowAreaDropdown(true)}
              style={styles.areaDropdownIcon}
            >
              <Ionicons name="chevron-forward" size={20} color="#5B21B6" />
            </TouchableOpacity>
          </View>

          <View style={styles.statusFiltersContainer}>
            {['all', 'Pending', 'Approved', 'Rejected'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusFilterChip,
                  selectedStatus === status && styles.statusFilterChipActive
                ]}
                onPress={() => setSelectedStatus(status as any)}
              >
                <Text style={[
                  styles.statusFilterText,
                  selectedStatus === status && styles.statusFilterTextActive
                ]}>
                  {status === 'all' ? 'All Halls' : status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {showAreaDropdown && (
            <Modal
              visible={showAreaDropdown}
              transparent
              animationType="fade"
              onRequestClose={() => setShowAreaDropdown(false)}
            >
              <TouchableOpacity 
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={() => setShowAreaDropdown(false)}
              >
                <View style={styles.dropdownContent}>
                  <Text style={styles.dropdownTitle}>Select Area</Text>
                  <TouchableOpacity
                    style={[styles.dropdownItem, selectedArea === 'all' && styles.dropdownItemActive]}
                    onPress={() => { setSelectedArea('all'); setShowAreaDropdown(false); }}
                  >
                    <Text style={styles.dropdownItemText}>All Areas</Text>
                    {selectedArea === 'all' && <Ionicons name="checkmark" size={20} color="#5B21B6" />}
                  </TouchableOpacity>
                  {areas.filter(a => a !== 'all').map((area) => (
                    <TouchableOpacity
                      key={area}
                      style={[styles.dropdownItem, selectedArea === area && styles.dropdownItemActive]}
                      onPress={() => { setSelectedArea(area); setShowAreaDropdown(false); }}
                    >
                      <Text style={styles.dropdownItemText}>{area}</Text>
                      {selectedArea === area && <Ionicons name="checkmark" size={20} color="#5B21B6" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
          )}

          <View style={styles.seeAllRow}>
            <View style={styles.titleWithCount}>
              <Text style={styles.sectionTitle}>My Halls</Text>
              <Text style={styles.hallsCount}>({filteredHalls.length})</Text>
            </View>
            {/* {filteredHalls.length > 3 && (
              <TouchableOpacity onPress={() => router.push('/(managerapp)/manage-halls' as any)}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            )} */}
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#5B21B6" />
              <Text style={styles.loadingText}>Loading your halls...</Text>
            </View>
            ) : myHalls.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No halls yet</Text>
              <Text style={styles.noResultsSubtext}>Start by adding your first hall to your profile.</Text>
              <TouchableOpacity 
                style={styles.addFirstHallBtn}
                onPress={() => router.push('/(managerapp)/add-hall' as any)} 
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.addFirstHallText}>Add Your First Hall</Text>
              </TouchableOpacity>
            </View>
            ) : filteredHalls.length === 0 ? (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No halls found</Text>
                <Text style={styles.noResultsSubtext}>No halls match your current filters or search.</Text>
              </View>
            ) : (
            <View style={styles.hallsList}>
              {displayHalls.map((hall) => {
                const coverImage = hall.mediaFiles.find(m => m.type === 'image');

                return (
                  <TouchableOpacity 
                    key={hall.id} 
                    style={styles.hallCard}
                    onPress={() => router.push({ pathname: '/(managerapp)/hall-details', params: { id: hall.id } } as any)}
                    activeOpacity={0.7} 
                  >
                    <View style={styles.hallImageContainer}>
                      {coverImage?.uri ? (
                        <Image source={{ uri: coverImage.uri }} style={styles.hallImage} resizeMode="cover" />
                      ) : (
                        <Ionicons name="image-outline" size={30} color="#C4B5FD" />
                      )}
                    </View>
                    <View style={styles.hallInfo}>
                      <Text style={styles.hallName}>{hall.name}</Text>
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color="#6B7280" />
                        <Text style={styles.locationText}>{hall.location}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  mainContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#111827' },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 15, height: 45, backgroundColor: '#F9FAFB', marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 14, color: '#111827' },
  areaDropdownIcon: { padding: 4, marginLeft: 8, borderLeftWidth: 1, borderLeftColor: '#D1D5DB', paddingLeft: 12 },
  statusFiltersContainer: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  statusFilterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF' },
  statusFilterChipActive: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
  statusFilterText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  statusFilterTextActive: { color: '#FFFFFF' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownContent: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, minWidth: 200, maxHeight: 300, width: '80%' },
  dropdownTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4 },
  dropdownItemActive: { backgroundColor: '#F5F3FF' },
  dropdownItemText: { fontSize: 14, color: '#111827' },
  seeAllRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleWithCount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  hallsCount: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  seeAllText: { fontSize: 13, color: '#5B21B6', fontWeight: '500' },
  hallsList: { marginBottom: 24 },
  hallCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  hallImageContainer: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#E9D5FF' },
  hallImage: { width: '100%', height: '100%' },
  hallInfo: { flex: 1, marginLeft: 14 },
  hallName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: '#6B7280' },
  loadingContainer: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
  noResultsContainer: { alignItems: 'center', paddingVertical: 40, marginTop: 20 },
  noResultsText: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  noResultsSubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  addFirstHallBtn: { flexDirection: 'row', backgroundColor: '#5B21B6', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center', gap: 8 },
  addFirstHallText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  notificationIconContainer: { padding: 4 },
  iconContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: -6, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#FFFFFF' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});