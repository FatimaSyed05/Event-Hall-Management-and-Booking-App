// app/(adminapp)/halls.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { webContainerStyle } from '@/constants/webstyles';
import { getHallsForAdmin } from '../../backend/services/hallServices';

export default function HallsScreen() {
  const { hallId } = useLocalSearchParams();
  const [activeFilter, setActiveFilter] = useState('All');
  const [hallsData, setHallsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHalls = async () => {
    setIsLoading(true);
    try {
      const data = await getHallsForAdmin(activeFilter);
      const formattedData = data.map((hall: any) => ({
        id: hall.id,
        ...hall,
        uiStatus: hall.status === 'pending_approval' ? 'Pending' :
                  hall.status === 'approved' ? 'Approved' :
                  hall.status === 'rejected' ? 'Rejected' : 'Removed'
      }));
      setHallsData(formattedData);
    } catch (error) {
      console.error("Error fetching halls:", error);
      Alert.alert('Error', 'Failed to load halls data.');
    } finally {
      setIsLoading(false); 
    }
  };

  useEffect(() => {
    fetchHalls();
  }, [activeFilter]);

  useEffect(() => {
    if (hallId && !isLoading && hallsData.length > 0) {
      const targetId = Array.isArray(hallId) ? hallId[0] : String(hallId);
      const targetHall = hallsData.find(h => h.id === targetId);
      
      if (targetHall) {
        const timer = setTimeout(() => {
          router.push({
            pathname: '/(adminapp)/hall-details' as any,
            params: { hallId: targetHall.id }
          });
        }, 600);
        return () => clearTimeout(timer); 
      }
    }
  }, [hallId, isLoading, hallsData]);

  const filteredHalls = activeFilter === 'All' 
    ? hallsData 
    : hallsData.filter(h => h.uiStatus === activeFilter);   
  const filters = ['All', 'Pending', 'Approved', 'Rejected', 'Removed'];
  const handleHallPress = (id: string) => {
    router.push({
      pathname: '/(adminapp)/hall-details' as any,
      params: { hallId: id }
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Halls</Text>
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
            <Text style={styles.loadingText}>Loading halls...</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredHalls.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="business-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No halls found in this category.</Text>
              </View>
            ) : (
              filteredHalls.map((hall: any) => (
                <TouchableOpacity
                  key={hall.id}
                  style={styles.listItem}
                  onPress={() => handleHallPress(hall.id)} 
                  activeOpacity={0.7}
                >
                  <Image 
                    source={{ uri: hall.mediaFiles?.[0]?.uri || 'https://via.placeholder.com/64' }} 
                    style={styles.hallAvatar} 
                  />
                  <View style={styles.hallInfo}>
                    <Text style={styles.hallName}>{hall.hallName || 'Unknown Hall'}</Text>
                    <Text style={styles.managerName}>Manager: {hall.managerName || 'Unknown'}</Text>
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                      <Text style={styles.locationText}>
                        {typeof hall.address === 'string' ? hall.address : (hall.location?.address || 'N/A')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.rightContainer}>
                    {hall.uiStatus === 'Pending' && <View style={styles.newDot} />}
                    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
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
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  hallAvatar: { width: 64, height: 64, borderRadius: 12, marginRight: 16, backgroundColor: '#E5E7EB' },
  hallInfo: { flex: 1 },
  hallName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  managerName: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: '#9CA3AF' },
  rightContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 12 },
  loadingContainer: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
});