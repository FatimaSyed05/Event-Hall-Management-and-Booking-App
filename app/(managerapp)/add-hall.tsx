// app/(managerapp)/add-hall.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Modal, Image, FlatList, Linking, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useCallback} from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { MapComponent, MapComponent as MapView, Marker } from '../../components/MapComponent';
import BottomNav from '../../components/manager-bottom-nav';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '@/constants/webstyles';
import { createHall } from '../../backend/services/hallServices';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';
import { useAuth } from '../../backend/context/AuthContext';
import { uploadMultipleToCloudinary, uploadToCloudinary } from '../../backend/services/cloudinaryServices';
import HallMapModal from '@/components/hallMapModal';

const facilitiesList = [
  { id: '1', name: 'Parking Available' },
  { id: '2', name: 'AC / Cooling / Heating' },
  { id: '3', name: 'Air Ventilation' },
  { id: '4', name: 'Sound System' },
  { id: '5', name: 'Washroom' },
  { id: '6', name: 'Generator' },
  { id: '7', name: 'Special Lights' },
  { id: '8', name: 'Projector' },
  { id: '9', name: 'Sofas' },
  { id: '10', name: 'Wifi' },
];

type MediaItem = {
  uri: string;
  type: 'image' | 'video';
};

type DocumentItem = {
  uri: string;
  name: string;
  type: string;
};

type HallLocation = {
  latitude: number;
  longitude: number;
  address: string;
};

