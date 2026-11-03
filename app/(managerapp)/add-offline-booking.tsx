// app/(managerapp)/add-offline-booking.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { webContainerStyle } from '@/constants/webstyles';
import { useAuth } from '../../backend/context/AuthContext';
import { collection, addDoc, getDocs, query, serverTimestamp, where} from 'firebase/firestore';
import { db } from '@/backend/config/firebaseConfig';

export default function AddOfflineBookingScreen() {
  const params = useLocalSearchParams();
  const { userData } = useAuth();  
  const hallName = params.hallName as string;
  
  const [halls, setHalls] = useState<Array<{id: string, name: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedHall, setSelectedHall] = useState(hallName || '');
  const [selectedHallId, setSelectedHallId] = useState<string>('');  
  const [showHallModal, setShowHallModal] = useState(false);

  // const halls = ['Royal Marquee', 'Grand Palace', 'Imperial Hall'];

  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [eventType, setEventType] = useState('');
  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [bookingDateText, setBookingDateText] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [customStartInput, setCustomStartInput] = useState('');
  const [customEndInput, setCustomEndInput] = useState('');
  const [amount, setAmount] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'pending' | 'confirmed' | 'completed'>('pending');
  const [notes, setNotes] = useState('');
  const [guestsCount, setGuestsCount] = useState('');
  const [guestsCountError, setGuestsCountError] = useState('');
  const [isValidGuestsCount, setIsValidGuestsCount] = useState(false);

  const [selectedHallError, setSelectedHallError] = useState('');
  const [customerNameError, setCustomerNameError] = useState('');
  const [contactNumberError, setContactNumberError] = useState('');
  const [eventTypeError, setEventTypeError] = useState('');
  const [bookingDateError, setBookingDateError] = useState('');
  const [timeStartError, setTimeStartError] = useState('');
  const [timeEndError, setTimeEndError] = useState('');
  const [amountError, setAmountError] = useState('');

  const [isValidSelectedHall, setIsValidSelectedHall] = useState(false);
  const [isValidCustomerName, setIsValidCustomerName] = useState(false);
  const [isValidContactNumber, setIsValidContactNumber] = useState(false);
  const [isValidEventType, setIsValidEventType] = useState(false);
  const [isValidBookingDate, setIsValidBookingDate] = useState(false);
  const [isValidTimeStart, setIsValidTimeStart] = useState(false);
  const [isValidTimeEnd, setIsValidTimeEnd] = useState(false);
  const [isValidAmount, setIsValidAmount] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimeModal, setShowStartTimeModal] = useState(false);
  const [showEndTimeModal, setShowEndTimeModal] = useState(false);

  const startTimeOptions = ['8:00 AM', '12:00 PM', '6:00 PM'];
  const endTimeOptions = ['12:00 PM', '4:00 PM', '10:00 PM'];

  useEffect(() => {
  const fetchHalls = async () => {
    try {
      setIsLoading(true);
      const hallsQuery = query(
      collection(db, 'halls'),
      where('status', '==', 'approved')
    );
      const hallsSnapshot = await getDocs(hallsQuery);
      
      const hallsList = hallsSnapshot.docs.map(doc => {
        const data = doc.data();
        const hallName = data.hallName || data.name || data.hall_name || 'Unknown Hall';
        return {
          id: doc.id,
          name: hallName
        };
      });
      
      setHalls(hallsList);
        if (hallName) {
        const selectedHallDoc = hallsList.find(h => h.name === hallName);
        if (selectedHallDoc) {
          setSelectedHallId(selectedHallDoc.id);
        }
      }
    } catch (error) {
      console.error('Error fetching halls:', error);
      Alert.alert('Error', 'Failed to load halls');
    } finally {
      setIsLoading(false);
    }
  };

  fetchHalls();
}, []);

  const validateSelectedHall = () => {
    if (!selectedHall) {
      setSelectedHallError('Please select a hall');
      setIsValidSelectedHall(false);
      return false;
    }
    setSelectedHallError('');
    setIsValidSelectedHall(true);
    return true;
  };

  const validateCustomerName = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setCustomerNameError('Customer name is required');
      setIsValidCustomerName(false);
      return false;
    }
    if (trimmedName.length < 3) {
      setCustomerNameError('Name must be at least 3 characters');
      setIsValidCustomerName(false);
      return false;
    }
    if (trimmedName.length > 50) {
      setCustomerNameError('Name must be less than 50 characters');
      setIsValidCustomerName(false);
      return false;
    }
    if (!/^[a-zA-Z\s]+$/.test(trimmedName)) {
      setCustomerNameError('Name can only contain letters and spaces');
      setIsValidCustomerName(false);
      return false;
    }
    setCustomerNameError('');
    setIsValidCustomerName(true);
    return true;
  };

  const validateContactNumber = (phone: string) => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setContactNumberError('Contact number is required');
      setIsValidContactNumber(false);
      return false;
    }
    const cleanPhone = trimmedPhone.replace(/[\s\-\(\)]/g, '');
    const pakistanMobileRegex = /^(\+92|0)?3[0-9]{9}$/;
    const pakistanLandlineRegex = /^(\+92|0)?[0-9]{9,10}$/;
    if (!pakistanMobileRegex.test(cleanPhone) && !pakistanLandlineRegex.test(cleanPhone)) {
      setContactNumberError('Enter a valid Pakistani phone number (e.g., 0300-1234567)');
      setIsValidContactNumber(false);
      return false;
    }
    setContactNumberError('');
    setIsValidContactNumber(true);
    return true;
  };

  const validateEventType = (type: string) => {
    const trimmedType = type.trim();
    if (!trimmedType) {
      setEventTypeError('Event type is required');
      setIsValidEventType(false);
      return false;
    }
    if (trimmedType.length < 3) {
      setEventTypeError('Event type must be at least 3 characters');
      setIsValidEventType(false);
      return false;
    }
    if (trimmedType.length > 30) {
      setEventTypeError('Event type must be less than 30 characters');
      setIsValidEventType(false);
      return false;
    }
    if (!/^[a-zA-Z\s]+$/.test(trimmedType)) {
      setEventTypeError('Event type can only contain letters and spaces');
      setIsValidEventType(false);
      return false;
    }
    setEventTypeError('');
    setIsValidEventType(true);
    return true;
  };

  const validateBookingDate = (date: Date | null) => {
    if (!date) {
      setBookingDateError('Booking date is required');
      setIsValidBookingDate(false);
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      setBookingDateError('Booking date cannot be in the past');
      setIsValidBookingDate(false);
      return false;
    }
    setBookingDateError('');
    setIsValidBookingDate(true);
    return true;
  };

  const validateTimeStart = (time: string) => {
    if (!time.trim()) {
      setTimeStartError('Start time is required');
      setIsValidTimeStart(false);
      return false;
    }
    setTimeStartError('');
    setIsValidTimeStart(true);
    return true;
  };

  const validateTimeEnd = (time: string) => {
    if (!time.trim()) {
      setTimeEndError('End time is required');
      setIsValidTimeEnd(false);
      return false;
    }
    setTimeEndError('');
    setIsValidTimeEnd(true);
    return true;
  };

  const validateAmount = (amt: string) => {
    const trimmedAmt = amt.trim();
    if (!trimmedAmt) {
      setAmountError('Amount is required');
      setIsValidAmount(false);
      return false;
    }
    const numAmount = parseFloat(trimmedAmt);
    if (isNaN(numAmount)) {
      setAmountError('Enter a valid amount');
      setIsValidAmount(false);
      return false;
    }
    if (numAmount < 1000) {
      setAmountError('Amount must be at least PKR 1,000');
      setIsValidAmount(false);
      return false;
    }
    if (numAmount > 10000000) {
      setAmountError('Amount cannot exceed PKR 10,000,000');
      setIsValidAmount(false);
      return false;
    }
    setAmountError('');
    setIsValidAmount(true);
    return true;
  };
  const validateGuestsCount = (count: string) => {
  const trimmedCount = count.trim();
  if (!trimmedCount) {
    setGuestsCountError('Guests count is required');
    setIsValidGuestsCount(false);
    return false;
  }
  const numCount = parseInt(trimmedCount);
  if (isNaN(numCount)) {
    setGuestsCountError('Enter a valid number');
    setIsValidGuestsCount(false);
    return false;
  }
  if (numCount < 1) {
    setGuestsCountError('At least 1 guest required');
    setIsValidGuestsCount(false);
    return false;
  }
  if (numCount > 10000) {
    setGuestsCountError('Guests count cannot exceed 10,000');
    setIsValidGuestsCount(false);
    return false;
  }
  setGuestsCountError('');
  setIsValidGuestsCount(true);
  return true;
};

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setBookingDate(selectedDate);
      const formattedDate = selectedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      setBookingDateText(formattedDate);
      validateBookingDate(selectedDate);
    }
  };

  const handleStartTimeSelect = (time: string) => {
    setTimeStart(time);
    setShowStartTimeModal(false);
    validateTimeStart(time);
  };

  const handleEndTimeSelect = (time: string) => {
    setTimeEnd(time);
    setShowEndTimeModal(false);
    validateTimeEnd(time);
  };

  const handleHallSelect = (hall: {id: string, name: string}) => {
  setSelectedHall(hall.name);
  setSelectedHallId(hall.id);  
  setShowHallModal(false);
  validateSelectedHall();
};
const handleSaveBooking = async () => {
  const isHallValid = validateSelectedHall();
  const isNameValid = validateCustomerName(customerName);
  const isPhoneValid = validateContactNumber(contactNumber);
  const isEventValid = validateEventType(eventType);
  const isDateValid = validateBookingDate(bookingDate);
  const isTimeStartValid = validateTimeStart(timeStart);
  const isTimeEndValid = validateTimeEnd(timeEnd);
  const isAmountValid = validateAmount(amount);
  const isGuestsValid = validateGuestsCount(guestsCount);

  if (!isHallValid || !isNameValid || !isPhoneValid || !isEventValid || 
      !isDateValid || !isTimeStartValid || !isTimeEndValid || !isAmountValid || !isGuestsValid) {
    Alert.alert('Error', 'Please fill all required fields correctly');
    return;
  }

  if (!userData?.uid) {
    Alert.alert('Error', 'Please login as manager first');
    return;
  }

  try {
    setIsSaving(true);
    const totalAmount = parseFloat(amount);
    const advanceRequired = Math.ceil(totalAmount * 0.30);
    const remainingBalance = totalAmount - advanceRequired;
    const adminCommission = Math.ceil(totalAmount * 0.05);
    const managerNetEarnings = totalAmount - adminCommission;
    let finalBookingStatus: string;
    let advancePaidAmount: number = 0;
    let paymentStatusDb: string;

    if (bookingStatus === 'confirmed') {
      finalBookingStatus = 'confirmed';
      advancePaidAmount = advanceRequired; // 30% auto-calculated
      paymentStatusDb = 'advance_paid';
    } else if (bookingStatus === 'completed') {
      finalBookingStatus = 'completed';
      advancePaidAmount = totalAmount; // Full payment
      paymentStatusDb = 'fully_paid';
    } else {
      // pending
      finalBookingStatus = 'pending';
      advancePaidAmount = 0;
      paymentStatusDb = 'unpaid';
    }
    const eventDate = bookingDate!.toISOString().split('T')[0];
    const timeSlot = `${timeStart} to ${timeEnd}`;
    const bookingData = {
      customerId: null,  
      customerName: customerName.trim(),
      customerPhone: contactNumber.trim(),
      customerEmail: null,
      hallId: selectedHallId,
      hallName: selectedHall,
      hallAddress: 'N/A',
      managerId: userData.uid,
      date: eventDate,
      timeSlot: timeSlot,
      guestsCount: parseInt(guestsCount.trim()),
      functionType: eventType.trim(),
      specialRequest: notes.trim(),
      status: finalBookingStatus,
      requestStatus: 'accepted',  
      totalAmount: totalAmount,
      advanceRequired: advanceRequired,
      remainingBalance: remainingBalance - advancePaidAmount + advanceRequired,
      advancePaid: advancePaidAmount,
      paymentStatus: paymentStatusDb,
      adminCommission: adminCommission,
      managerNetEarnings: managerNetEarnings,
      bookingCreatedAt: serverTimestamp(),
      source: 'offline',
    };

  const bookingRef = await addDoc(collection(db, 'bookings'), bookingData);
    console.log("Offline booking created:", bookingRef.id);

    Alert.alert(
      'Success',
      'Offline booking added successfully!',
      [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]
    );
  } catch (error: any) {
    console.error('Error saving offline booking:', error);
    Alert.alert('Error', error.message || 'Failed to save booking. Please try again.');
  } finally {
    setIsSaving(false);
  }
};

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
      {isLoading ? (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#5B21B6" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading halls...</Text>
      </View>
    ) : (
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scrollContent} >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Booking</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Select Hall <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity 
              style={[styles.hallButton, selectedHallError ? styles.inputError : isValidSelectedHall ? styles.inputSuccess : null]}
              onPress={() => setShowHallModal(true)}
            >
              <Text style={[styles.hallText, selectedHall ? styles.hallTextSelected : null]}>
                {selectedHall || 'Select a hall'}
              </Text>
              {isValidSelectedHall && selectedHall && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              )}
            </TouchableOpacity>
            {selectedHallError ? <Text style={styles.errorText}>{selectedHallError}</Text> : null}

            <Text style={styles.label}>Customer Name <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, customerNameError ? styles.inputError : isValidCustomerName ? styles.inputSuccess : null]}>
              <TextInput
                style={styles.input}
                placeholder="Enter customer name"
                placeholderTextColor="#9CA3AF"
                value={customerName}
                onChangeText={(text) => {
                  setCustomerName(text);
                  if (customerNameError || isValidCustomerName) validateCustomerName(text);
                }}
                onBlur={() => validateCustomerName(customerName)}
              />
              {isValidCustomerName && customerName && (
                <View style={styles.tickContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                </View>
              )}
            </View>
            {customerNameError ? <Text style={styles.errorText}>{customerNameError}</Text> : null}

            <Text style={styles.label}>Contact Number <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, contactNumberError ? styles.inputError : isValidContactNumber ? styles.inputSuccess : null]}>
              <TextInput
                style={styles.input}
                placeholder="e.g., 0300-1234567"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={contactNumber}
                onChangeText={(text) => {
                  setContactNumber(text);
                  if (contactNumberError || isValidContactNumber) validateContactNumber(text);
                }}
                onBlur={() => validateContactNumber(contactNumber)}
              />
              {isValidContactNumber && contactNumber && (
                <View style={styles.tickContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                </View>
              )}
            </View>
            {contactNumberError ? <Text style={styles.errorText}>{contactNumberError}</Text> : null}

            <Text style={styles.label}>Event Type <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, eventTypeError ? styles.inputError : isValidEventType ? styles.inputSuccess : null]}>
              <TextInput
                style={styles.input}
                placeholder="e.g., Wedding, Birthday, Engagement"
                placeholderTextColor="#9CA3AF"
                value={eventType}
                onChangeText={(text) => {
                  setEventType(text);
                  if (eventTypeError || isValidEventType) validateEventType(text);
                }}
                onBlur={() => validateEventType(eventType)}
              />
              {isValidEventType && eventType && (
                <View style={styles.tickContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                </View>
              )}
            </View>
            {eventTypeError ? <Text style={styles.errorText}>{eventTypeError}</Text> : null}

            <Text style={styles.label}>Booking Date <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity 
              style={[styles.dateButton, bookingDateError ? styles.inputError : isValidBookingDate ? styles.inputSuccess : null]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
              <Text style={[styles.dateText, bookingDateText ? styles.dateTextSelected : null]}>
                {bookingDateText || 'Select date'}
              </Text>
              {isValidBookingDate && bookingDateText && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              )}
            </TouchableOpacity>
            {bookingDateError ? <Text style={styles.errorText}>{bookingDateError}</Text> : null}

            {showDatePicker && (
              <DateTimePicker
                value={bookingDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            <Text style={styles.label}>Start Time <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, timeStartError ? styles.inputError : isValidTimeStart ? styles.inputSuccess : null]}>
              {/* <Ionicons name="time-outline" size={18} color="#9CA3AF" style={{ marginLeft: 12 }} /> */}
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="e.g., 6:00 PM"
                placeholderTextColor="#9CA3AF"
                value={timeStart}
                onChangeText={(text) => {
                  setTimeStart(text);
                  if (timeStartError || isValidTimeStart) validateTimeStart(text);
                }}
                onBlur={() => validateTimeStart(timeStart)}
              />
              <TouchableOpacity 
                style={styles.tickContainer}
                onPress={() => setShowStartTimeModal(true)}
              >
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {timeStartError ? <Text style={styles.errorText}>{timeStartError}</Text> : null}

            <Text style={styles.label}>End Time <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, timeEndError ? styles.inputError : isValidTimeEnd ? styles.inputSuccess : null]}>
              {/* <Ionicons name="time-outline" size={18} color="#9CA3AF" style={{ marginLeft: 12 }} /> */}
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="e.g., 10:00 PM"
                placeholderTextColor="#9CA3AF"
                value={timeEnd}
                onChangeText={(text) => {
                  setTimeEnd(text);
                  if (timeEndError || isValidTimeEnd) validateTimeEnd(text);
                }}
                onBlur={() => validateTimeEnd(timeEnd)}
              />
              <TouchableOpacity 
                style={styles.tickContainer}
                onPress={() => setShowEndTimeModal(true)}
              >
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {timeEndError ? <Text style={styles.errorText}>{timeEndError}</Text> : null}

            <Text style={styles.label}>Guests Count <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, guestsCountError ? styles.inputError : isValidGuestsCount ? styles.inputSuccess : null]}>
              <TextInput
                style={styles.input}
                placeholder="e.g., 200"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={guestsCount}
                onChangeText={(text) => {
                  setGuestsCount(text);
                  if (guestsCountError || isValidGuestsCount) validateGuestsCount(text);
                }}
                onBlur={() => validateGuestsCount(guestsCount)}
              />
              {isValidGuestsCount && guestsCount && (
                <View style={styles.tickContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                </View>
              )}
            </View>
            {guestsCountError ? <Text style={styles.errorText}>{guestsCountError}</Text> : null}
            <Text style={styles.label}>Amount (PKR) <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, amountError ? styles.inputError : isValidAmount ? styles.inputSuccess : null]}>
              <TextInput
                style={styles.input}
                placeholder="e.g., 50000"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  if (amountError || isValidAmount) validateAmount(text);
                }}
                onBlur={() => validateAmount(amount)}
              />
              {isValidAmount && amount && (
                <View style={styles.tickContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                </View>
              )}
            </View>
            {amountError ? <Text style={styles.errorText}>{amountError}</Text> : null}

            <Text style={styles.label}>Booking Status <Text style={styles.required}>*</Text></Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setBookingStatus('pending')}
              >
                <View style={[styles.radioCircle, bookingStatus === 'pending' && styles.radioCircleSelected]}>
                  {bookingStatus === 'pending' && <View style={styles.radioInnerCircle} />}
                </View>
                <Text style={[styles.radioText, bookingStatus === 'pending' && styles.radioTextSelected]}>
                  Pending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setBookingStatus('confirmed')}
              >
                <View style={[styles.radioCircle, bookingStatus === 'confirmed' && styles.radioCircleSelected]}>
                  {bookingStatus === 'confirmed' && <View style={styles.radioInnerCircle} />}
                </View>
                <Text style={[styles.radioText, bookingStatus === 'confirmed' && styles.radioTextSelected]}>
                  Confirmed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setBookingStatus('completed')}
              >
                <View style={[styles.radioCircle, bookingStatus === 'completed' && styles.radioCircleSelected]}>
                  {bookingStatus === 'completed' && <View style={styles.radioInnerCircle} />}
                </View>
                <Text style={[styles.radioText, bookingStatus === 'completed' && styles.radioTextSelected]}>
                  Completed
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Any additional notes about this booking"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity 
              style={[styles.saveButton, isSaving && { opacity: 0.6 }]} 
              onPress={handleSaveBooking}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Booking</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>

        <Modal visible={showHallModal} transparent animationType="fade">
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowHallModal(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Hall</Text>
              {halls.map((hall) => (
                <TouchableOpacity
                  key={hall.id}
                  style={styles.hallOption}
                  onPress={() => handleHallSelect(hall)}
                >
                  <Ionicons name="business-outline" size={20} color="#5B21B6" />
                  <Text style={styles.hallOptionText}>{hall.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => setShowHallModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showStartTimeModal} transparent animationType="fade">
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowStartTimeModal(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Start Time</Text>
              {startTimeOptions.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={styles.timeOption}
                  onPress={() => handleStartTimeSelect(time)}
                >
                  <Ionicons name="time-outline" size={20} color="#5B21B6" />
                  <Text style={styles.timeOptionText}>{time}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => setShowStartTimeModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showEndTimeModal} transparent animationType="fade">
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowEndTimeModal(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select End Time</Text>
              {endTimeOptions.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={styles.timeOption}
                  onPress={() => handleEndTimeSelect(time)}
                >
                  <Ionicons name="time-outline" size={20} color="#5B21B6" />
                  <Text style={styles.timeOptionText}>{time}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => setShowEndTimeModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { paddingHorizontal: 20 },
  hallName: { fontSize: 20, fontWeight: '700', color: '#2f1717', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 12, marginBottom: 8 },
  required: { color: '#EF4444' },
  hallButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#FFFFFF', gap: 10 },
  hallText: { flex: 1, fontSize: 14, color: '#9CA3AF' },
  hallTextSelected: { color: '#111827' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: '#FFFFFF' },
  input: { flex: 1, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#111827' },
  inputError: { borderColor: '#EF4444' },
  inputSuccess: { borderColor: '#10B981' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 5, marginLeft: 5 },
  tickContainer: { paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  dateButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#FFFFFF', gap: 10 },
  dateText: { flex: 1, fontSize: 14, color: '#9CA3AF' },
  dateTextSelected: { color: '#111827' },
  timeButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#FFFFFF', gap: 10 },
  timeText: { flex: 1, fontSize: 14, color: '#9CA3AF' },
  timeTextSelected: { color: '#111827' },
  radioContainer: { flexDirection: 'row', gap: 16, marginTop: 8, marginBottom: 16 },
  radioOption: { flexDirection: 'row', alignItems: 'center' },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  radioCircleSelected: { borderColor: '#5B21B6' },
  radioInnerCircle: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#5B21B6' },
  radioText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  radioTextSelected: { color: '#5B21B6', fontWeight: '600' },
  textArea: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#111827', height: 100, textAlignVertical: 'top', backgroundColor: '#FFFFFF' },
  saveButton: { backgroundColor: '#5B21B6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  cancelButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  cancelButtonText: { color: '#111827', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '85%', maxWidth: 350 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' },
  hallOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginBottom: 10, backgroundColor: '#FAFAFA', gap: 12 },
  hallOptionText: { fontSize: 15, color: '#111827', fontWeight: '600' },
  timeOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginBottom: 10, backgroundColor: '#FAFAFA', gap: 12 },
  timeOptionText: { fontSize: 15, color: '#111827', fontWeight: '600' },
  modalCancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  modalCancelText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
});