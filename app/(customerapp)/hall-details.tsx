// app/(customerapp)/hall-details.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, FlatList, Alert, Linking, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import { webContainerStyle } from '@/constants/webstyles';
import { getHallById } from '../../backend/services/hallServices';
import { checkHallAvailability } from '../../backend/services/bookingServices';

const getFacilityIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('parking')) return 'car-outline';
  if (lowerName.includes('sound')) return 'volume-high-outline';
  if (lowerName.includes('generator')) return 'flash-outline';
  if (lowerName.includes('light')) return 'bulb-outline';
  if (lowerName.includes('ac') || lowerName.includes('cooling') || lowerName.includes('heating')) return 'snow-outline';
  if (lowerName.includes('wifi')) return 'wifi-outline';
  if (lowerName.includes('washroom') || lowerName.includes('restroom')) return 'water-outline';
  if (lowerName.includes('stage')) return 'easel-outline';
  if (lowerName.includes('sofa')) return 'cafe-outline';
  if (lowerName.includes('projector')) return 'tv-outline';
  if (lowerName.includes('ventilation') || lowerName.includes('air')) return 'navigate-outline';
  return 'checkmark-circle-outline';
};

const timeSlots = [
  { id: '1', label: 'Morning', time: '8:00 AM - 12:00 PM', endTime: 12 },
  { id: '2', label: 'Afternoon', time: '12:00 PM - 4:00 PM', endTime: 16 },
  { id: '3', label: 'Evening', time: '6:00 PM - 10:00 PM', endTime: 22 },
];

