// app/(adminapp)/hall-details.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Linking, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { webContainerStyle } from '@/constants/webstyles';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';
import { updateHallStatus } from '../../backend/services/hallServices';

// const dummyHall = {
//   id: 'h1',
//   name: 'Imperial Grand Hall',
//   address: 'Street 5, Wapda Town, Lahore',
//   location: { latitude: 31.5204, longitude: 74.3587, address: 'Street 5, Wapda Town, Lahore' },
//   contactPhone: '0300-1234567',
//   capacity: '500',
//   price: '150,000',
//   tables: '75',
//   chairs: '600',
//   hallType: 'Indoor',
//   otherInfo: 'Ideal for grand weddings. Backup generator available 24/7.',
//   facilities: ['Parking Available', 'AC / Cooling / Heating', 'Sound System', 'Washroom', 'Generator', 'Wifi'],
//   mediaFiles: [
//     { uri: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800', type: 'image' },
//     { uri: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800', type: 'image' },
//     { uri: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800', type: 'image' }
//   ],
//   verificationDoc: { uri: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb130?w=800', name: 'Ownership_Deed.pdf', type: 'application/pdf' },
//   status: 'Pending',
//   manager: {
//     id: 'm1', name: 'Ali Raza', email: 'ali.raza@example.com', phone: '0300-1234567',
//     address: 'House 123, Wapda Town, Lahore', status: 'Active', role: 'Managers',
//     docName: 'CNIC_Front.jpg', docUri: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb130?w=800', halls: ['Imperial Grand Hall']
//   }
// };

const allFacilitiesList = [
  'Parking Available', 'AC / Cooling / Heating', 'Sound System', 'Washroom', 
  'Generator', 'Wifi', 'Projector', 'Sofas', 'Special Lights', 'Catering'
];

