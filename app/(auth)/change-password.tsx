// app/change-password.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '../../constants/webstyles';
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';

export default function ChangePasswordScreen() {
  const [oldPassword, setOldPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 

  // const handleContinue = () => {
  //   if (!oldPassword.trim()) {
  //     Alert.alert('Error', 'Please enter your old password');
  //     return;
  //   }
  //   router.push('/new-password');
  // };
 const handleContinue = async () => {
    if (!oldPassword.trim()) {
      Alert.alert('Error', 'Please enter your old password');
      return;
    }

    setIsLoading(true);
    try {
      const authInstance = getAuth();
      const user = authInstance.currentUser;

      if (!user || !user.email) {
        throw new Error('User not found. Please log in again.');
      }
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      router.push('/(auth)/new-password');
      
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Incorrect old password. Please try again.');
      } else {
        Alert.alert('Error', err.message || 'Failed to verify password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>

      <Text style={styles.title}>Change Password</Text>

      <Text style={styles.label}>Enter your old password</Text>

      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showPassword}
          value={oldPassword}
          onChangeText={setOldPassword}
        />
        <TouchableOpacity 
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons 
            name={showPassword ? 'eye' : 'eye-off'} 
            size={20} 
            color="#6B7280" 
          />
        </TouchableOpacity>
      </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.continueButton, isLoading && { opacity: 0.7 }]}
            onPress={handleContinue}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
      </View>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 30,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#111827',
  },
  eyeButton: {
    paddingHorizontal: 15,
    justifyContent: 'center',
    height: 50,
    alignItems: 'center',
  },
  buttonContainer: {
    alignItems: 'flex-end',
    marginTop: 20,
  },
  continueButton: {
    backgroundColor: '#5B21B6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});