export default function HallDetailsScreen() {
  const params = useLocalSearchParams();
  const hallId = params.id as string;
  
  const [hall, setHall] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false); 
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const webDateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchHall = async () => {
      if (!hallId) {
        Alert.alert('Error', 'Hall ID missing');
        router.back();
        return;
      }
      setIsLoading(true);
      try {
        const hallData = await getHallById(hallId);
        if (hallData) {
          setHall(hallData);
        } else {
          Alert.alert('Error', 'Hall not found.');
          router.back();
        }
      } catch (error) {
        console.error("Error fetching hall:", error);
        Alert.alert('Error', 'Failed to load hall details.');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchHall();
  }, [hallId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
      setAvailabilityChecked(false);
    }
  };

  const handleWebDateChange = (dateString: string) => {
    if (dateString) {
      setSelectedDate(new Date(dateString));
      setAvailabilityChecked(false);
    }
  };

  const triggerWebDatePicker = () => {
    if (webDateInputRef.current) {
      webDateInputRef.current.showPicker(); 
    }
  };

  const isTimeSlotDisabled = (slot: typeof timeSlots[0]) => {
    if (selectedDate) {
      const today = new Date();
      const isToday = selectedDate.toDateString() === today.toDateString();
      if (isToday) {
        return currentHour >= slot.endTime;
      }
    }
    return false;
  };

  const handleTimeSelect = (slot: typeof timeSlots[0]) => {
    if (isTimeSlotDisabled(slot)) return;
    setSelectedTimeSlot(slot.id);
    setShowTimeDropdown(false);
    setAvailabilityChecked(false);
  };

  const handleOpenMap = () => {
    if (!hall?.location?.latitude || !hall?.location?.longitude) {
      Alert.alert('Error', 'Location coordinates not available');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hall.location.latitude},${hall.location.longitude}`;
    Linking.openURL(url).catch(err => Alert.alert('Error', 'Could not open map'));
  };

  const handlePhonePress = async () => {
    if (!hall?.contactPhone) return;
    const phoneUrl = `tel:${hall.contactPhone}`;
    const supported = await Linking.canOpenURL(phoneUrl);
    if (supported) {
      await Linking.openURL(phoneUrl);
    } else {
      Alert.alert('Error', 'Cannot make phone calls');
    }
  };

  const handleCopyPhone = async () => {
    if (!hall?.contactPhone) return;
    await Clipboard.setStringAsync(hall.contactPhone);
    Alert.alert('Copied', 'Phone number copied to clipboard');
  };

  const handleCheckAvailability = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      Alert.alert('Error', 'Please select both date and time slot');
      return;
    }
    setIsChecking(true);     
    try {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const selectedSlotLabel = timeSlots.find(s => s.id === selectedTimeSlot)?.label || '';
      const isAvailableInDB = await checkHallAvailability(hallId, formattedDate, selectedSlotLabel);
      setIsAvailable(isAvailableInDB); 
    } catch (error) {
      console.error("Availability check failed:", error);
      Alert.alert('Error', 'Failed to check availability. Please try again.');
    } finally {
      setIsChecking(false); 
      setAvailabilityChecked(true); 
    }
  };

  const handleSendRequest = () => {
    const formattedDate = selectedDate 
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : '';
    if (!availabilityChecked || !isAvailable) {
      Alert.alert('Error', 'Please check availability first');
      return;
    }
    if (!hall?.id || !hall?.managerId) {
      Alert.alert('Error', 'Hall information is missing. Please go back and try again.');
      return;
    }
    router.push({
      pathname: '/(customerapp)/send-request',
      params: { 
        hallId: String(hall.id), 
        hallName: String(hall.hallName), 
        managerId: String(hall.managerId), 
        hallAddress: hall.address,
        hallCapacity: hall.capacity,
        initialDate: formattedDate,       
        initialTimeSlot: selectedTimeSlot, 
      }
    } as any);
  };

  const handleMediaClick = (media: { uri: string; type: 'image' | 'video' }) => {
    router.push(`/(customerapp)/media-viewer?uri=${encodeURIComponent(media.uri)}&type=${media.type}`);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#5B21B6" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading hall details...</Text>
      </View>
    );
  }

  if (!hall) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.titleText} numberOfLines={1}>Hall Details</Text>
        <View style={{ width: 40 }} />
      </View>

    <ScrollView style={[styles.container, webContainerStyle]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.content}>
          <Text style={styles.hallName}>{hall.hallName}</Text>
          
          <TouchableOpacity style={styles.locationRow} onPress={handleOpenMap} activeOpacity={0.7}>
            <Ionicons name="location" size={18} color="#5B21B6" />
            <Text style={styles.locationText}>{hall.address}</Text>
          </TouchableOpacity>

          <Text style={styles.priceText}>Starting from PKR {hall.price?.toLocaleString() || '0'} per head</Text>
          
          <Text style={styles.phoneContainer}>
            <Text style={styles.phoneLabel}>Contact: </Text>
            <Text 
              style={styles.clickablePhone}
              onPress={handlePhonePress}
              onLongPress={handleCopyPhone}
            >
              {hall.contactPhone || 'N/A'}
            </Text>
          </Text>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hall Media</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/(customerapp)/media-gallery' as any, params: { hallName: hall.hallName, mediaFiles: JSON.stringify(hall.mediaFiles || []) } })}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={hall.mediaFiles || []}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item: any, index: number) => index.toString()}
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity 
                  style={styles.photoThumbnail}
                  onPress={() => handleMediaClick(item)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: item.uri }} style={styles.photoThumbnailImage} resizeMode="cover" />
                  {item.type === 'video' && (
                    <View style={styles.videoIconOverlay}>
                      <Ionicons name="play-circle" size={32} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hall Specifications</Text>
            <View style={styles.specsGrid}>
              <View style={styles.specItem}>
                <Ionicons name="people" size={20} color="#5B21B6" />
                <View style={styles.specContent}>
                  <Text style={styles.specLabel}>Capacity</Text>
                  <Text style={styles.specValue}>{hall.capacity || '0'} people</Text>
                </View>
              </View>
              
              <View style={styles.specItem}>
                <Ionicons name="grid-outline" size={20} color="#5B21B6" />
                <View style={styles.specContent}>
                  <Text style={styles.specLabel}>Chairs</Text>
                  <Text style={styles.specValue}>{hall.chairs || '0'}</Text>
                </View>
              </View>
              
              <View style={styles.specItem}>
                <Ionicons name="restaurant" size={20} color="#5B21B6" />
                <View style={styles.specContent}>
                  <Text style={styles.specLabel}>Tables</Text>
                  <Text style={styles.specValue}>{hall.tables || '0'}</Text>
                </View>
              </View>
              
              <View style={styles.specItem}>
                <Ionicons name="business" size={20} color="#5B21B6" />
                <View style={styles.specContent}>
                  <Text style={styles.specLabel}>Type</Text>
                  <Text style={styles.specValue}>{hall.hallType || 'N/A'}</Text>
                </View>
              </View>

            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity style={styles.datePickerBox}  onPress={() => Platform.OS === 'web' ? triggerWebDatePicker() : setShowDatePicker(true)}>
              <Text style={selectedDate ? styles.dateText : styles.placeholderText}>
                {selectedDate ? formatDate(selectedDate) : 'Select Date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </TouchableOpacity>

            <Text style={styles.label}>Time Slot</Text>
            <TouchableOpacity style={styles.datePickerBox} onPress={() => setShowTimeDropdown(!showTimeDropdown)}>
              <Text style={selectedTimeSlot ? styles.dateText : styles.placeholderText}>
                {selectedTimeSlot 
                  ? timeSlots.find(s => s.id === selectedTimeSlot)?.label + ' (' + timeSlots.find(s => s.id === selectedTimeSlot)?.time + ')' 
                  : 'Select Time Slot'}
              </Text>
              <Ionicons name={showTimeDropdown ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
            </TouchableOpacity>
            
            {showTimeDropdown && (
              <View style={styles.dropdownContainer}>
                {timeSlots.map((slot) => {
                  const isDisabled = isTimeSlotDisabled(slot);
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[styles.dropdownItem, isDisabled && styles.dropdownItemDisabled]}
                      onPress={() => { if (!isDisabled) handleTimeSelect(slot); }}
                      disabled={isDisabled}
                    >
                      <View style={styles.dropdownItemContent}>
                        <Text style={[styles.dropdownItemLabel, isDisabled && styles.dropdownItemLabelDisabled]}>{slot.label}</Text>
                        <Text style={[styles.dropdownItemTime, isDisabled && styles.dropdownItemTimeDisabled]}>{slot.time}</Text>
                      </View>
                      {isDisabled && (
                        <View style={styles.lockedBadge}>
                          <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
                          <Text style={styles.lockedText}>Passed</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity 
              style={styles.checkButton} 
              onPress={handleCheckAvailability}
              disabled={isChecking} 
            >
              {isChecking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.checkButtonText}>Check Availability</Text>
              )}
            </TouchableOpacity>

            {availabilityChecked && (
              <View style={[styles.availabilityStatus, isAvailable ? styles.available : styles.notAvailable]}>
                <Ionicons name={isAvailable ? 'checkmark-circle' : 'close-circle'} size={20} color={isAvailable ? '#10B981' : '#EF4444'} />
                <Text style={[styles.availabilityStatusText, { color: isAvailable ? '#10B981' : '#EF4444' }]}>
                  {isAvailable ? 'Hall is Available' : 'Hall is Not Available'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Facilities</Text>
            <View style={styles.facilitiesGrid}>
              {(hall.facilities || []).map((facilityName: string, index: number) => (
                <View key={index} style={styles.facilityItem}>
                  <View style={styles.facilityIconContainer}>
                    <Ionicons name={getFacilityIcon(facilityName) as any} size={18} color="#5B21B6" />
                  </View>
                  <Text style={styles.facilityText} numberOfLines={1}>{facilityName}</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.requestButton, (!availabilityChecked || !isAvailable) && styles.requestButtonDisabled]}
            onPress={handleSendRequest}
            disabled={!availabilityChecked || !isAvailable}
          >
            <Text style={styles.requestButtonText}>Send Request</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {Platform.OS === 'web' && (
        <input
          ref={webDateInputRef}
          type="date"
          style={{ display: 'none' }}
          value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
          onChange={(e) => handleWebDateChange(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
      )}

      {Platform.OS !== 'web' && showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    paddingTop: 50,
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  titleText: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingTop: 10 },
  hallName: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6, paddingVertical: 4 },
  locationText: { fontSize: 14, color: '#111827', fontWeight: '500' },
  priceText: { fontSize: 13, color: '#4B5563', marginBottom: 4 },
  phoneContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  phoneLabel: { fontSize: 13, color: '#4B5563' },
  clickablePhone: { fontSize: 14, color: '#5B21B6', fontWeight: '600', textDecorationLine: 'underline' },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  viewAllText: { fontSize: 14, color: '#5B21B6', fontWeight: '500' },
  photoThumbnail: { width: 100, height: 100, borderRadius: 12, marginRight: 12, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  photoThumbnailImage: { width: '100%', height: '100%' },
  videoIconOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: 12 },
  specificationsContainer: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  specsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  specItem: { flexDirection: 'row', alignItems: 'center', width: '48%', paddingVertical: 8 },
  specContent: { flex: 1, marginLeft: 10 },
  specLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  specValue: { fontSize: 14, color: '#111827', fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  datePickerBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#FFFFFF', marginBottom: 20 },
  dateText: { fontSize: 14, color: '#111827' },
  placeholderText: { fontSize: 14, color: '#9CA3AF' },  
  dropdownContainer: { borderWidth: 1, borderColor: '#5B21B6', borderRadius: 8, backgroundColor: '#FFFFFF', marginBottom: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFFFFF' },
  dropdownItemDisabled: { backgroundColor: '#F9FAFB', opacity: 0.6 },
  dropdownItemContent: { flex: 1 },
  dropdownItemLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  dropdownItemLabelDisabled: { color: '#9CA3AF' },
  dropdownItemTime: { fontSize: 13, color: '#6B7280' },
  dropdownItemTimeDisabled: { color: '#9CA3AF' },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  lockedText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  checkButton: { backgroundColor: '#5B21B6', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  checkButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  availabilityStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 8 },
  available: { backgroundColor: '#D1FAE5' },
  notAvailable: { backgroundColor: '#FEE2E2' },
  availabilityStatusText: { fontSize: 14, fontWeight: '600' },
  facilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  facilityItem: { width: '48%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 4 },
  facilityIconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  facilityText: { fontSize: 13, color: '#374151', fontWeight: '500', flex: 1 },
  requestButton: { backgroundColor: '#5B21B6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  requestButtonDisabled: { backgroundColor: '#D1D5DB' },
  requestButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
 
});