// app/(customerapp)/home.tsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList, Alert, BackHandler, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomerBottomNav from '../../components/customer-bottom-nav';
import * as Location from 'expo-location';
import { webContainerStyle } from '../../constants/webstyles';
import { getAvailableHallsForCustomers } from '../../backend/services/hallServices';

type MediaItem = {
  id?: string;
  uri: string;
  type: 'image' | 'video';
};

type Hall = {
  id: string;
  name: string;
  location: string;
  area: string;
  facilities: string[];
  latitude: number;
  longitude: number;
  mediaFiles: MediaItem[];
};

// const allHalls: Hall[] = [
//   {
//     id: '1',
//     name: 'Imperial Hall',
//     location: 'Wapda Town, Lahore',
//     area: 'Wapda Town',
//     facilities: ['Generator', 'Parking', 'AC', 'Sound System', 'WiFi'],
//     latitude: 31.4833,
//     longitude: 74.3333,
//   },
//   {
//     id: '2',
//     name: 'Grand Regency Hall',
//     location: 'Wapda Town, Lahore',
//     area: 'Wapda Town',
//     facilities: ['Generator', 'Stage', 'Projector', 'Special Lights'],
//     latitude: 31.4850,
//     longitude: 74.3350,
//   },
//   {
//     id: '3',
//     name: 'Royal Event Marquee',
//     location: 'Model Town, Lahore',
//     area: 'Model Town',
//     facilities: ['Parking', 'AC', 'Sound System', 'Air Ventilation', 'Special Lights'],
//     latitude: 31.5000,
//     longitude: 74.3200,
//   },
//   {
//     id: '4',
//     name: 'Pearl Continental Hall',
//     location: 'Gulberg, Lahore',
//     area: 'Gulberg',
//     facilities: ['Generator', 'Parking', 'AC', 'WiFi', 'Stage'],
//     latitude: 31.5200,
//     longitude: 74.3500,
//   },
//   {
//     id: '5',
//     name: 'Skyline Banquet',
//     location: 'Sheikhupura Road, Lahore',
//     area: 'Sheikhupura Road',
//     facilities: ['Parking', 'AC', 'Sound System', 'Special Lights', 'Projector'],
//     latitude: 31.7167,
//     longitude: 74.0000,
//   },
// ];

const filters = [
  { id: 'all', name: 'All Halls' },
  { id: '1', name: 'Parking Available' },    
  { id: '2', name: 'AC / Cooling' },         
  { id: '3', name: 'Air Ventilation' },      
  { id: '4', name: 'Sound System' },        
  { id: '5', name: 'Washroom' },             
  { id: '6', name: 'Generator' },            
  { id: '7', name: 'Special Lights' },       
  { id: '8', name: 'Projector' },            
  { id: '9', name: 'Sofas' },                
  { id: '10', name: 'Wifi' }, 
];

