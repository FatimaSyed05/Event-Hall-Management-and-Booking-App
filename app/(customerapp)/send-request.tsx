// app/(customerapp)/send-request.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '../../constants/webstyles';
import { useAuth } from '../../backend/context/AuthContext';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';
import { triggerPushNotification } from '@/backend/services/notificationServices';

const timeSlots = [
  { id: '1', label: 'Morning', time: '8:00 AM - 12:00 PM', endTime: 12 },
  { id: '2', label: 'Afternoon', time: '12:00 PM - 4:00 PM', endTime: 16 },
  { id: '3', label: 'Evening', time: '6:00 PM - 10:00 PM', endTime: 22 },
];

export default function SendRequestScreen() {
  const params = useLocalSearchParams();
  const rawInitialDate = params.initialDate;
  const initialDateStr = rawInitialDate 
    ? (Array.isArray(rawInitialDate) ? rawInitialDate[0] : rawInitialDate) 
    : null;

  const rawInitialTime = params.initialTimeSlot;
  const initialTimeSlotStr = rawInitialTime 
    ? (Array.isArray(rawInitialTime) ? rawInitialTime[0] : rawInitialTime) 
    : '';
  const { userData } = useAuth();
  
  const hallId = Array.isArray(params.hallId) ? params.hallId[0] : (params.hallId as string);
  const rawHallName = params.hallName;
  const hallName = rawHallName 
    ? decodeURIComponent(Array.isArray(rawHallName) ? rawHallName[0] : (rawHallName as string)) 
    : 'Unknown Hall';
  const managerId = Array.isArray(params.managerId) ? params.managerId[0] : (params.managerId as string);

  useEffect(() => {
    if (!hallId || !managerId) {
      Alert.alert('Missing Data', 'Hall information is missing. Please go back and select a hall again.');
      router.back();
    }
  }, [hallId, managerId]);

  useEffect(() => {
  const fetchHall = async () => {
    if (!hallId) return;
    try {
      const hallSnap = await getDoc(doc(db, 'halls', hallId));
      const data = hallSnap.data();
      const cap = Number(data?.capacity);
      setHallCapacity(Number.isFinite(cap) && cap > 0 ? cap : null);
    } catch (e) {
      console.error('Error fetching hall capacity:', e);
      setHallCapacity(null);
    } finally {
      setLoadingHall(false);
    }
  };
  fetchHall();
}, [hallId]);

  const hallAddress = (params.hallAddress as string) || 'N/A';  
  const [fullName, setFullName] = useState(userData?.name || '');
  const [phone, setPhone] = useState(userData?.phone || '');
  const [email, setEmail] = useState(userData?.email || '');
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDateStr ? new Date(initialDateStr) : null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(initialTimeSlotStr);
  const [guestsCount, setGuestsCount] = useState('');
  const [functionType, setFunctionType] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [hallCapacity, setHallCapacity] = useState<number | null>(null);
  const [loadingHall, setLoadingHall] = useState(true);
  const rawCapacity = Array.isArray(params.hallCapacity) ? params.hallCapacity[0] : params.hallCapacity;
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showEventTypeModal, setShowEventTypeModal] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [guestsError, setGuestsError] = useState('');
  const [functionError, setFunctionError] = useState('');
  const webDateInputRef = useRef<HTMLInputElement>(null);

  const eventTypes = [
    'Engagement',
    'Nikah',
    'Barat',
    'Walima',
    'Mehndi',
    'Qawali Night',
    'Bridal Shower',
    'Baby Shower',
    'Birthday',
    'Aqiqa',
    'Anniversary',
    'Party',
    'Result Declaration',
    'Religious Gathering',
    'Seminar',
    'Concert',
    'Others'
  ];

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
      setDateError('');
      setSelectedTimeSlot('');
    }
  };

  const handleWebDateChange = (dateString: string) => {
    if (dateString) {
      setSelectedDate(new Date(dateString));
      setDateError('');
      setSelectedTimeSlot(''); 
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
        const currentHour = new Date().getHours();
        return currentHour >= slot.endTime;
      }
    }
    return false;
  };

  const handleTimeSelect = (slot: typeof timeSlots[0]) => {
    if (isTimeSlotDisabled(slot)) return;
    setSelectedTimeSlot(slot.id);
    setShowTimeDropdown(false);
    setTimeError('');
  };

  const validateName = (name: string) => {
    if (!name.trim()) { setNameError('Full name is required'); return false; }
    if (name.length < 3) { setNameError('Name must be at least 3 characters'); return false; }
    if (!/^[a-zA-Z.,\s]+$/.test(name)) { setNameError('Name can only contain letters, periods, commas and spaces'); return false; }
    setNameError(''); return true;
  };

  const validatePhone = (phone: string) => {
    if (!phone.trim()) { setPhoneError('Phone number is required'); return false; }
    const cleanPhone = phone.replace(/[\s+]/g, '');
    if (!/^03\d{9}$/.test(cleanPhone)) { setPhoneError('Enter a valid 11-digit number (e.g., 03001234567)'); return false; }
    setPhoneError(''); return true;
  };

  const validateEmail = (email: string) => {
    if (!email.trim()) { setEmailError('Email is required'); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setEmailError('Enter a valid email address'); return false; }
    setEmailError(''); return true;
  };

  const validateDate = (date: Date | null) => {
    if (!date) { setDateError('Event date is required'); return false; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date < today) { setDateError('Event date must be in the future'); return false; }
    setDateError(''); return true;
  };

  const validateTime = (timeSlot: string) => {
    if (!timeSlot) { setTimeError('Please select a time slot'); return false; }
    setTimeError(''); return true;
  };

  const validateGuests = (guests: string) => {
  if (!guests.trim()) { setGuestsError('Estimated guest count is required'); return false; }
  if (!/^\d+$/.test(guests)) {
    setGuestsError('Only numbers are allowed');
    return false;
  }
  const count = parseInt(guests, 10);
  if (!Number.isInteger(count) || count <= 0) {
    setGuestsError('Enter a valid whole number greater than 0');
    return false;
  }

  if (loadingHall) {
    setGuestsError('Please wait, loading hall details...');
    return false;
  }

  if (hallCapacity !== null && count > hallCapacity) {
    setGuestsError(`Guest count cannot exceed hall capacity (${hallCapacity})`);
    return false;
  }

  setGuestsError(''); return true;
};
  const validateFunctionType = (type: string) => {
    if (!type) { setFunctionError('Please select a function type'); return false; }
    setFunctionError(''); return true;
  };

  const handleSubmit = async () => {
    const isNameValid = validateName(fullName);
    const isPhoneValid = validatePhone(phone);
    const isEmailValid = validateEmail(email);
    const isDateValid = validateDate(selectedDate);
    const isTimeValid = validateTime(selectedTimeSlot);
    const isGuestsValid = validateGuests(guestsCount);
    const isFunctionValid = validateFunctionType(functionType);

    if (isNameValid && isPhoneValid && isEmailValid && isDateValid && isTimeValid && isGuestsValid && isFunctionValid) {
      setIsSubmitting(true);
      try {
        const managerDoc = await getDoc(doc(db, 'users', managerId));
        const managerData = managerDoc.data();
        const commissionRate = managerData?.customCommissionRate || 5;
        const year = selectedDate!.getFullYear();
        const month = String(selectedDate!.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate!.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        const selectedSlot = timeSlots.find(s => s.id === selectedTimeSlot);
        const timeSlotToSave = selectedSlot ? selectedSlot.time.replace(' - ', ' to ') : '';

        const requestRef = await addDoc(collection(db, 'requests'), {
          customerId: userData?.uid,
          customerName: fullName,
          customerPhone: phone,
          customerEmail: email,
          hallId: hallId,
          hallAddress: hallAddress, 
          hallName: hallName,
          managerId: managerId,
          date: formattedDate,
          timeSlot: timeSlotToSave, 
          guestsCount: parseInt(guestsCount, 10),
          functionType: functionType,
          specialRequest: specialRequest,
          status: 'pending',
          commissionRate: commissionRate, 
          createdAt: serverTimestamp()
        });

        const newRequestId = requestRef.id; 
        await addDoc(collection(db, 'notifications'), {
          type: 'requests', 
          sender: fullName, 
          senderId: userData?.uid,
          targetUserId: managerId,
          targetRole: 'manager',
          hallId: hallId,
          requestId: newRequestId, 
          message: `New booking request for "${hallName}".`, // on ${formattedDate} (${timeSlotToSave}).`, 
          status: 'unread',
          action: 'request-details',
          timestamp: serverTimestamp()
        });
        await triggerPushNotification(
          managerId,
          'New Booking Request!',
          `${fullName} ne "${hallName}" ke liye booking request bheji hai.`,
          { action: 'request-details', requestId: newRequestId, type: 'requests' }
        );

        Alert.alert('Success', 'Your booking request has been sent successfully!', [
          { text: 'OK', onPress: () => router.replace('/(customerapp)/home') }
        ]);
      } catch (error) {
        console.error("Error submitting request:", error);
        Alert.alert('Error', 'Failed to send request. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>Request Now</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={[styles.input, nameError ? styles.inputError : null]} placeholder="Enter your full name" placeholderTextColor="#9CA3AF" value={fullName} onChangeText={(text) => { setFullName(text); if (nameError) validateName(text); }} onBlur={() => validateName(fullName)} />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={[styles.input, phoneError ? styles.inputError : null]} placeholder="03001234567" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" maxLength={11} value={phone} onChangeText={(text) => { setPhone(text); if (phoneError) validatePhone(text); }} onBlur={() => validatePhone(phone)} />
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

            <Text style={styles.label}>Email Address</Text>
            <TextInput style={[styles.input, emailError ? styles.inputError : null]} placeholder="example@email.com" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={(text) => { setEmail(text); if (emailError) validateEmail(text); }} onBlur={() => validateEmail(email)} />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            <Text style={styles.label}>Event Date</Text>
            <TouchableOpacity style={[styles.input, dateError ? styles.inputError : null]} onPress={() => Platform.OS === 'web' ? triggerWebDatePicker() : setShowDatePicker(true)}>
              <Text style={selectedDate ? styles.dateText : styles.placeholderText}>{selectedDate ? formatDate(selectedDate) : 'Select event date'}</Text>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
            {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}

            <Text style={styles.label}>Event Time</Text>
            <TouchableOpacity style={[styles.input, timeError ? styles.inputError : null]} onPress={() => setShowTimeDropdown(!showTimeDropdown)}>
              <Text style={selectedTimeSlot ? styles.dateText : styles.placeholderText}>
                {selectedTimeSlot ? timeSlots.find(s => s.id === selectedTimeSlot)?.label + ' (' + timeSlots.find(s => s.id === selectedTimeSlot)?.time + ')' : 'Select event time'}
              </Text>
              <Ionicons name={showTimeDropdown ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
            </TouchableOpacity>

            {showTimeDropdown && (
              <View style={styles.dropdownContainer}>
                {timeSlots.map((slot) => {
                  const isDisabled = isTimeSlotDisabled(slot);
                  return (
                    <TouchableOpacity key={slot.id} style={[styles.dropdownItem, isDisabled && styles.dropdownItemDisabled]} onPress={() => { if (!isDisabled) handleTimeSelect(slot); }} disabled={isDisabled}>
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
            {timeError ? <Text style={styles.errorText}>{timeError}</Text> : null}

            <Text style={styles.label}>Guests Count</Text>
            <TextInput style={[styles.input, guestsError ? styles.inputError : null]} placeholder={hallCapacity ? `Max ${hallCapacity} guests` : 'e.g., 250'} placeholderTextColor="#9CA3AF" keyboardType="numeric" value={guestsCount} onChangeText={(text) => { setGuestsCount(text); if (guestsError) validateGuests(text); }} onBlur={() => validateGuests(guestsCount)} />
            {guestsError ? <Text style={styles.errorText}>{guestsError}</Text> : null}

            <Text style={styles.label}>Function Type</Text>
            <TouchableOpacity 
              style={[styles.input, functionError ? styles.inputError : null]} 
              onPress={() => setShowEventTypeModal(true)}
            >
              <Text style={functionType ? styles.dateText : styles.placeholderText}>
                {functionType || 'Select event type'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            {functionError ? <Text style={styles.errorText}>{functionError}</Text> : null}

            <Modal
              visible={showEventTypeModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowEventTypeModal(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1} 
                onPress={() => setShowEventTypeModal(false)}
              >
                <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Event Type</Text>
                    <TouchableOpacity onPress={() => setShowEventTypeModal(false)}>
                      <Ionicons name="close-circle" size={28} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.modalList}>
                    {eventTypes.map((type, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.modalItem,
                          functionType === type && styles.modalItemSelected
                        ]}
                        onPress={() => {
                          setFunctionType(type);
                          setFunctionError('');
                          setShowEventTypeModal(false);
                        }}
                      >
                        <Text style={[
                          styles.modalItemText,
                          functionType === type && styles.modalItemTextSelected
                        ]}>
                          {type}
                        </Text>
                        {functionType === type && (
                          <Ionicons name="checkmark-circle" size={22} color="#5B21B6" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>

            <Text style={styles.label}>Special Request (Optional)</Text>
            <TextInput style={styles.textArea} placeholder="Any specific requirements or decorations needed?" placeholderTextColor="#9CA3AF" value={specialRequest} onChangeText={setSpecialRequest} multiline numberOfLines={4} textAlignVertical="top" />

            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
              onPress={handleSubmit} 
              disabled={isSubmitting} 
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </View>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 30, paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: 24, paddingTop: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8, marginTop: 12 },
  input: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 14, fontSize: 14, color: '#111827', backgroundColor: '#FFFFFF', marginBottom: 5 },
  inputError: { borderColor: '#EF4444' },
  dateText: { fontSize: 14, color: '#111827' },
  placeholderText: { fontSize: 14, color: '#9CA3AF' },
  errorText: { color: '#EF4444', fontSize: 12, marginLeft: 5 },
  dropdownContainer: { borderWidth: 1, borderColor: '#5B21B6', borderRadius: 10, backgroundColor: '#FFFFFF', marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFFFFF' },
  dropdownItemDisabled: { backgroundColor: '#F9FAFB', opacity: 0.6 },
  dropdownItemContent: { flex: 1 },
  dropdownItemLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  dropdownItemLabelDisabled: { color: '#9CA3AF' },
  dropdownItemTime: { fontSize: 13, color: '#6B7280' },
  dropdownItemTimeDisabled: { color: '#9CA3AF' },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  lockedText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  textArea: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 14, fontSize: 14, color: '#111827', backgroundColor: '#FFFFFF', minHeight: 100, marginBottom: 5 },
  submitButton: { backgroundColor: '#5B21B6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  submitButtonDisabled: { backgroundColor: '#9CA3AF' }, 
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalList: { paddingHorizontal: 20, paddingTop: 10 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemSelected: { backgroundColor: '#F5F3FF', borderRadius: 8, paddingHorizontal: 10, borderBottomColor: 'transparent' },
  modalItemText: { fontSize: 15, color: '#4B5563', fontWeight: '500' },
  modalItemTextSelected: { color: '#5B21B6', fontWeight: '700' },
});