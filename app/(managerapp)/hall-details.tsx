// app/(managerapp)/hall-details.tsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Linking, Alert, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '../../constants/webstyles';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function ManagerHallDetails() {
  const params = useLocalSearchParams();
  const hallId = params.id as string;
  const [hallData, setHallData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false); 

  useEffect(() => {
    const fetchHall = async () => {
      if (!hallId) return;
      setIsLoading(true);
      try {
        const docRef = doc(db, 'halls', hallId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setHallData({ id: docSnap.id, ...docSnap.data() });
        } else {
          Alert.alert('Error', 'Hall not found.');
          router.back();
        }
      } catch (error) {
        console.error("Error fetching hall:", error);
        Alert.alert('Error', 'Failed to load hall details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchHall();
  }, [hallId]);

  if (isLoading || !hallData) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading hall details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === 'approved') return '#10B981';
    if (status === 'rejected') return '#EF4444';
    return '#F59E0B'; 
  };

  const getStatusText = (status: string) => {
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    return 'Pending';
  };

  const handleOpenLocation = () => {
    if (hallData.location && hallData.location.latitude) {
      const { latitude, longitude } = hallData.location;
      const url = Platform.select({
        ios: `maps:0,0?q=${latitude},${longitude}`,
        android: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      });
      if (url) Linking.openURL(url);
    }
  };

  const handleViewDocument = async () => {
    const docUrl = hallData?.verificationDoc?.uri || hallData?.verificationDoc || hallData?.docUri;
    
    if (!docUrl) {
      Alert.alert('Info', 'No verification document uploaded for this hall.');
      return;
    }
    try {
      const isPdf = docUrl.toLowerCase().includes('.pdf') || docUrl.includes('/raw/');
      const urlToOpen = isPdf 
        ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(docUrl)}`
        : docUrl;

      await Linking.openURL(urlToOpen);
    } catch (error) {
      console.error('Document open error:', error);
      Alert.alert('Error', 'Failed to open the document. Please check your internet connection.');
    }
  };

  const handleViewAllPhotos = () => {
    router.push({
      pathname: '/(managerapp)/media-gallery' as any,
      params: { 
        hallName: hallData.hallName,
        mediaFiles: JSON.stringify(hallData.mediaFiles || [])
      }
    });
  };

  const openMediaViewer = (index: number = 0) => {
    if (hallData.mediaFiles && hallData.mediaFiles.length > 0) {
      router.push({
        pathname: '/(managerapp)/media-viewer' as any,
        params: { mediaFiles: JSON.stringify(hallData.mediaFiles), index: index.toString() }
      });
    }
  };

  const handleUpdateHall = () => {
    setShowMenu(false); // Menu band karein
    router.push({ pathname: '/(managerapp)/update-hall-details' as any, params: { hallId: hallData.id } });
  };

  const handleDeleteHall = () => {
    setShowMenu(false); // Menu band karein
    Alert.alert('Delete Hall', `Are you sure you want to delete "${hallData.hallName}"? This action cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            const { deleteHall } = await import('../../backend/services/hallServices');
            await deleteHall(hallData.id);
            Alert.alert('Success', 'Hall has been deleted successfully', [
              { text: 'OK', onPress: () => router.replace('/(managerapp)/home') }
            ]);
          } catch (error) {
            Alert.alert('Error', 'Failed to delete hall.');
          }
        }
      }
    ]);
  };

  const allFacilitiesList = [
    'Parking Available', 'AC / Cooling', 'Air Ventilation', 'Sound System', 'Washroom', 
    'Generator', 'Special Lights', 'Projector', 'Sofas', 'Wifi'
  ];

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hall Details</Text>
        
        <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
       
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hallName}>{hallData.hallName}</Text>
            <View style={styles.tagsRow}>
              <View style={styles.typeTag}>
                <Ionicons name={hallData.hallType === 'Indoor' ? 'home-outline' : 'leaf-outline'} size={14} color="#5B21B6" />
                <Text style={styles.typeText}>{hallData.hallType || 'N/A'}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(hallData.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(hallData.status) }]}>{getStatusText(hallData.status)}</Text>
              </View>
            </View>
          </View>
        </View>
       
        <View style={styles.divider} />

        <View style={styles.infoList}>
          <TouchableOpacity style={styles.cleanRow} onPress={handleOpenLocation}>
            <Ionicons name="location" size={22} color="#5B21B6" />
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowLabel}>Address & Location</Text>
              <Text style={styles.rowValue}>{hallData.address || 'N/A'}</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#5B21B6" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.cleanRow}>
            <Ionicons name="call" size={22} color="#5B21B6" />
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowLabel}>Contact Number</Text>
              <Text style={styles.rowValue}>{hallData.contactPhone || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.cleanRow} onPress={handleViewDocument} activeOpacity={0.7}>
            <Ionicons name="document-text" size={22} color="#5B21B6" />
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowLabel}>Verification Document</Text>
                <Text style={styles.rowValue}>
                  {hallData.verificationDoc?.name || 
                  (hallData.verificationDoc?.uri ? 'View Document' : 'Not Uploaded')}</Text>            
              </View>
            <Ionicons name="eye-outline" size={18} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.cleanRow}>
            <Ionicons name="cash" size={22} color="#5B21B6" />
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowLabel}>Starting Price</Text>
              <Text style={styles.rowValue}>PKR {hallData.price || '0'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hall Specifications</Text>
          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Ionicons name="people-outline" size={22} color="#5B21B6" />
              <Text style={styles.specValue}>{hallData.capacity || '0'}</Text>
              <Text style={styles.specLabel}>Capacity</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="grid-outline" size={22} color="#5B21B6" />
              <Text style={styles.specValue}>{hallData.tables || '0'}</Text>
              <Text style={styles.specLabel}>Tables</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="cube-outline" size={22} color="#5B21B6" />
              <Text style={styles.specValue}>{hallData.chairs || '0'}</Text>
              <Text style={styles.specLabel}>Chairs</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {hallData.mediaFiles && hallData.mediaFiles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Hall Media</Text>
              <TouchableOpacity onPress={handleViewAllPhotos}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
              {hallData.mediaFiles.map((media: any, idx: number) => (
                <TouchableOpacity key={idx} onPress={() => openMediaViewer(idx)} style={styles.mediaItem}>
                  {media.type === 'image' ? (
                    <Image source={{ uri: media.uri }} style={styles.mediaImage} />
                  ) : (
                    <View style={[styles.mediaImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }]}>
                      <Ionicons name="videocam" size={30} color="#6B7280" />
                    </View>
                  )}
                  {media.type === 'video' && (
                    <View style={styles.playIconOverlay}>
                      <Ionicons name="play" size={24} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Facilities</Text>
          <View style={styles.facilitiesList}>
            {allFacilitiesList.map((facility, idx) => {
              const isAvailable = hallData.facilities?.includes(facility);
              return (
                <View key={idx} style={styles.facilityRow}>
                  <Ionicons 
                    name={isAvailable ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    color={isAvailable ? "#10B981" : "#D1D5DB"} 
                  />
                  <Text style={[styles.facilityText, isAvailable ? styles.facilityTextAvailable : styles.facilityTextNormal]}>
                    {facility}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {hallData.otherInfo ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            <Text style={styles.otherInfoText}>{hallData.otherInfo}</Text>
          </View>
        ) : null}

        <View style={{ height: 20 }} />
      </ScrollView>

      {showMenu && (
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)} 
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleUpdateHall}>
              <Ionicons name="create-outline" size={18} color="#111827" />
              <Text style={styles.menuItemText}>Update Details</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteHall}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={styles.menuItemTextDestructive}>Delete Hall</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  menuBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }, 
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },  
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 10, paddingBottom: 8 },
  hallName: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8 },
  tagsRow: { flexDirection: 'row', gap: 8 },
  typeTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  typeText: { fontSize: 12, fontWeight: '600', color: '#5B21B6' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 }, 
  infoList: { paddingVertical: 4 }, 
  cleanRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 16 }, 
  rowTextContainer: { flex: 1 },
  rowLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 2 },
  rowValue: { fontSize: 15, color: '#111827', fontWeight: '600' },    
  section: { paddingVertical: 4 }, 
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 }, 
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  viewAllText: { fontSize: 14, fontWeight: '600', color: '#5B21B6' },    
  specsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  specItem: { flex: 1, alignItems: 'center', gap: 6 },
  specValue: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 4 },
  specLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },    
  mediaScroll: { marginTop: 8 },
  mediaItem: { width: 140, height: 100, borderRadius: 12, overflow: 'hidden', marginRight: 12, backgroundColor: '#F3F4F6' },
  mediaImage: { width: '100%', height: '100%' },
  playIconOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },    
  facilitiesList: { gap: 10 }, 
  facilityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  facilityText: { fontSize: 14, fontWeight: '500' }, 
  facilityTextAvailable: { fontSize: 14, fontWeight: '600', color: '#065F46' },
  facilityTextNormal: { fontSize: 14, fontWeight: '500', color: '#6B7280' },  
  otherInfoText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },  
  menuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 },
  menuContainer: { position: 'absolute', top: 60, right: 20, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 8, width: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8, zIndex: 100 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  menuItemText: { fontSize: 14, color: '#111827', fontWeight: '500' },
  menuItemTextDestructive: { fontSize: 14, color: '#EF4444', fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
});