export default function HomeScreen() {
  const [allHalls, setAllHalls] = useState<Hall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchHalls = async () => {
      setIsLoading(true);
      try {
        const data = await getAvailableHallsForCustomers();
        const formattedHalls: Hall[] = data.map((h: any) => {
          const addressParts = h.address ? h.address.split(',') : [];
          const area = addressParts.length > 1 ? addressParts[addressParts.length - 1].trim() : 'Unknown';

          return {
            id: h.id,
            name: h.hallName,
            location: h.address,
            area: area,
            facilities: h.facilities || [],
            latitude: h.location?.latitude || 0,
            longitude: h.location?.longitude || 0,
            mediaFiles: h.mediaFiles || [],
          };
        });
        
        setAllHalls(formattedHalls);
      } catch (error) {
        console.error("Error fetching halls:", error);
        Alert.alert('Error', 'Failed to load halls. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHalls();
  }, []);

  const handleSearchPress = async () => {
    setIsSearching(true);
    
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let permissionStatus = existingStatus;      
      if (existingStatus !== 'granted') {
        const { status: requestStatus } = await Location.requestForegroundPermissionsAsync();
        permissionStatus = requestStatus;
      }
      if (permissionStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please allow location access to find nearby halls.',
          [{ text: 'OK', onPress: () => setIsSearching(false) }]
        );
        return;
      }

    const hasServicesEnabled = await Location.hasServicesEnabledAsync();      
      if (!hasServicesEnabled) {
        Alert.alert(
          'Location Services Off',
          'Please turn on location services in your device to find nearby halls.',
          [{ text: 'OK', onPress: () => setIsSearching(false) }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      Alert.alert(
        'Location Found',
        `Showing halls within 15km radius\nFound ${filteredHalls.length} halls nearby`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(
        'Error',
        'Unable to fetch your location. Please try again.',
        [{ text: 'OK', onPress: () => setIsSearching(false) }]
      );
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFilter = (filterId: string) => {
    if (filterId === 'all') {
      setSelectedFilters([]);
      return;
    }

    if (selectedFilters.includes(filterId)) {
      setSelectedFilters(selectedFilters.filter(id => id !== filterId));
    } else {
      setSelectedFilters([...selectedFilters, filterId]);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const filteredHalls = useMemo(() => {
    let halls = allHalls;
    if (userLocation) {
      halls = halls.filter(hall => {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          hall.latitude,
          hall.longitude
        );
        return distance <= 15; 
      });
    }
    if (selectedFilters.length > 0) {
      const selectedFilterNames = filters
        .filter(f => selectedFilters.includes(f.id))
        .map(f => f.name);
      
      halls = halls.filter(hall => 
        selectedFilterNames.every(filterName => 
          hall.facilities.includes(filterName)
        )
      );
    }
    return halls;
  }, [allHalls, userLocation, selectedFilters]);

   if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading halls...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
      <View style={styles.mainContainer}>
        <ScrollView 
          style={styles.container} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}>
          
          <TouchableOpacity 
            style={styles.searchContainer}
            onPress={handleSearchPress}
            disabled={isSearching}>
            <Ionicons 
              name={isSearching ? "hourglass" : "search"} 
              size={20} 
              color="#9CA3AF" />
            <Text style={styles.searchText}>
              {userLocation 
                ? `Halls within 15km • ${filteredHalls.length} found`
                : "Search nearby halls"}
            </Text>
            {userLocation && (
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  setUserLocation(null); 
                  setSelectedFilters([]);  
                }}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          <View style={styles.filtersContainer}>
            <FlatList
              data={filters}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    (item.id === 'all' && selectedFilters.length === 0 || 
                     selectedFilters.includes(item.id)) && styles.filterChipActive
                  ]}
                  onPress={() => toggleFilter(item.id)} >
                  <Text
                    style={[
                      styles.filterText,
                      (item.id === 'all' && selectedFilters.length === 0 || 
                       selectedFilters.includes(item.id)) && styles.filterTextActive
                    ]} >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.filtersList} />
          </View>

          {filteredHalls.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={50} color="#D1D5DB" />
              <Text style={styles.noResultsText}>No halls found</Text>
              <Text style={styles.noResultsSubtext}>
                {userLocation 
                  ? "Try expanding your search radius"
                  : "Tap search to find nearby halls"}
              </Text>
            </View>
          ) : (
            <View style={styles.hallsList}>
              {filteredHalls.map((hall) => (
                <TouchableOpacity 
                  key={hall.id} 
                  style={styles.hallCard}
                  onPress={() => router.push(`/(customerapp)/hall-details?id=${hall.id}` as any)}
                  activeOpacity={0.7} >
                  {/* <View style={styles.hallImageContainer}>
                    <Ionicons name="image-outline" size={30} color="#C4B5FD" />
                  </View> */}
                  <View style={styles.hallImageContainer}>
                    {(() => {
                      const imageFile = hall.mediaFiles?.find(m => m.type === 'image');
                      const imageUrl = imageFile?.uri;
                      
                      if (imageUrl) {
                        return (
                          <Image 
                            source={{ uri: imageUrl }} 
                            style={styles.hallImage} 
                            resizeMode="cover" 
                          />
                        );
                      }
                      return <Ionicons name="image-outline" size={30} color="#C4B5FD" />;
                    })()}
                  </View>
                  <View style={styles.hallInfo}>
                    <Text style={styles.hallName}>{hall.name}</Text>
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={14} color="#6B7280" />
                      <Text style={styles.locationText}>{hall.location}</Text>
                    </View>
                    {userLocation && (
                      <View style={styles.distanceRow}>
                        <Ionicons name="navigate-outline" size={12} color="#5B21B6" />
                        <Text style={styles.distanceText}>
                          {calculateDistance(
                            userLocation.latitude,
                            userLocation.longitude,
                            hall.latitude,
                            hall.longitude
                          ).toFixed(1)} km away
                        </Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
        <CustomerBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  mainContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 15, height: 45, backgroundColor: '#F9FAFB', marginBottom: 16, gap: 10 },
  searchText: { flex: 1, fontSize: 14, color: '#6B7280' },
  filtersContainer: { marginBottom: 16 },
  filtersList: { gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', marginRight: 8 },
  filterChipActive: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
  filterText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF' },
  hallsList: { marginBottom: 24 },
  hallCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  hallImageContainer: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#E9D5FF' },
  hallImage: { width: '100%', height: '100%' }, 
  hallInfo: { flex: 1, marginLeft: 14 },
  hallName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: '#6B7280' },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  distanceText: { fontSize: 11, color: '#5B21B6', fontWeight: '500' },
  noResultsContainer: { alignItems: 'center', paddingVertical: 60 },
  noResultsText: { fontSize: 16, fontWeight: '600', color: '#111827', marginTop: 12 },
  noResultsSubtext: { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
});