export default function HallDetailScreen() {
  const params = useLocalSearchParams();
  const hideManagerProfile = params.hideManager === 'true';
  const [hall, setHall] = useState<any>(null);
  const hallId = params.hallId as string;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHall = async () => {
      if (!hallId) return;
      setIsLoading(true);
      try {
        const docRef = doc(db, 'halls', hallId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setHall({
            id: docSnap.id,
            ...data,
            uiStatus: data.status === 'pending_approval' ? 'Pending' :
                      data.status === 'approved' ? 'Approved' :
                      data.status === 'rejected' ? 'Disapproved' : 'Removed'
          });
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

  if (isLoading || !hall) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading hall details...</Text>
        </View>
      </SafeAreaView>
    );
  }
  // useEffect(() => {
  //   if (params.hallData && params.hallData !== 'null') {
  //     try {
  //       const parsed = JSON.parse(params.hallData as string);
  //       setHall({ ...dummyHall, ...parsed });
  //     } catch (e) {
  //       console.error("Error parsing hall data", e);
  //     }
  //   }
  // }, [params.hallData]);

  const getStatusColor = (status: string) => {
    if (status === 'Approved') return '#10B981';
    if (status === 'Disapproved' || status === 'Rejected') return '#EF4444';
    if (status === 'Removed') return '#6B7280';
    return '#F59E0B';
  };

  const openMediaViewer = (index: number = 0) => {
    if (hall.mediaFiles && hall.mediaFiles.length > 0) {
      router.push({
        pathname: '/(adminapp)/media-viewer' as any,
        params: { mediaFiles: JSON.stringify(hall.mediaFiles), index: index.toString() }
      });
    }
  };

  const handleViewAllMedia = () => {
    router.push({
      pathname: '/(customerapp)/media-gallery' as any,
      params: { 
        hallName: hall.name,
        mediaFiles: JSON.stringify(hall.mediaFiles)
      }
    });
  };

  const handleViewDocument = async () => {
    const docUrl = hall?.verificationDoc || hall?.docUri;
    if (!docUrl) {
      Alert.alert('Info', 'No verification document uploaded for this user.');
      return;
    }
    try {
      const isPdf = docUrl.toLowerCase().includes('.pdf');
      const urlToOpen = isPdf 
        ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(docUrl)}`
        : docUrl;

      await Linking.openURL(urlToOpen);
    } catch (error) {
      Alert.alert('Error', 'Failed to open the document. Please check your internet connection.');
    }
  };

  const openManagerDetails = () => {
  if (!hall.managerId) {
    Alert.alert('Error', 'Manager information not available for this hall.');
    return;
  }
  
  router.push({
    pathname: '/(adminapp)/account-details' as any,
    params: { 
      userData: JSON.stringify({
        id: hall.managerId,
        name: hall.managerName || 'Unknown Manager',
        role: 'Managers',
        status: 'Active',
        email: hall.managerEmail || 'N/A',
        phone: hall.contactPhone || 'N/A',
        address: hall.address || 'N/A',
        docName: 'N/A',
        docUri: '',
        halls: [hall.hallName || hall.name]
      }) 
    }
  });
};

  const openMap = () => {
    const addressToSearch = hall.address || (typeof hall.location === 'object' ? hall.location.address : '');
    if (!addressToSearch) return;
    
    if (typeof hall.location === 'object' && hall.location.latitude) {
      const { latitude, longitude } = hall.location;
      const url = Platform.select({
        ios: `maps:0,0?q=${latitude},${longitude}`,
        android: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, 
      });
      if (url) Linking.openURL(url);
    } else {
      const encodedAddress = encodeURIComponent(addressToSearch);
      const url = Platform.select({
        ios: `maps:0,0?q=${encodedAddress}`,
        android: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
      });
      if (url) Linking.openURL(url);
    }
  };

  const makeCall = () => {
    if (hall.contactPhone) Linking.openURL(`tel:${hall.contactPhone.replace(/\s/g, '')}`);
  };
 const handleStatusUpdate = async (newStatus: 'approved' | 'rejected' | 'deleted', successMsg: string) => {
    try {
      await updateHallStatus(hallId, newStatus);  
      if (newStatus === 'approved' || newStatus === 'rejected') {
        const statusText = newStatus === 'approved' ? 'Approved' : 'Rejected';
        
        await addDoc(collection(db, 'notifications'), {
          type: 'Halls',
          sender: 'Admin',
          senderId: 'admin_system',
          targetUserId: hall.managerId,       
          targetRole: 'manager',              
          hallId: hallId,                     
          message: `Your hall "${hall.hallName || hall.name}" has been ${statusText} by the admin.`,
          timestamp: serverTimestamp(),
          status: 'unread',
          action: 'hall-details'              
        });
      }    
      Alert.alert('Success', successMsg, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error("Error updating hall:", error);
      Alert.alert('Error', 'Failed to update hall status.');
    }
  };

  const handleApprove = () => {
    Alert.alert('Approve Hall', `Approve "${hall.hallName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => handleStatusUpdate('approved', "Hall approved successfully.") }
    ]);
  };

  const handleReject = () => {
    Alert.alert('Disapprove Hall', `Disapprove "${hall.hallName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disapprove', style: 'destructive', onPress: () => { Alert.alert('Rejected', 'Hall disapproved.'); router.back(); } }
    ]);
  };

  // const handleRemove = () => {
  //   Alert.alert('Remove Hall', `Permanently remove "${hall.hallName}"?`, [
  //     { text: 'Cancel', style: 'cancel' },
  //     { text: 'Remove', style: 'destructive', onPress: () => { Alert.alert('Removed', 'Hall removed.'); router.back(); } }
  //   ]);
  // };

  if (!hall) return null;

  const managerName = typeof hall.manager === 'object' ? hall.manager.name : hall.manager;

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hall Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
       
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hallName}>{hall.hallName || hall.name || 'Unknown Hall'}</Text> 
             <View style={styles.tagsRow}>
              <View style={styles.typeTag}>
                <Ionicons name={hall.hallType === 'Indoor' ? 'home-outline' : 'leaf-outline'} size={14} color="#5B21B6" />
                <Text style={styles.typeText}>{hall.hallType || 'N/A'}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(hall.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(hall.status) }]}>{hall.status}</Text>
              </View>
            </View>
          </View>
          {!hideManagerProfile && (
          <TouchableOpacity style={styles.managerIconBtn} onPress={openManagerDetails} activeOpacity={0.7}>
            <Ionicons name="person-circle-outline" size={42} color="#5B21B6" />
            <Text style={styles.managerNameText}>{managerName}</Text>
          </TouchableOpacity>
           )}
        </View>
       
        <View style={styles.divider} />

        <View style={styles.infoList}>
          <TouchableOpacity style={styles.cleanRow} onPress={openMap}>
            <Ionicons name="location" size={22} color="#5B21B6" />
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowLabel}>Address & Location</Text>
              <Text style={styles.rowValue}>{hall.address || 'N/A'}</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#5B21B6" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.cleanRow} onPress={makeCall}>
            <Ionicons name="call" size={22} color="#5B21B6" />
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowLabel}>Contact Number</Text>
              <Text style={[styles.rowValue, { color: '#5B21B6' }]}>{hall.contactPhone || 'N/A'}</Text>
            </View>
            <Ionicons name="call-outline" size={18} color="#5B21B6" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.cleanRow} onPress={handleViewDocument} activeOpacity={0.7}>
            <Ionicons name="document-text" size={22} color="#5B21B6" />
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowLabel}>Verification Document</Text>
              <Text style={styles.rowValue}>{hall.verificationDoc?.name || 'Not Uploaded'}</Text>
            </View>
            <Ionicons name="eye-outline" size={18} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.cleanRow}>
            <Ionicons name="cash" size={22} color="#5B21B6" />
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowLabel}>Starting Price</Text>
              <Text style={styles.rowValue}>PKR {hall.price || '0'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hall Specifications</Text>
          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Ionicons name="people-outline" size={22} color="#5B21B6" />
              <Text style={styles.specValue}>{hall.capacity || '0'}</Text>
              <Text style={styles.specLabel}>Capacity</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="grid-outline" size={22} color="#5B21B6" />
              <Text style={styles.specValue}>{hall.tables || '0'}</Text>
              <Text style={styles.specLabel}>Tables</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="cube-outline" size={22} color="#5B21B6" />
              <Text style={styles.specValue}>{hall.chairs || '0'}</Text>
              <Text style={styles.specLabel}>Chairs</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {hall.mediaFiles && hall.mediaFiles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Hall Media</Text>
              <TouchableOpacity onPress={handleViewAllMedia}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
              {hall.mediaFiles.map((media: any, idx: number) => (
                <TouchableOpacity key={idx} onPress={() => openMediaViewer(idx)} style={styles.mediaItem}>
                  <Image source={{ uri: media.uri }} style={styles.mediaImage} />
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
              const isAvailable = hall.facilities.includes(facility);
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

        {hall.otherInfo ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            <Text style={styles.otherInfoText}>{hall.otherInfo}</Text>
          </View>
        ) : null}

        <View style={styles.actionButtonsContainer}>
          {hall.uiStatus === 'Pending' ? (
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
                <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={handleApprove}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.approveText}>Approve</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionBar}>
              <Text style={{ fontSize: 14, color: '#6B7280', fontWeight: '600', textAlign: 'center', flex: 1 }}>
                This hall has already been {hall.uiStatus.toLowerCase()}.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },  
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 10, paddingBottom: 12, gap: 16 },
  hallName: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8 },
  tagsRow: { flexDirection: 'row', gap: 8 },
  typeTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  typeText: { fontSize: 12, fontWeight: '600', color: '#5B21B6' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  managerIconBtn: { alignItems: 'center', justifyContent: 'center' },
  managerNameText: { fontSize: 12, color: '#5B21B6', fontWeight: '600', marginTop: 4 },  
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
  actionButtonsContainer: { marginTop: 24, marginBottom: 20 }, 
  actionBar: { flexDirection: 'row', gap: 12 },
  rejectBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', gap: 6 },
  rejectText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  approveBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#10B981', gap: 6 },
  approveText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  removeBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', gap: 6 },
  removeText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});