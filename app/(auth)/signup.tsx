// app/(auth)/signup.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '../../constants/webstyles';
import { useAuth, UserRole } from '../../backend/context/AuthContext'; 
import { signInWithEmailAndPassword } from 'firebase/auth'; 
import { doc, setDoc, Timestamp } from 'firebase/firestore'; 
import { auth,db } from '../../backend/config/firebaseConfig'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadToCloudinary } from '../../backend/services/cloudinaryServices';

export default function SignupScreen() {
  const params = useLocalSearchParams();
  const role = params.role as string || 'customer';
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [verificationDoc, setVerificationDoc] = useState<{uri: string, name: string} | null>(null);
  const [docError, setDocError] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const [isValidName, setIsValidName] = useState(false);
  const [isValidPhone, setIsValidPhone] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [isValidEmail, setIsValidEmail] = useState(false);
  const [isValidPassword, setIsValidPassword] = useState(false);
  const [isValidConfirmPassword, setIsValidConfirmPassword] = useState(false);
  const { signup } = useAuth();
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const doc = result.assets[0];
        setVerificationDoc({
          uri: doc.uri,
          name: doc.name,
        });
        setDocError('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };
  const handleRemoveDocument = () => {
    setVerificationDoc(null);
  };

  const validateName = (name: string) => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setNameError('Full name is required');
      setIsValidName(false);
      return false;
    }
    if (trimmedName.length < 3) {
      setNameError('Name must be at least 3 characters');
      setIsValidName(false);
      return false;
    }
    if (trimmedName.length > 50) {
      setNameError('Name must be less than 50 characters');
      setIsValidName(false);
      return false;
    }
    if (!/^[a-zA-Z.,\s]+$/.test(trimmedName)) {
      setNameError('Name can only contain letters, periods, commas, and spaces');
      setIsValidName(false);
      return false;
    }
    if (/\s{2,}/.test(trimmedName)) {
      setNameError('Name cannot have consecutive spaces');
      setIsValidName(false);
      return false;
    }
    setNameError('');
    setIsValidName(true);
    return true;
  };

  const validatePhone = (phone: string) => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setPhoneError('Phone number is required');
      setIsValidPhone(false);
      return false;
    }
    if (trimmedPhone.length < 10 || trimmedPhone.length > 15) {
      setPhoneError('Phone number must be 10-15 digits');
      setIsValidPhone(false);
      return false;
    }
    const cleanPhone = trimmedPhone.replace(/[\s\-\(\)]/g, '');
    if (!/^\+?[0-9]+$/.test(cleanPhone)) {
      setPhoneError('Phone number can only contain numbers');
      setIsValidPhone(false);
      return false;
    }
    if (/0{3,}/.test(cleanPhone.replace(/^\+?92/, ''))) {
      setPhoneError('Invalid phone number format');
      setIsValidPhone(false);
      return false;
    }
    const mobileRegex = /^(\+92|0)?3[0-4][0-9][0-9]{7}$/;
    const landlineRegex = /^(\+92|0)?(21|42|51|41|61|81|91|62|43|44|45|46|47|48|49|52|53|54|55|56|57|58|59|63|64|65|66|67|68|69|71|72|73|74|75|76|77|78|79|82|83|84|85|86|87|88|89|92|93|94|95|96|97|98|99)[0-9]{7}$/;
    const isMobile = mobileRegex.test(cleanPhone);
    const isLandline = landlineRegex.test(cleanPhone);
    
    if (!isMobile && !isLandline) {
      setPhoneError('Enter a valid number (Mobile: 03XX-XXXXXXX or Landline with area code)');
      setIsValidPhone(false);
      return false;
    }
    if (isMobile && cleanPhone.length !== 11 && cleanPhone.length !== 13) {
      setPhoneError('Mobile number must be 11 digits (03XX-XXXXXXX)');
      setIsValidPhone(false);
      return false;
    }
    if (isLandline && (cleanPhone.length < 10 || cleanPhone.length > 11)) {
      setPhoneError('Landline number must be 10-11 digits');
      setIsValidPhone(false);
      return false;
    }
    setPhoneError('');
    setIsValidPhone(true);
    return true;
  };
  const validateAddress = (addr: string) => {
    const trimmedAddr = addr.trim();    
    if (!trimmedAddr) {
      setAddressError('Address is required');
      setIsValidAddress(false);
      return false;
    }
    if (trimmedAddr.length < 15) {
      setAddressError('Please enter a complete address (at least 15 characters)');
      setIsValidAddress(false);
      return false;
    }
    if (trimmedAddr.length > 200) {
      setAddressError('Address is too long (maximum 200 characters)');
      setIsValidAddress(false);
      return false;
    }
    if (trimmedAddr.length < 30 && !trimmedAddr.includes(',')) {
      setAddressError('Please include area and city in the address (use comma to separate)');
      setIsValidAddress(false);
      return false;
    }
    if (/^\d[\d\s,\-#\/]+$/.test(trimmedAddr)) {
      setAddressError('Address must include street/area name, not just numbers');
      setIsValidAddress(false);
      return false;
    }
    if (/^[^a-zA-Z0-9]/.test(trimmedAddr)) {
      setAddressError('Address must start with a letter or number');
      setIsValidAddress(false);
      return false;
    }   
    setAddressError('');
    setIsValidAddress(true);
    return true;
  };

  const validateEmail = (email: string) => {
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail) {
      setEmailError('Email is required');
      setIsValidEmail(false);
      return false;
    }
    if (trimmedEmail.length > 100) {
      setEmailError('Email is too long');
      setIsValidEmail(false);
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Enter a valid email address (e.g., user@example.com)');
      setIsValidEmail(false);
      return false;
    }
    setEmailError('');
    setIsValidEmail(true); 
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Password is required');
      setIsValidPassword(false);
      return false;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      setIsValidPassword(false);
      return false;
    }
    if (password.length > 50) {
      setPasswordError('Password must be less than 50 characters');
      setIsValidPassword(false);
      return false;
    }
     if (/\s/.test(password)) { 
      setPasswordError('Password cannot contain spaces');
      setIsValidPassword(false);
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setPasswordError('Password must contain at least one uppercase letter');
      setIsValidPassword(false);
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setPasswordError('Password must contain at least one lowercase letter');
      setIsValidPassword(false);
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setPasswordError('Password must contain at least one number');
      setIsValidPassword(false);
      return false;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setPasswordError('Password must contain at least one special character');
      setIsValidPassword(false);
      return false;
    }
    setPasswordError('');
    setIsValidPassword(true); 
    return true;
  };

  const validateConfirmPassword = (confirmPassword: string) => {
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      setIsValidConfirmPassword(false);
      return false;
    }
    if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match');
      setIsValidConfirmPassword(false);
      return false;
    }
    setConfirmPasswordError('');
    setIsValidConfirmPassword(true); 
    return true;
  };

  const validateDocument = () => {
    if (!verificationDoc) {
      setDocError('Verification document is required for managers');
      return false;
    }
    setDocError('');
    return true;
  };
  const handleContinue = async () => {
    const isNameValid = validateName(fullName);
    const isPhoneValid = validatePhone(phone);
    const isAddressValid = validateAddress(address);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);
    const isDocValid = role === 'manager' ? validateDocument() : true;

    if (!isNameValid || !isPhoneValid || !isAddressValid || !isEmailValid || 
        !isPasswordValid || !isConfirmPasswordValid || !isDocValid) {
      Alert.alert('Error', 'Please fill all required fields correctly');
      return;
    }
    setIsSigningUp(true);    
    try {
      const uid = await signup(
        email, 
        password, 
        fullName, 
        role as UserRole,
        phone, 
        address, 
        verificationDoc ? verificationDoc.name : ''
      );
      if (role === 'manager' && uid && verificationDoc) {
        try {
          const isPdf = verificationDoc.name.toLowerCase().endsWith('.pdf');
          const result = await uploadToCloudinary(
            verificationDoc.uri, 
            verificationDoc.name, 
            isPdf ? 'raw' : 'image'
          );
          await setDoc(doc(db, 'users', uid), {
            verificationDoc: result.url,
            verificationDocPublicId: result.publicId,
          }, { merge: true });
        } catch (uploadError) {
          console.error('Document upload failed:', uploadError);
        }
      }
    //   if (role === 'manager') { 
    //     Alert.alert(
    //       'Submission Successful',
    //       'Your document is under review. Admin will approve your account within 24-48 hours. Please login after approval.',
    //       [
    //         {
    //           text: 'OK',
    //           onPress: () => {
    //             router.replace('/(auth)/login');
    //           }
    //         }
    //       ]
    //     );
    //  } 
       if (role === 'manager') { 
        if (uid) {
        try {
          await addDoc(collection(db, 'notifications'), {
            type: 'Users',
            title: 'New Manager Registration',
            message: `${fullName} has registered as a new manager and is awaiting approval.`,
            managerId: uid, 
            managerName: fullName,
            managerEmail: email,
            status: 'unread',
            timestamp: serverTimestamp(),
            action: 'managers',
            targetRole: 'admin',
            createdAt: new Date().toISOString(),
          });
        } catch (notifError) {
          console.error("Notification save error:", notifError);
        }
      }
        Alert.alert(
          'Submission Successful',
          'Your document is under review. Admin will approve your account within 24-48 hours. Please login after approval.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        );
      } else {
        const API_URL = 'https://bondless-python-floral.ngrok-free.dev/api/send-otp';
        // const API_URL = 'http://192.168.1.22:8001/api/send-otp';         
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email }),
        });        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || 'Failed to send OTP email');
        }
        let uid = auth.currentUser?.uid;
        if (!uid) {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          uid = userCredential.user.uid;
        }      
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5);
        
        await setDoc(doc(db, 'otps', uid), {
          otp: data.otp,
          expiresAt: Timestamp.fromDate(expiresAt),
          createdAt: Timestamp.now()
        });        
        router.replace({
          pathname: '/(auth)/verify-code', 
          params: { email: email }
        });
      }
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSigningUp(false);
    }
  };