export default function AddHallScreen() {
   const { userData } = useAuth(); 
  const [isUploading, setIsUploading] = useState(false); 
  const [hallName, setHallName] = useState('');

  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [capacity, setCapacity] = useState('');
  const [price, setPrice] = useState('');
  const [tables, setTables] = useState('');
  const [chairs, setChairs] = useState('');
  const [hallType, setHallType] = useState<'Indoor' | 'Outdoor' | ''>('');
  const [otherInfo, setOtherInfo] = useState('');
  const [facilities, setFacilities] = useState<Record<string, boolean>>({});
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([]);
  const [verificationDoc, setVerificationDoc] = useState<DocumentItem | null>(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [hallLocation, setHallLocation] = useState<HallLocation | null>(null);

  const [showMapModal, setShowMapModal] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 31.5204,
    longitude: 74.3587,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [tempMarker, setTempMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef<any>(null);

  const [hallNameError, setHallNameError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [contactPhoneError, setContactPhoneError] = useState('');
  const [capacityError, setCapacityError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [tablesError, setTablesError] = useState('');
  const [chairsError, setChairsError] = useState('');
  const [hallTypeError, setHallTypeError] = useState('');
  const [verificationDocError, setVerificationDocError] = useState('');
  const [locationError, setLocationError] = useState('');

  const [isValidHallName, setIsValidHallName] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [isValidContactPhone, setIsValidContactPhone] = useState(false);
  const [isValidCapacity, setIsValidCapacity] = useState(false);
  const [isValidPrice, setIsValidPrice] = useState(false);
  const [isValidTables, setIsValidTables] = useState(false);
  const [isValidChairs, setIsValidChairs] = useState(false);
  const [isValidVerificationDoc, setIsValidVerificationDoc] = useState(false);
  const [isValidLocation, setIsValidLocation] = useState(false);

  const validateHallName = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) { setHallNameError('Hall name is required'); setIsValidHallName(false); return false; }
    if (trimmedName.length < 5) { setHallNameError('Hall name must be at least 5 characters'); setIsValidHallName(false); return false; }
    if (trimmedName.length > 50) { setHallNameError('Hall name must be less than 50 characters'); setIsValidHallName(false); return false; }
    if (!/^[a-zA-Z0-9\s\-]+$/.test(trimmedName)) { setHallNameError('Hall name can only contain letters, numbers, spaces, and hyphens'); setIsValidHallName(false); return false; }
    if (!/^[a-zA-Z]/.test(trimmedName)) { setHallNameError('Hall name must start with a letter'); setIsValidHallName(false); return false; }
    if (/\s{2,}/.test(trimmedName)) { setHallNameError('Hall name cannot have consecutive spaces'); setIsValidHallName(false); return false; }
    setHallNameError(''); setIsValidHallName(true); return true;
  };

  const validateAddress = (addr: string) => {
    const trimmedAddr = addr.trim();
        if (!trimmedAddr) { 
      setAddressError('Address is required'); 
      setIsValidAddress(false); 
      return false; 
    }
    if (trimmedAddr.length < 10) { 
      setAddressError('Please enter a complete address (e.g., Main Hall Road, Lahore)'); 
      setIsValidAddress(false); 
      return false; 
    }
    if (trimmedAddr.length > 200) { 
      setAddressError('Address is too long (maximum 200 characters)'); 
      setIsValidAddress(false); 
      return false; 
    }
    if (!/[a-zA-Z]/.test(trimmedAddr)) { 
      setAddressError('Address must include area, road, or city name'); 
      setIsValidAddress(false); 
      return false; 
    }
    if (/^[^a-zA-Z0-9]/.test(trimmedAddr)) { 
      setAddressError('Address must start with a letter or number'); 
      setIsValidAddress(false); 
      return false; 
    }
    const words = trimmedAddr.split(/\s+/);
    if (words.length < 2) {
      setAddressError('Please provide a more detailed address (Area and City)');
      setIsValidAddress(false);
      return false;
    }
    setAddressError(''); 
    setIsValidAddress(true); 
    return true;
  };

  const validateContactPhone = (phone: string) => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) { setContactPhoneError('Contact number is required'); setIsValidContactPhone(false); return false; }
    const cleanPhone = trimmedPhone.replace(/[\s\-\(\)]/g, '');
    const mobileRegex = /^(\+92|0)3[0-9]{9}$/;
    const landlineRegex = /^(\+92|0)(21|22|25|40|41|42|44|45|46|47|48|49|51|52|53|54|55|56|57|58|59|61|62|63|64|65|66|67|68|69|71|72|74|75|76|77|78|79|81|82|83|84|85|86|87|88|91|92|93|94|95|96|98|99)[0-9]{7}$/;
    if (mobileRegex.test(cleanPhone) || landlineRegex.test(cleanPhone)) {
      setContactPhoneError(''); setIsValidContactPhone(true); return true;
    }
    setContactPhoneError('Enter a valid Pakistani number (Mobile: 03XX-XXXXXXX, Landline: 042-XXXXXXX)');
    setIsValidContactPhone(false); return false;
  };

  const validateCapacity = (cap: string) => {
    if (!cap.trim()) { setCapacityError('Capacity is required'); setIsValidCapacity(false); return false; }
    const numCapacity = parseInt(cap);
    if (isNaN(numCapacity) || numCapacity < 50) { setCapacityError('Capacity must be at least 50'); setIsValidCapacity(false); return false; }
    setCapacityError(''); setIsValidCapacity(true); return true;
  };

  const validatePrice = (prc: string) => {
    if (!prc.trim()) { setPriceError('Price is required'); setIsValidPrice(false); return false; }
    const numPrice = parseInt(prc);
    if (isNaN(numPrice) || numPrice <= 0) { setPriceError('Price must be a positive number'); setIsValidPrice(false); return false; }
    setPriceError(''); setIsValidPrice(true); return true;
  };

  const validateTables = (tbl: string) => {
    if (!tbl.trim()) { setTablesError('Number of tables is required'); setIsValidTables(false); return false; }
    const numTables = parseInt(tbl);
    if (isNaN(numTables) || numTables < 1) { setTablesError('Enter a valid number of tables'); setIsValidTables(false); return false; }
    setTablesError(''); setIsValidTables(true); return true;
  };

  const validateChairs = (chr: string) => {
    if (!chr.trim()) { setChairsError('Number of chairs is required'); setIsValidChairs(false); return false; }
    const numChairs = parseInt(chr);
    if (isNaN(numChairs) || numChairs < 1) { setChairsError('Enter a valid number of chairs'); setIsValidChairs(false); return false; }
    setChairsError(''); setIsValidChairs(true); return true;
  };

  const validateHallType = () => {
    if (!hallType) { setHallTypeError('Please select hall type'); return false; }
    setHallTypeError(''); return true;
  };

  const validateVerificationDoc = () => {
    if (!verificationDoc) { setVerificationDocError('Verification document is required'); setIsValidVerificationDoc(false); return false; }
    setVerificationDocError(''); setIsValidVerificationDoc(true); return true;
  };

  const validateLocation = () => {
    if (!hallLocation) { setLocationError('Please select hall location on map'); setIsValidLocation(false); return false; }
    setLocationError(''); setIsValidLocation(true); return true;
  };

  const toggleFacility = (id: string) => {
    setFacilities(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const pickVerificationDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const doc = result.assets[0];
        setVerificationDoc({ uri: doc.uri, name: doc.name, type: doc.mimeType || 'application/pdf' });
        setVerificationDocError(''); setIsValidVerificationDoc(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };
  const removeDocument = () => {
    setVerificationDoc(null); setIsValidVerificationDoc(false);
  };
  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to search for places.');
        setIsSearching(false);
        return;
      }

      const results = await Location.geocodeAsync(searchQuery);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setTempMarker({ latitude, longitude });
        setMapRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
      } else {
        Alert.alert('Not Found', 'Location not found, try a different search.');
      }
      } catch (error: any) {
        console.log('Geocode error:', error?.message || error);
        Alert.alert('Error', 'Search failed. Please try again.');
      } finally {
        setIsSearching(false);
      }
    };

  const handleMapPress = useCallback((event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setTempMarker({ latitude, longitude });
  }, []);

  const handleMarkerDragEnd = useCallback((e: any) => {
    setTempMarker(e.nativeEvent.coordinate);
  }, []);

  const handleUseCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed.');
        setIsLocating(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      setTempMarker({ latitude, longitude });
      setMapRegion({
        latitude, longitude,
        latitudeDelta: 0.01, longitudeDelta: 0.01,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not get current location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleConfirmLocation = async () => {
    if (!tempMarker) {
      Alert.alert('Select Location', 'Please tap on the map or search to select a location.');
      return;
    }

    let addressText = `${tempMarker.latitude.toFixed(6)}, ${tempMarker.longitude.toFixed(6)}`;
    try {
      const results = await Location.reverseGeocodeAsync(tempMarker);
      if (results.length > 0) {
        const r = results[0];
        addressText = [r.name, r.street, r.city, r.region].filter(Boolean).join(', ');
      }
    } catch (e) {
      console.log('Reverse geocode failed, using coordinates instead');
    }

    setHallLocation({
      latitude: tempMarker.latitude,
      longitude: tempMarker.longitude,
      address: addressText,
    });
    setLocationError('');
    setIsValidLocation(true);
    setShowMapModal(false);
    setTempMarker(null);
    setSearchQuery('');
  };
  const handleOpenMapModal = () => {
    if (hallLocation) {
      setMapRegion({
        latitude: hallLocation.latitude,
        longitude: hallLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setTempMarker({
        latitude: hallLocation.latitude,
        longitude: hallLocation.longitude,
      });
    }
    setShowMapModal(true);
  };

  const removeLocation = () => {
    setHallLocation(null); setIsValidLocation(false);
  };

  const openCamera = async () => {
    setShowMediaModal(false);
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access'); return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'], allowsEditing: true, quality: 0.8, videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setMediaFiles(prev => [...prev, { uri: asset.uri, type: asset.type as 'image' | 'video' }]);
    }
  };

  const openGallery = async () => {
    setShowMediaModal(false);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow gallery access'); return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'], quality: 0.8, allowsMultipleSelection: true, videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newMediaItems: MediaItem[] = result.assets.map(asset => ({
        uri: asset.uri, type: asset.type as 'image' | 'video',
      }));
      setMediaFiles(prev => [...prev, ...newMediaItems]);
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    const isAddressValid = validateAddress(address);
    const isPhoneValid = validateContactPhone(contactPhone);
    const isCapacityValid = validateCapacity(capacity);
    const isPriceValid = validatePrice(price);
    const isTablesValid = validateTables(tables);
    const isChairsValid = validateChairs(chairs);
    const isTypeValid = validateHallType();
    const isDocValid = validateVerificationDoc();
    const isLocationValid = validateLocation();
    const isNameValid = validateHallName(hallName);

    if (isNameValid && isAddressValid && isPhoneValid && isCapacityValid &&
        isPriceValid && isTablesValid && isChairsValid && isTypeValid &&
        isDocValid && isLocationValid) {
      setIsUploading(true);
      
      try {
        const selectedFacilities = Object.entries(facilities)
          .filter(([_, isSelected]) => isSelected)
          .map(([id, _]) => facilitiesList.find(f => f.id === id)?.name || id);

        let uploadedMediaFiles: { uri: string; type: 'image' | 'video'; publicId: string }[] = [];
        if (mediaFiles.length > 0) {
          uploadedMediaFiles = await uploadMultipleToCloudinary(mediaFiles);
        }

        let uploadedDoc = null;
        if (verificationDoc) {
          const docResult = await uploadToCloudinary(
            verificationDoc.uri, 
            verificationDoc.name, 
            verificationDoc.type?.includes('pdf') ? 'raw' : 'image'
          );
          uploadedDoc = {
            uri: docResult.url,
            name: verificationDoc.name,
            type: verificationDoc.type,
            publicId: docResult.publicId,
          };
        }

        const hallData = {
          managerId: userData?.uid || '',
          managerName: userData?.name || '',
          managerEmail: userData?.email || '',
          hallName,
          address,
          contactPhone,
          capacity: parseInt(capacity),
          price: parseInt(price),
          tables: parseInt(tables),
          chairs: parseInt(chairs),
          hallType: hallType as 'Indoor' | 'Outdoor',
          otherInfo,
          facilities: selectedFacilities,
          mediaFiles: uploadedMediaFiles,     
          verificationDoc: uploadedDoc,       
          location: hallLocation! as { latitude: number; longitude: number; address: string },
        };
        const newHallId = await createHall(hallData);

        await addDoc(collection(db, 'notifications'), {
          type: 'Halls',
          sender: userData?.name || 'A Manager',
          senderId: userData?.uid || '',
          hallId: newHallId, 
          hallName: hallName,
          message: `${userData?.name} has added a new hall "${hallName}" for approval.`,
          timestamp: serverTimestamp(),
          status: 'unread',
          action: 'hall-details',
          targetRole: 'admin'
        });

        Alert.alert('Success', 'Hall submitted successfully! Waiting for admin approval.', [
          { text: 'OK', onPress: () => router.push('/(managerapp)/home') }
        ]);

      } catch (error: any) {
        console.error("Hall Upload Error:", error);
        Alert.alert('Error', error.message || 'Failed to upload hall. Please try again.');
      } finally {
        setIsUploading(false);
      }
    } else {
      Alert.alert('Error', 'Please fill all required fields correctly');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.container} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add New Hall</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={[styles.content, { paddingBottom: 140 }]}>
            <Text style={styles.label}>Hall Name <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, hallNameError ? styles.inputError : isValidHallName ? styles.inputSuccess : null]}>
              <TextInput style={styles.input} placeholder="Enter hall name" placeholderTextColor="#9CA3AF" value={hallName}
                onChangeText={(text) => { setHallName(text); if (hallNameError || isValidHallName) validateHallName(text); }}
                onBlur={() => validateHallName(hallName)} />
              {isValidHallName && hallName && (<View style={styles.tickContainer}><Ionicons name="checkmark-circle" size={20} color="#10B981" /></View>)}
            </View>
            {hallNameError ? <Text style={styles.errorText}>{hallNameError}</Text> : null}

            <Text style={styles.label}>Address <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, addressError ? styles.inputError : isValidAddress ? styles.inputSuccess : null]}>
              <TextInput style={styles.input} placeholder="e.g. Street 5, Wapda Town, Lahore" placeholderTextColor="#9CA3AF" value={address}
                onChangeText={(text) => { setAddress(text); if (addressError || isValidAddress) validateAddress(text); }}
                onBlur={() => validateAddress(address)} />
              {isValidAddress && address && (<View style={styles.tickContainer}><Ionicons name="checkmark-circle" size={20} color="#10B981" /></View>)}
            </View>
            {addressError ? <Text style={styles.errorText}>{addressError}</Text> : null}

            <Text style={styles.label}>Hall Location on Map <Text style={styles.required}>*</Text></Text>
            {hallLocation ? (
              <View style={[styles.locationSelectedBox, locationError ? styles.inputError : styles.locationSelectedBoxValid]}>
                <View style={styles.locationSelectedInfo}>
                  <View style={styles.locationIconBox}>
                    <Ionicons name="location" size={22} color="#5B21B6" />
                  </View>
                  <View style={styles.locationTextContainer}>
                    <Text style={styles.locationSelectedAddress} numberOfLines={2}>{hallLocation.address}</Text>
                    <Text style={styles.locationCoordinates}>{hallLocation.latitude.toFixed(5)}, {hallLocation.longitude.toFixed(5)}</Text>
                  </View>
                </View>
                <View style={styles.locationActions}>
                  <TouchableOpacity style={styles.locationActionBtn} onPress={handleOpenMapModal}>
                    <Ionicons name="pencil" size={16} color="#5B21B6" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.locationActionBtn} onPress={removeLocation}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                  {isValidLocation && (<View style={styles.tickContainer}><Ionicons name="checkmark-circle" size={20} color="#10B981" /></View>)}
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.locationButton, locationError ? styles.inputError : null]}
                onPress={handleOpenMapModal}>
                <Ionicons name="location-outline" size={20} color="#5B21B6" />
                <Text style={styles.locationText}>Select Location on Map</Text>
                <Ionicons name="chevron-forward" size={18} color="#5B21B6" />
              </TouchableOpacity>
            )}
            {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
            <Text style={styles.locationHint}>Tap on map, search location, or use current location</Text>

            <Text style={styles.label}>Contact Number <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, contactPhoneError ? styles.inputError : isValidContactPhone ? styles.inputSuccess : null]}>
              <TextInput style={styles.input} placeholder="e.g. 0300-1234567" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" value={contactPhone}
                onChangeText={(text) => { setContactPhone(text); if (contactPhoneError || isValidContactPhone) validateContactPhone(text); }}
                onBlur={() => validateContactPhone(contactPhone)} />
              {isValidContactPhone && contactPhone && (<View style={styles.tickContainer}><Ionicons name="checkmark-circle" size={20} color="#10B981" /></View>)}
            </View>
            {contactPhoneError ? <Text style={styles.errorText}>{contactPhoneError}</Text> : null}

            <Text style={styles.label}>Hall Verification Document <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={[styles.uploadBox, verificationDoc && styles.uploadBoxSuccess]} onPress={pickVerificationDocument}>
              {verificationDoc ? (
                <View style={styles.docInfo}>
                  <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                  <Text style={styles.docName} numberOfLines={1}>{verificationDoc.name}</Text>
                  <TouchableOpacity onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); removeDocument(); }}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={24} color="#9CA3AF" />
                  <Text style={styles.uploadText}>Upload PDF/Image</Text>
                  <Text style={styles.uploadHint}>CNIC, Registration, or Ownership Proof</Text>
                </>
              )}
            </TouchableOpacity>
            {verificationDocError ? <Text style={styles.errorText}>{verificationDocError}</Text> : null}

            <Text style={styles.label}>Hall Capacity <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, capacityError ? styles.inputError : isValidCapacity ? styles.inputSuccess : null]}>
              <TextInput style={styles.input} placeholder="e.g. 500" placeholderTextColor="#9CA3AF" keyboardType="number-pad" value={capacity}
                onChangeText={(text) => { setCapacity(text); if (capacityError || isValidCapacity) validateCapacity(text); }}
                onBlur={() => validateCapacity(capacity)} />
              {isValidCapacity && capacity && (<View style={styles.tickContainer}><Ionicons name="checkmark-circle" size={20} color="#10B981" /></View>)}
            </View>
            {capacityError ? <Text style={styles.errorText}>{capacityError}</Text> : null}

            <Text style={styles.label}>Prices Per Head Starts From (PKR) <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, priceError ? styles.inputError : isValidPrice ? styles.inputSuccess : null]}>
              <TextInput style={styles.input} placeholder="e.g. 50000" placeholderTextColor="#9CA3AF" keyboardType="number-pad" value={price}
                onChangeText={(text) => { setPrice(text); if (priceError || isValidPrice) validatePrice(text); }}
                onBlur={() => validatePrice(price)} />
              {isValidPrice && price && (<View style={styles.tickContainer}><Ionicons name="checkmark-circle" size={20} color="#10B981" /></View>)}
            </View>
            {priceError ? <Text style={styles.errorText}>{priceError}</Text> : null}

            <Text style={styles.label}>Number of Tables <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, tablesError ? styles.inputError : isValidTables ? styles.inputSuccess : null]}>
              <TextInput style={styles.input} placeholder="e.g. 75" placeholderTextColor="#9CA3AF" keyboardType="number-pad" value={tables}
                onChangeText={(text) => { setTables(text); if (tablesError || isValidTables) validateTables(text); }}
                onBlur={() => validateTables(tables)} />
              {isValidTables && tables && (<View style={styles.tickContainer}><Ionicons name="checkmark-circle" size={20} color="#10B981" /></View>)}
            </View>
            {tablesError ? <Text style={styles.errorText}>{tablesError}</Text> : null}

            <Text style={styles.label}>Number of Chairs <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, chairsError ? styles.inputError : isValidChairs ? styles.inputSuccess : null]}>
              <TextInput style={styles.input} placeholder="e.g. 600" placeholderTextColor="#9CA3AF" keyboardType="number-pad" value={chairs}
                onChangeText={(text) => { setChairs(text); if (chairsError || isValidChairs) validateChairs(text); }}
                onBlur={() => validateChairs(chairs)} />
              {isValidChairs && chairs && (<View style={styles.tickContainer}><Ionicons name="checkmark-circle" size={20} color="#10B981" /></View>)}
            </View>
            {chairsError ? <Text style={styles.errorText}>{chairsError}</Text> : null}

            <Text style={styles.label}>Hall Type <Text style={styles.required}>*</Text></Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity style={styles.radioOption} onPress={() => { setHallType('Indoor'); setHallTypeError(''); }}>
                <View style={[styles.radioCircle, hallType === 'Indoor' && styles.radioCircleSelected]}>
                  {hallType === 'Indoor' && <View style={styles.radioInnerCircle} />}
                </View>
                <Text style={[styles.radioText, hallType === 'Indoor' && styles.radioTextSelected]}>Indoor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.radioOption} onPress={() => { setHallType('Outdoor'); setHallTypeError(''); }}>
                <View style={[styles.radioCircle, hallType === 'Outdoor' && styles.radioCircleSelected]}>
                  {hallType === 'Outdoor' && <View style={styles.radioInnerCircle} />}
                </View>
                <Text style={[styles.radioText, hallType === 'Outdoor' && styles.radioTextSelected]}>Outdoor</Text>
              </TouchableOpacity>
            </View>
            {hallTypeError ? <Text style={styles.errorText}>{hallTypeError}</Text> : null}

            <Text style={styles.sectionTitle}>Hall Media</Text>
            <View style={styles.mediaGrid}>
              {mediaFiles.map((media, index) => (
                <TouchableOpacity key={index} style={styles.mediaItem}
                  onPress={() => router.push({ pathname: '/(managerapp)/media-viewer', params: { mediaFiles: JSON.stringify(mediaFiles), index: index.toString() } } as any)}>
                  {media.type === 'image' ? (
                    <Image source={{ uri: media.uri }} style={styles.mediaImage} />
                  ) : (
                    <View style={styles.videoPlaceholder}>
                      <Ionicons name="play-circle" size={40} color="#5B21B6" />
                      <Text style={styles.videoText}>Video</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.removeButton} onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); removeMedia(index); }}>
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addMediaBtn} onPress={() => setShowMediaModal(true)}>
                <Ionicons name="add" size={30} color="#5B21B6" />
                <Text style={styles.addMediaText}>Add</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.mediaHint}>You can upload multiple photos and videos of your hall</Text>

            <Text style={styles.sectionTitle}>Hall Facilities</Text>
            {facilitiesList.map((item) => (
              <View key={item.id} style={styles.facilityRow}>
                <Text style={styles.facilityText}>{item.name}</Text>
                <Switch value={facilities[item.id] || false} onValueChange={() => toggleFacility(item.id)}
                  trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }} thumbColor={facilities[item.id] ? '#5B21B6' : '#F3F4F6'} />
              </View>
            ))}

            <Text style={styles.label}>Any Other Information (Optional)</Text>
            <TextInput 
              style={styles.textArea} 
              placeholder="Enter any additional details about your hall" 
              placeholderTextColor="#9CA3AF"
              multiline 
              numberOfLines={4} 
              value={otherInfo} 
              onChangeText={setOtherInfo}
              scrollEnabled={true}
            />
            <TouchableOpacity 
              style={[styles.submitButton, isUploading && { opacity: 0.7 }]} 
              onPress={handleUpload}
              disabled={isUploading} >
              {isUploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Upload Hall</Text>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
        <BottomNav />

        <Modal visible={showMediaModal} transparent animationType="fade" onRequestClose={() => setShowMediaModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMediaModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Media</Text>
              <Text style={styles.modalSubtitle}>Choose a source</Text>
              <TouchableOpacity style={styles.modalOption} onPress={openCamera}>
                <View style={styles.modalIconContainer}><Ionicons name="camera-outline" size={24} color="#5B21B6" /></View>
                <View style={styles.modalTextContainer}>
                  <Text style={styles.modalOptionTitle}>Take Photo or Video</Text>
                  <Text style={styles.modalOptionSubtitle}>Use your camera</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalOption} onPress={openGallery}>
                <View style={styles.modalIconContainer}><Ionicons name="images-outline" size={24} color="#5B21B6" /></View>
                <View style={styles.modalTextContainer}>
                  <Text style={styles.modalOptionTitle}>Choose from Gallery</Text>
                  <Text style={styles.modalOptionSubtitle}>Select from your device</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowMediaModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        <HallMapModal
            visible={showMapModal}
            onClose={() => setShowMapModal(false)}
            mapRef={mapRef}
            mapRegion={mapRegion}
            tempMarker={tempMarker}
            onMapPress={handleMapPress}
            onDragEnd={handleMarkerDragEnd}
            onConfirm={handleConfirmLocation}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearch={handleSearchLocation}
            isSearching={isSearching}
            isLocating={isLocating}
            onUseCurrentLocation={handleUseCurrentLocation}
          />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 180 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 30, paddingBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { paddingHorizontal: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 16, marginBottom: 8 },
  required: { color: '#EF4444' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: '#FFFFFF' },
  inputError: { borderColor: '#EF4444' },
  inputSuccess: { borderColor: '#10B981' },
  input: { flex: 1, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#111827' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 5, marginLeft: 5 },
  tickContainer: { paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  locationButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', padding: 14, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#E9D5FF' },
  locationText: { color: '#5B21B6', fontWeight: '600', marginLeft: 10, flex: 1 },
  locationHint: { fontSize: 11, color: '#6B7280', marginTop: 4, marginLeft: 4 },
  locationSelectedBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 12, borderRadius: 8, marginTop: 8, borderWidth: 1 },
  locationSelectedBoxValid: { borderColor: '#10B981' },
  locationSelectedInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  locationIconBox: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
  locationTextContainer: { flex: 1 },
  locationSelectedAddress: { fontSize: 13, color: '#111827', fontWeight: '500', lineHeight: 18 },
  locationCoordinates: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  locationActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationActionBtn: { padding: 4 },
  uploadBox: { borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 8, padding: 20, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  uploadBoxSuccess: { borderStyle: 'solid', borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  uploadText: { color: '#6B7280', marginTop: 8, fontSize: 13, fontWeight: '500' },
  uploadHint: { color: '#9CA3AF', marginTop: 4, fontSize: 11 },
  docInfo: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 10 },
  docName: { flex: 1, fontSize: 13, color: '#111827', fontWeight: '500' },
  radioContainer: { gap: 6, marginBottom: 8 },
  radioOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  radioCircleSelected: { borderColor: '#5B21B6' },
  radioInnerCircle: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#5B21B6' },
  radioText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  radioTextSelected: { color: '#5B21B6', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 12 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mediaItem: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  mediaImage: { width: '100%', height: '100%' },
  videoPlaceholder: { width: '100%', height: '100%', backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E9D5FF' },
  videoText: { fontSize: 11, color: '#5B21B6', fontWeight: '600', marginTop: 4 },
  removeButton: { position: 'absolute', top: 4, right: 4, backgroundColor: '#FFFFFF', borderRadius: 12 },
  addMediaBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 1.5, borderColor: '#5B21B6', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  addMediaText: { fontSize: 11, color: '#5B21B6', fontWeight: '600', marginTop: 4 },
  mediaHint: { fontSize: 12, color: '#6B7280', marginTop: 8, fontStyle: 'italic' },
  facilityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  facilityText: { fontSize: 14, color: '#4B5563' },
  textArea: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#111827', height: 120, textAlignVertical: 'top', backgroundColor: '#FFFFFF', marginTop: 8 },
  submitButton: { backgroundColor: '#5B21B6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '85%', maxWidth: 380 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 12, backgroundColor: '#FAFAFA' },
  modalIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  modalTextContainer: { flex: 1 },
  modalOptionTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  modalOptionSubtitle: { fontSize: 12, color: '#6B7280' },
  modalCancelButton: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalCancelText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  mapModalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  mapModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  mapModalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 4 },
  searchInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, color: '#111827' },
  searchResultsContainer: { maxHeight: 200, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  searchResultText: { flex: 1, fontSize: 13, color: '#111827' },
  mapContainer: { flex: 1, position: 'relative', zIndex: 0 },
  map: { flex: 1, zIndex: 1 },
  currentLocationBtn: { position: 'absolute', bottom: 20, right: 20, width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  mapInstruction: { position: 'absolute', top: 20, left: 20, right: 20, backgroundColor: 'rgba(91, 33, 182, 0.9)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  mapInstructionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  mapModalFooter: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFFFFF' },
  mapCancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#F3F4F6' },
  mapCancelText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  mapConfirmButton: { flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5B21B6', gap: 8 },
  mapConfirmButtonDisabled: { backgroundColor: '#D1D5DB' },
  mapConfirmText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
centerPinContainer: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -22 }, { translateY: -42 }], zIndex: 9999, ...(Platform.OS === 'android' && { elevation: 10 }),  
},});