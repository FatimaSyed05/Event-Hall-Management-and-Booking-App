// app/forgot-password.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '../../constants/webstyles';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../backend/config/firebaseConfig';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

   const handleSendResetLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
         const API_URL = 'https://bondless-python-floral.ngrok-free.dev/api/forgot-password';
      // const API_URL = 'http://192.168.19.150:8000/api/forgot-password';
      // const API_URL = 'https://thirty-paths-rush.loca.lt/api/forgot-password';
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);

      Alert.alert('Email Sent', 'A real reset link has been sent to your email. Check your inbox!');
      router.replace('/(auth)/login');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };
  //   setIsLoading(true);
  //   setError('');
  //   try {
  //     await sendPasswordResetEmail(auth, email);
      
  //     Alert.alert(
  //       'Email Sent', 
  //       'A password reset link has been sent to your email. Please check your inbox (and spam folder) to set a new password.',
  //       [
  //         { 
  //           text: 'OK', 
  //           onPress: () => router.replace('/(auth)/login') 
  //         }
  //       ]
  //     );
  //   } catch (err: any) {
  //     if (err.code === 'auth/user-not-found') {
  //       setError('No account found with this email address.');
  //     } else {
  //       setError('Failed to send reset email. Please try again.');
  //     }
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>

      <Text style={styles.heading}>Forgot Password</Text>
      <Text style={styles.subtitle}>
        Enter your registered email and we'll send you a link to reset your password.
      </Text>

      <View style={styles.inputWrapper}>
        <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput 
          style={styles.input} 
          placeholder="Email address" 
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email} 
          onChangeText={(text) => { 
            setEmail(text);
            if (error) setError('');
          }}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

       <TouchableOpacity 
        style={[styles.button, isLoading && { opacity: 0.7 }]} 
        onPress={handleSendResetLink} 
        disabled={isLoading} 
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" /> 
        ) : (
          <Text style={styles.buttonText}>Send Reset Link</Text>
        )}
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 60 },
  backButton: { marginBottom: 30, width: 40, height: 40, justifyContent: 'center' },
  heading: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 40 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 30, backgroundColor: '#FFFFFF' },
  inputIcon: { paddingHorizontal: 15 },
  input: { flex: 1, height: 50, fontSize: 14, color: '#111827' },
  errorText: { color: '#EF4444', fontSize: 12, marginBottom: 20, marginLeft: 5 },
  button: { backgroundColor: '#5B21B6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  linkText: { color: '#5B21B6', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});