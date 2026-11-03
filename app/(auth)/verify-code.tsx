// app/(auth)/verify-code.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '../../constants/webstyles';
import { useAuth } from '../../backend/context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

export default function VerifyCodeScreen() {
  const params = useLocalSearchParams();
  const email = params.email as string;

  const { verifyOtp } = useAuth();
  const [uid, setUid] = useState<string | null>(null);

  const [code, setCode] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false); 
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const fetchUid = async () => {
      if (!email) return;
      try {
        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          setUid(querySnapshot.docs[0].id);
        } else {
          Alert.alert('Error', 'User not found. Please sign up again.');
          router.replace('/(auth)/signup');
        }
      } catch (err) {
        console.error('Error fetching UID:', err);
      }
    };
    fetchUid();
  }, [email]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) {
      const digits = value.split('').filter(char => /\d/.test(char)).slice(0, 4);
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (i < 4) newCode[i] = digit;
      });
      setCode(newCode);
 
      const lastFilledIndex = Math.min(digits.length, 3);
      inputRefs.current[lastFilledIndex]?.focus();
    } else if (/^\d$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      if (index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (value === '') {
      const newCode = [...code];
      newCode[index] = '';
      setCode(newCode);
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && code[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  // const handleVerify = () => {
  //   const verificationCode = code.join('');
    
  //   if (verificationCode.length !== 4) {
  //     Alert.alert('Error', 'Please enter complete 4-digit code');
  //     return;
  //   }
  //   setShowSuccess(true); 
  //   setTimeout(() => {
  //     router.replace('/(customerapp)/home'); 
  //   }, 2000);
  // };
    const handleVerify = async () => {
    const verificationCode = code.join('');    
    if (verificationCode.length !== 4) {
      Alert.alert('Error', 'Please enter complete 4-digit code');
      return;
    }
    if (!uid) {
      Alert.alert('Error', 'User data not found. Please try again.');
      return;
    }
    setIsVerifying(true);
    try {
      await verifyOtp(uid, verificationCode);      
      router.replace('/(customerapp)/home') 
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message);
      setCode(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = () => {
    if (!canResend) return; 
    Alert.alert('Code Sent', 'New verification code sent to your email');
    setTimer(60);
    setCanResend(false);
    setCode(['', '', '', '']);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
    <View style={styles.container}>
      {showSuccess && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          <Text style={styles.successText}>Successfully Verified!</Text>
        </View>
      )}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>
      <View style={styles.iconContainer}>
        <Ionicons name="mail-outline" size={60} color="#5B21B6" />
      </View>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>
        Enter the 4-digit code we've sent to
      </Text>
      <Text style={styles.email}>{email}</Text>
      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { inputRefs.current[index] = ref; }}
            style={styles.codeInput}
            value={digit}
            onChangeText={(value) => handleCodeChange(value, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>
      {/* <TouchableOpacity 
        style={styles.verifyButton}
        onPress={handleVerify}
        disabled={showSuccess} >
        <Text style={styles.verifyButtonText}>Verify</Text>
      </TouchableOpacity> */}

       <TouchableOpacity 
          style={[styles.verifyButton, isVerifying && { opacity: 0.7 }]}
          onPress={handleVerify}
          disabled={isVerifying} 
        >
          {isVerifying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>
        
      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn't receive code?</Text>
        <TouchableOpacity 
          onPress={handleResend}
          disabled={!canResend || showSuccess} >
          <Text style={[
            styles.resendButton,
            (!canResend || showSuccess) && styles.resendButtonDisabled
          ]}>
            {canResend ? 'Resend Code' : `Resend in ${timer}s`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 60 },
  successBanner: { position: 'absolute', top: 60, left: 24, right: 24, backgroundColor: '#10B981', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 1000, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  successText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  backButton: { width: 40, height: 40, justifyContent: 'center', marginBottom: 20 },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 4 },
  email: { fontSize: 14, fontWeight: '600', color: '#5B21B6', textAlign: 'center', marginBottom: 32 },
  codeContainer: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 32 },
  codeInput: { width: 56, height: 64, borderWidth: 2, borderColor: '#D1D5DB', borderRadius: 12, fontSize: 28, fontWeight: '700', color: '#111827', textAlign: 'center', backgroundColor: '#F9FAFB' },
  verifyButton: { backgroundColor: '#5B21B6', paddingVertical: 14, paddingHorizontal: 80, borderRadius: 12, alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
  verifyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  resendContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  resendText: { fontSize: 14, color: '#6B7280' },
  resendButton: { fontSize: 14, color: '#5B21B6', fontWeight: '600' },
  resendButtonDisabled: { color: '#9CA3AF' },
});