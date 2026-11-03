// app/new-password.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '../../constants/webstyles';
import { useAuth } from '../../backend/context/AuthContext';
import { getAuth, updatePassword } from 'firebase/auth';

export default function ChangePasswordNewScreen() {
  const { currentUser } = useAuth();
  const auth = getAuth();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false,
  });

  useEffect(() => {
    setRequirements({
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      symbol: /[^A-Za-z0-9]/.test(newPassword), 
    });
  }, [newPassword]);

  const isPasswordValid = Object.values(requirements).every(Boolean);
  const doPasswordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const getPasswordError = () => {
    if (newPassword.length === 0) return "";
    if (!requirements.length) return "Password must be at least 8 characters long.";
    if (!requirements.uppercase) return "Password must contain at least one uppercase letter (A-Z).";
    if (!requirements.lowercase) return "Password must contain at least one lowercase letter (a-z).";
    if (!requirements.number) return "Password must contain at least one number (0-9).";
    if (!requirements.symbol) return "Password must contain at least one special symbol (e.g., @, #, $).";
    return "";
  };

  const passwordError = getPasswordError();

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);  
    setError('');

    try {
      await updatePassword(currentUser!, newPassword);
      
      Alert.alert(
        'Success', 
        'Your password has been updated successfully!',
        [
          { 
            text: 'OK', 
            onPress: () => {
              router.replace('/(customerapp)/account');
            }
          }
        ]
      );
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setError('Please log out and log in again before changing your password.');
      } else {
        setError('Failed to update password. Please try again.');
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

      <Text style={styles.label}>New Password</Text>
      <View style={[styles.inputContainer, passwordError ? styles.inputError : null]}>
        <TextInput 
          style={styles.input} 
          placeholder="Enter new password" 
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showNewPassword}
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPassword(!showNewPassword)}>
          <Ionicons name={showNewPassword ? 'eye' : 'eye-off'} size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
      {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

      <Text style={styles.label}>Confirm Password</Text>
      <View style={[styles.inputContainer, !doPasswordsMatch && confirmPassword.length > 0 ? styles.inputError : null]}>
        <TextInput 
          style={styles.input} 
          placeholder="Re-enter your Password" 
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
          <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
      {!doPasswordsMatch && confirmPassword.length > 0 && (
        <Text style={styles.errorText}>Passwords do not match</Text>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[
            styles.saveButton, 
            (isLoading || !isPasswordValid || !doPasswordsMatch) && styles.saveButtonDisabled
          ]}
          onPress={handleUpdatePassword}
          disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[
              styles.saveButtonText, 
              (isLoading || !isPasswordValid || !doPasswordsMatch) && styles.saveButtonTextDisabled
            ]}>
              Save Password
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 60 },
  backButton: { marginBottom: 20, width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, backgroundColor: '#FFFFFF', marginBottom: 8 },
  inputError: { borderColor: '#EF4444' },
  input: { flex: 1, height: 50, paddingHorizontal: 15, fontSize: 14, color: '#111827' },
  eyeButton: { paddingHorizontal: 15, justifyContent: 'center', height: 50, alignItems: 'center' },
  errorText: { color: '#EF4444', fontSize: 12, marginBottom: 16, marginLeft: 4, fontWeight: '500' },
  buttonContainer: { alignItems: 'center', marginTop: 20 }, 
  saveButton: { backgroundColor: '#5B21B6', width: 160, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }, // Width 100% se 160 kar di
  saveButtonDisabled: { backgroundColor: '#D1D5DB' },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  saveButtonTextDisabled: { color: '#9CA3AF' },
});