//  const handleContinue = () => {
//   const isNameValid = validateName(fullName);
//   const isPhoneValid = validatePhone(phone);
//   const isAddressValid = validateAddress(address);
//   const isEmailValid = validateEmail(email);
//   const isPasswordValid = validatePassword(password);
//   const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);
//   const isDocValid = role === 'manager' ? validateDocument() : true;

//   if (!isNameValid || !isPhoneValid || !isAddressValid || !isEmailValid || 
//       !isPasswordValid || !isConfirmPasswordValid || !isDocValid) {
//     Alert.alert('Error', 'Please fill all required fields correctly');
//     return;
//   }
//   if (role === 'manager') { 
//     Alert.alert(
//       'Success',
//       'Manager account created! Your document is under review. Admin will approve your account within 24-48 hours.',
//       [
//         {
//           text: 'OK',
//           onPress: () => router.push('/(managerapp)/home')
//         }
//       ]
//     );
//   } else {
//     router.push({
//       pathname: '/(auth)/verify-code',
//       params: { email: email }
//     });
//   }
// };
  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
      <View style={[styles.inputWrapper, nameError ? styles.inputError : isValidName ? styles.inputSuccess : null]}>
        <TextInput 
          style={styles.input}
          placeholder="Enter your full name" 
          placeholderTextColor="#9CA3AF"
          value={fullName}
          multiline={false}           
          numberOfLines={1} 
          editable={!isSigningUp}
          onChangeText={(text) => {
            setFullName(text);
            if (nameError || isValidName) validateName(text);
          }}
          onBlur={() => validateName(fullName)}/>
        {isValidName && fullName && (
          <View style={styles.tickContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        )}
      </View>
      {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

      <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
      <View style={[styles.inputWrapper, phoneError ? styles.inputError : isValidPhone ? styles.inputSuccess : null]}>
        <TextInput 
          style={styles.input}
          placeholder="e.g., 0300-1234567" 
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
          value={phone}
          multiline={false}           
          numberOfLines={1}
          editable={!isSigningUp} 
          onChangeText={(text) => {
            setPhone(text);
            if (phoneError || isValidPhone) validatePhone(text);
          }}
          onBlur={() => validatePhone(phone)} />
        {isValidPhone && phone && (
          <View style={styles.tickContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        )}
      </View>
      {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

      <Text style={styles.label}>Address <Text style={styles.required}>*</Text></Text>
      <View style={[styles.inputWrapper, addressError ? styles.inputError : isValidAddress ? styles.inputSuccess : null]}>
        <TextInput 
          style={styles.input}
          placeholder="e.g., House 123, Wapda Town, Lahore" 
          placeholderTextColor="#9CA3AF"
          value={address}
          multiline={false}           
          numberOfLines={1}  
          editable={!isSigningUp}
          onChangeText={(text) => {
            setAddress(text);
            if (addressError || isValidAddress) validateAddress(text);
          }}
          onBlur={() => validateAddress(address)} />
        {isValidAddress && address && (
          <View style={styles.tickContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        )}
      </View>
      {addressError ? <Text style={styles.errorText}>{addressError}</Text> : null}

      <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
      <View style={[styles.inputWrapper, emailError ? styles.inputError : isValidEmail ? styles.inputSuccess : null]}>
        <TextInput 
          style={styles.input}
          placeholder="Enter your email address" 
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          multiline={false}           
          numberOfLines={1} 
          editable={!isSigningUp}   
          onChangeText={(text) => {
            setEmail(text);
            if (emailError || isValidEmail) validateEmail(text);
          }}
          onBlur={() => validateEmail(email)} />
        {isValidEmail && email && (
          <View style={styles.tickContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        )}
      </View>
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

      {role === 'manager' && (
        <View style={styles.label}>
          <Text style={styles.label}>
            Verification Document <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.docHint}>
            Upload Letter Head, Business Registration, CNIC, or Property Documents
          </Text>       
          <TouchableOpacity 
            style={[styles.docUploadBox, verificationDoc && styles.docUploadSuccess]}
            onPress={handlePickDocument}
            disabled={isSigningUp} >
            {verificationDoc ? (
              <View style={styles.docInfo}>
                <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                <View style={styles.docDetails}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {verificationDoc.name}
                  </Text>
                  <Text style={styles.docStatus}>Document uploaded</Text>
                </View>
                <TouchableOpacity 
                  onPress={(e) => {
                    if (e && e.stopPropagation) e.stopPropagation();
                    handleRemoveDocument(); }} 
                      disabled={isSigningUp}
                    >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
                <Text style={styles.docUploadText}>Upload Document</Text>
                <Text style={styles.docUploadHint}>PDF or Image (Max 5MB)</Text>
              </>
            )}
          </TouchableOpacity>
          {docError ? <Text style={styles.errorText}>{docError}</Text> : null}
        </View>
      )}

      <Text style={styles.label}>Create Password <Text style={styles.required}>*</Text></Text>
      <View style={[styles.passwordWrapper, passwordError ? styles.inputError : isValidPassword ? styles.inputSuccess : null]}>
        <TextInput 
          style={styles.input}
          placeholder="Enter password" 
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showPassword}
          value={password}
          multiline={false}           
          numberOfLines={1} 
          editable={!isSigningUp}
          onChangeText={(text) => {
            setPassword(text);
            if (passwordError || isValidPassword) validatePassword(text);
          }}
          onBlur={() => validatePassword(password)} />
        {isValidPassword && password && (
          <View style={styles.tickContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        )}
        <TouchableOpacity 
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)} >
          <Ionicons 
            name={showPassword ? 'eye' : 'eye-off'} 
            size={20} 
            color="#6B7280" />
        </TouchableOpacity>
      </View>
      {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

      <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
      <View style={[styles.passwordWrapper, confirmPasswordError ? styles.inputError : isValidConfirmPassword ? styles.inputSuccess : null]}>
        <TextInput 
          style={styles.input}
          placeholder="Confirm your password" 
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          multiline={false}
          numberOfLines={1}
          editable={!isSigningUp}
          onChangeText={(text) => {
            setConfirmPassword(text);
            if (confirmPasswordError || isValidConfirmPassword) validateConfirmPassword(text);
          }}
          onBlur={() => validateConfirmPassword(confirmPassword)} />
        {isValidConfirmPassword && confirmPassword && (
          <View style={styles.tickContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        )}
        <TouchableOpacity 
          style={styles.eyeButton}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)} >
          <Ionicons 
            name={showConfirmPassword ? 'eye' : 'eye-off'} 
            size={20} 
            color="#6B7280" />
        </TouchableOpacity>
      </View>
      {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

      {/* <TouchableOpacity 
        style={styles.continueButton}
        onPress={handleContinue} >
        <Text style={styles.continueButtonText}>
          {role === 'manager' ? 'Submit for Approval' : 'Continue'}
        </Text>
      </TouchableOpacity> */}
      <TouchableOpacity 
        style={[styles.continueButton, isSigningUp && { opacity: 0.7 }]} 
        onPress={handleContinue}
        disabled={isSigningUp} 
      >
        {isSigningUp ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.continueButtonText}>
            {role === 'manager' ? 'Submit for Approval' : 'Continue'}
          </Text>
        )}
      </TouchableOpacity>

      {role === 'manager' && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#5B21B6" />
          <Text style={styles.infoText}>
            Your account will be reviewed by admin. You'll receive a confirmation within 24-48 hours.
          </Text>
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 8 },
  backButton: { marginBottom: 5, width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 14, marginBottom: 8 },
  required: { color: '#EF4444' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: '#FFFFFF' },
  inputSuccess: { borderColor: '#10B981' },
  input: { flex: 1, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#111827' },
  inputError: { borderColor: '#EF4444' },
  tickContainer: { paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: '#FFFFFF' },
  eyeButton: { paddingHorizontal: 15, justifyContent: 'center', height: 44, alignItems: 'center' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 5, marginLeft: 5 },
  docHint: { fontSize: 12, color: '#6B7280', marginBottom: 12, lineHeight: 16 },
  docUploadBox: { borderWidth: 1.5, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 12, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' },
  docUploadSuccess: { borderStyle: 'solid', borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  docUploadText: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 8 },
  docUploadHint: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  docInfo: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 12 },
  docDetails: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  docStatus: { fontSize: 12, color: '#10B981', fontWeight: '500' },
  continueButton: { backgroundColor: '#2d1c99', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', padding: 16, borderRadius: 12, marginTop: 20, gap: 12 },
  infoText: { flex: 1, fontSize: 13, color: '#5B21B6', lineHeight: 18 },
});