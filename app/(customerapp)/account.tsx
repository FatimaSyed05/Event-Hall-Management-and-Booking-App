// app/(customerapp)/account.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import CustomerBottomNav from '../../components/customer-bottom-nav';
import { webContainerStyle } from '../../constants/webstyles';
import { useAuth } from '../../backend/context/AuthContext'; 
import { uploadToCloudinary } from '@/backend/services/cloudinaryServices'; // ✅ Added Import
import { db } from '@/backend/config/firebaseConfig';
import { deleteDoc, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

export default function CustomerAccount() {
  const [showMenu, setShowMenu] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false); 
  const [currentField, setCurrentField] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [tempValue, setTempValue] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [isValidField, setIsValidField] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false); 
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false); // ✅ Added State
  
  const { userData, updateProfile, logout } = useAuth(); 
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingNewEmail, setPendingNewEmail] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  
  const [customerData, setCustomerData] = useState({
    name: userData?.name || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    address: userData?.address || '',
  });

  useEffect(() => {
    if (userData) {
      setCustomerData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.address || '',
      });
      // ✅ Load profile photo from global state
      if (userData.profilePhoto) {
        setProfilePhoto(userData.profilePhoto);
      }
    }
  }, [userData]);

  const fieldConfig: Record<string, { label: string; placeholder: string; icon: string }> = {
    name: { label: 'Full Name', placeholder: 'Enter your full name', icon: 'person-outline' },
    email: { label: 'Email Address', placeholder: 'Enter email address', icon: 'mail-outline' },
    phone: { label: 'Phone Number', placeholder: 'Enter phone number', icon: 'call-outline' },
    address: { label: 'Address', placeholder: 'Enter address', icon: 'location-outline' },
  };
  
  const validateName = (name: string): boolean => {
    const trimmedName = name.trim();
    if (!trimmedName) { setFieldError('Full name is required'); setIsValidField(false); return false; }
    if (trimmedName.length < 3) { setFieldError('Name must be at least 3 characters'); setIsValidField(false); return false; }
    if (trimmedName.length > 50) { setFieldError('Name must be less than 50 characters'); setIsValidField(false); return false; }
    if (!/^[a-zA-Z.,\s]+$/.test(trimmedName)) { setFieldError('Name can only contain letters, periods and spaces'); setIsValidField(false); return false; }
    if (/\s{2,}/.test(trimmedName)) { setFieldError('Name cannot have consecutive spaces'); setIsValidField(false); return false; }
    setFieldError(''); setIsValidField(true); return true;
  };

  const validateEmail = (email: string): boolean => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { setFieldError('Email is required'); setIsValidField(false); return false; }
    if (trimmedEmail.length > 100) { setFieldError('Email is too long'); setIsValidField(false); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) { setFieldError('Enter a valid email address (e.g., user@example.com)'); setIsValidField(false); return false; }
    setFieldError(''); setIsValidField(true); return true;
  };

  const validatePhone = (phone: string): boolean => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) { setFieldError('Phone number is required'); setIsValidField(false); return false; }
    if (trimmedPhone.length < 10 || trimmedPhone.length > 15) { setFieldError('Phone number must be 10-15 digits'); setIsValidField(false); return false; }
    const cleanPhone = trimmedPhone.replace(/[\s\-\(\)]/g, '');
    if (!/^\+?[0-9]+$/.test(cleanPhone)) { setFieldError('Phone number can only contain numbers'); setIsValidField(false); return false; }
    if (/0{3,}/.test(cleanPhone.replace(/^\+?92/, ''))) { setFieldError('Invalid phone number format'); setIsValidField(false); return false; }
    const mobileRegex = /^(\+92|0)?3[0-4][0-9][0-9]{7}$/;
    const landlineRegex = /^(\+92|0)?(21|42|51|41|61|81|91|62|43|44|45|46|47|48|49|52|53|54|55|56|57|58|59|63|64|65|66|67|68|69|71|72|73|74|75|76|77|78|79|82|83|84|85|86|87|88|89|92|93|94|95|96|97|98|99)[0-9]{7}$/;
    const isMobile = mobileRegex.test(cleanPhone);
    const isLandline = landlineRegex.test(cleanPhone);
    if (!isMobile && !isLandline) { setFieldError('Enter a valid number (Mobile: 03XX-XXXXXXX or Landline with area code)'); setIsValidField(false); return false; }
    if (isMobile && cleanPhone.length !== 11 && cleanPhone.length !== 13) { setFieldError('Mobile number must be 11 digits (03XX-XXXXXXX)'); setIsValidField(false); return false; }
    if (isLandline && (cleanPhone.length < 10 || cleanPhone.length > 11)) { setFieldError('Landline number must be 10-11 digits'); setIsValidField(false); return false; }
    setFieldError(''); setIsValidField(true); return true;
  };

  const validateAddress = (addr: string): boolean => {
    const trimmedAddr = addr.trim();
    if (!trimmedAddr) { setFieldError('Address is required'); setIsValidField(false); return false; }
    if (trimmedAddr.length < 15) { setFieldError('Please enter a complete address (at least 15 characters)'); setIsValidField(false); return false; }
    if (trimmedAddr.length > 200) { setFieldError('Address is too long (maximum 200 characters)'); setIsValidField(false); return false; }
    if (trimmedAddr.length < 30 && !trimmedAddr.includes(',')) { setFieldError('Please include area and city in the address (use comma to separate)'); setIsValidField(false); return false; }
    if (/^\d[\d\s,\-#\/]+$/.test(trimmedAddr)) { setFieldError('Address must include street/area name, not just numbers'); setIsValidField(false); return false; }
    if (/^[^a-zA-Z0-9]/.test(trimmedAddr)) { setFieldError('Address must start with a letter or number'); setIsValidField(false); return false; }
    setFieldError(''); setIsValidField(true); return true;
  };

  const validateField = (field: string, value: string): boolean => {
    switch (field) {
      case 'name': return validateName(value);
      case 'email': return validateEmail(value);
      case 'phone': return validatePhone(value);
      case 'address': return validateAddress(value);
      default: return true;
    }
  };

  const openEditModal = (field: string) => {
    setCurrentField(field);
    setTempValue(customerData[field as keyof typeof customerData] as string);
    setFieldValue(customerData[field as keyof typeof customerData] as string);
    setFieldError('');
    setIsValidField(false);
    setIsVerifying(false);        
    setPendingNewEmail('');
    setVerificationCode('');
    setCodeError('');
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    const isValid = validateField(currentField, tempValue);
    if (!isValid) return;
    if (currentField === 'email' && !isVerifying) {
      setIsSendingCode(true);
      try {
        const API_URL = 'https://bondless-python-floral.ngrok-free.dev/api/send-otp';
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: tempValue }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || 'Failed to send verification code');
        }
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5);
        await setDoc(doc(db, 'otps', `emailChange_${tempValue}`), {
          email: tempValue,
          otp: data.otp,
          expiresAt: Timestamp.fromDate(expiresAt),
          createdAt: Timestamp.now()
        });
        setPendingNewEmail(tempValue);
        setIsVerifying(true);
        setVerificationCode('');
        setCodeError('');
        Alert.alert('Code Sent', `Verification code sent to ${tempValue}`);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to send code');
      } finally {
        setIsSendingCode(false);
      }
      return;
    }
    setIsUpdating(true);
    try {
      await updateProfile({ [currentField]: tempValue });
      setCustomerData({ ...customerData, [currentField]: tempValue });
      setEditModalVisible(false);
      Alert.alert('Success', `${fieldConfig[currentField].label} updated successfully`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setTempValue(fieldValue);
    setFieldError('');
    setIsValidField(false);
    setEditModalVisible(false);
  };

  const handleInputChange = (value: string) => {
    setTempValue(value);
    if (value.trim()) {
      validateField(currentField, value);
    } else {
      setFieldError('');
      setIsValidField(false);
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    if (!userData?.uid) {
      Alert.alert('Error', 'User data not loaded. Please wait a moment and try again.');
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const fileName = `profile_customer_${userData.uid}_${Date.now()}.jpg`;
      const result = await uploadToCloudinary(uri, fileName, 'image');
      
      await updateProfile({
        profilePhoto: result.url,
        profilePhotoPublicId: result.publicId,
      });

      setProfilePhoto(result.url);
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (error: any) {
      console.error('Photo upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const openCamera = async () => {
    setPhotoPickerVisible(false);
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      await uploadProfilePhoto(result.assets[0].uri);  
    }
  };

  const openGallery = async () => {
    setPhotoPickerVisible(false);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow gallery access');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      await uploadProfilePhoto(result.assets[0].uri);  
    }
  };

  const pickProfilePhoto = () => {
    if (!isUploadingPhoto) {
      setPhotoPickerVisible(true);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout(); 
              router.replace('/(auth)/login'); 
            } catch (error) {
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          }
        }
      ]
    );
  };

  const verifyCode = async (): Promise<boolean> => {
    if (verificationCode.length !== 4) {
      setCodeError('Please enter the 4-digit code');
      return false;
    }
    try {
      const otpDoc = await getDoc(doc(db, 'otps', `emailChange_${pendingNewEmail}`));
      if (!otpDoc.exists()) {
        setCodeError('Code not found. Please press Send Code again.');
        return false;
      }
      const data = otpDoc.data();
      const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : null;
      if (expiresAt && expiresAt < new Date()) {
        setCodeError('Code expired. Please resend a new code.');
        return false;
      }
      if (String(data.otp) !== verificationCode) {
        setCodeError('Invalid code. Please try again.');
        return false;
      }
      await deleteDoc(doc(db, 'otps', `emailChange_${pendingNewEmail}`));
      setCodeError('');
      return true;
    } catch (error) {
      console.error('Verify error:', error);
      setCodeError('Verification failed. Please try again.');
      return false;
    }
  };

  const handleSaveWithVerification = async () => {
    const isValid = await verifyCode();
    if (isValid) {
      await handleSave();
    }
  };

  const resendCode = async () => {
    setIsSendingCode(true);
    try {
      const API_URL = 'https://bondless-python-floral.ngrok-free.dev/api/send-otp';
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingNewEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);
      await setDoc(doc(db, 'otps', `emailChange_${pendingNewEmail}`), {
        email: pendingNewEmail,
        otp: data.otp,
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: Timestamp.now()
      });
      Alert.alert('Success', 'New code sent!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSendingCode(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push('/(customerapp)/home')}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Account</Text>
            <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
              <Ionicons name="ellipsis-vertical" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={48} color="#FFFFFF" />
                )}
              </View>
              <TouchableOpacity 
                style={styles.cameraIcon}
                onPress={pickProfilePhoto}
                activeOpacity={0.7}
                disabled={isUploadingPhoto} 
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName}>{customerData.name}</Text>
          </View>
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.infoRow} onPress={() => openEditModal('name')} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.rowIcon} />
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>Full Name</Text>
                <Text style={styles.rowValue}>{customerData.name}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.infoRow} onPress={() => openEditModal('email')} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.rowIcon} />
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>Email Address</Text>
                <Text style={styles.rowValue}>{customerData.email}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.infoRow} onPress={() => openEditModal('phone')} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Ionicons name="call-outline" size={20} color="#6B7280" style={styles.rowIcon} />
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>Phone Number</Text>
                <Text style={styles.rowValue}>{customerData.phone}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.infoRow} onPress={() => openEditModal('address')} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Ionicons name="location-outline" size={20} color="#6B7280" style={styles.rowIcon} />
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>Address</Text>
                <Text style={styles.rowValue} numberOfLines={1}>{customerData.address}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
          <View style={styles.divider} />
        </ScrollView>
        <CustomerBottomNav />

        <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); router.push('/(customerapp)/settings'); }}>
                <Ionicons name="settings-outline" size={20} color="#111827" />
                <Text style={styles.menuText}>Settings</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); router.push('/(auth)/change-password'); }}>
                <Ionicons name="lock-closed-outline" size={20} color="#111827" />
                <Text style={styles.menuText}>Change Password</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); handleLogout(); }}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.menuTextDestructive}>Logout</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={photoPickerVisible} transparent animationType="slide" onRequestClose={() => setPhotoPickerVisible(false)}>
          <TouchableOpacity style={styles.photoPickerOverlay} activeOpacity={1} onPress={() => setPhotoPickerVisible(false)}>
            <View style={styles.photoPickerContent}>
              <TouchableOpacity style={styles.photoOption} onPress={openCamera}>
                <Text style={styles.photoOptionText}>Take photo</Text>
              </TouchableOpacity>
              <View style={styles.photoPickerDivider} />
              <TouchableOpacity style={styles.photoOption} onPress={openGallery}>
                <Text style={styles.photoOptionText}>Select from album</Text>
              </TouchableOpacity>
              <View style={styles.photoPickerDivider} />
              <TouchableOpacity style={styles.photoPickerCancel} onPress={() => setPhotoPickerVisible(false)}>
                <Text style={styles.photoPickerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
          <View style={styles.bottomSheetOverlay}>
            <View style={styles.bottomSheetContent}>
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>{fieldConfig[currentField]?.label || 'Edit'}</Text>
                <TouchableOpacity onPress={handleCancel}>
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Enter value</Text>
                <View style={[styles.inputWrapper, fieldError ? styles.inputError : isValidField ? styles.inputSuccess : null]}>
                  <TextInput
                    style={styles.input}
                    value={tempValue}
                    onChangeText={handleInputChange}
                    placeholder={fieldConfig[currentField]?.placeholder || 'Enter value'}
                    placeholderTextColor="#9CA3AF"
                    autoFocus
                    multiline={currentField === 'address'}
                    numberOfLines={currentField === 'address' ? 3 : 1}
                  />
                  {isValidField && tempValue ? (
                    <View style={styles.tickContainer}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                  ) : null}
                </View>
                {fieldError ? <Text style={styles.errorText}>{fieldError}</Text> : null}
              </View>

              {currentField === 'email' && isVerifying && (
                <View style={styles.verificationContainer}>
                  <Text style={styles.inputLabel}>Verification Code</Text>
                  <Text style={styles.verificationHint}>
                    Enter a 4 digit code that We have sent to {pendingNewEmail}
                  </Text>
                  <View style={[styles.inputWrapper, codeError ? styles.inputError : null]}>
                    <TextInput
                      style={styles.input}
                      value={verificationCode}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
                        setVerificationCode(cleaned);
                        if (codeError) setCodeError('');
                      }}
                      placeholder="Enter 4-digit code"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      maxLength={4}
                      autoFocus
                    />
                  </View>
                  {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}
                  <TouchableOpacity onPress={resendCode} disabled={isSendingCode}>
                    <Text style={styles.resendText}>
                      {isSendingCode ? 'Sending...' : 'Resend code'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.button, 
                    styles.confirmButton,
                    (currentField === 'email' && isVerifying
                      ? (verificationCode.length !== 4 || isUpdating)
                      : (!isValidField || isUpdating || isSendingCode)
                    ) && styles.confirmButtonDisabled
                  ]}
                  onPress={currentField === 'email' && isVerifying ? handleSaveWithVerification : handleSave}
                  disabled={
                    currentField === 'email' && isVerifying
                      ? (verificationCode.length !== 4 || isUpdating)
                      : (!isValidField || isUpdating || isSendingCode)
                  }
                >
                  {isUpdating || isSendingCode ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={[
                      styles.confirmButtonText,
                      (currentField === 'email' && isVerifying
                        ? (verificationCode.length !== 4)
                        : (!isValidField)
                      ) && styles.confirmButtonTextDisabled
                    ]}>
                      {currentField === 'email' && isVerifying ? 'Verify & Save' : 
                      currentField === 'email' ? 'Send Code' : 'Confirm'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#111827' },
  menuButton: { padding: 8, borderRadius: 8 },
  profileSection: { alignItems: 'center', paddingVertical: 24 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#5B21B6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#5B21B6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 12 },
  rowIcon: { marginTop: 2 },
  rowTextContainer: { flex: 1 },
  rowLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: '500' },
  rowValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 20 },
  menuContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, width: 220, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, overflow: 'hidden', paddingVertical: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, gap: 12 },
  menuText: { fontSize: 15, color: '#111827', fontWeight: '500' },
  menuTextDestructive: { fontSize: 15, color: '#EF4444', fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheetContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  bottomSheetTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  inputContainer: { marginBottom: 24 },
  inputLabel: { fontSize: 12, color: '#6B7280', marginBottom: 8, fontWeight: '500' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, backgroundColor: '#FFFFFF' },
  inputError: { borderColor: '#EF4444' },
  inputSuccess: { borderColor: '#10B981' },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111827', minHeight: 50 },
  tickContainer: { paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 5, marginLeft: 5 },
  buttonContainer: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: '#F3F4F6' },
  confirmButton: { backgroundColor: '#5B21B6' },
  confirmButtonDisabled: { backgroundColor: '#D1D5DB' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  confirmButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  confirmButtonTextDisabled: { color: '#9CA3AF' },
  photoPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  photoPickerContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 30, paddingTop: 10 },
  photoOption: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  photoOptionText: { fontSize: 16, color: '#5B21B6', fontWeight: '500' },
  photoPickerDivider: { height: 1, backgroundColor: '#F0F0F0' },
  photoPickerCancel: { marginTop: 8, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  photoPickerCancelText: { fontSize: 16, color: '#EF4444', fontWeight: '500' },
  verificationContainer: { marginBottom: 24, paddingTop: 8 },
  verificationHint: { fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 18 },
  resendText: { fontSize: 13, color: '#5B21B6', fontWeight: '600', marginTop: 8, textAlign: 'right' }
});