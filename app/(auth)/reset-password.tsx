// app/reset-password.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '../../constants/webstyles';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../../backend/config/firebaseConfig';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams(); 
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasLength, setHasLength] = useState(false);
  const [hasUppercase, setHasUppercase] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const { oobCode, email } = useLocalSearchParams();

  const handlePasswordChange = (text: string) => {
    setNewPassword(text);
    setHasLength(text.length >= 8);
    setHasUppercase(/[A-Z]/.test(text));
    setHasNumber(/[0-9]/.test(text));
    if (error) setError('');
  };

  const handleResetPassword = async () => {
    setError('');

    if (!hasLength || !hasUppercase || !hasNumber) {
      setError('Please meet all password requirements');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode as string, newPassword);
      
      Alert.alert('Success', 'Password reset successfully! Please login.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
      
    } catch (err: any) {
      setError('Link expired or invalid. Please request a new one.');
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

        <Text style={styles.heading}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Create a new strong password for your account.
        </Text>

        <View style={[styles.passwordContainer, error && !hasLength ? styles.inputError : null]}>
          <TextInput 
            style={styles.passwordInput} 
            placeholder="New Password" 
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
            value={newPassword}
            onChangeText={handlePasswordChange}
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={[styles.passwordContainer, error && newPassword !== confirmPassword ? styles.inputError : null]}>
          <TextInput 
            style={styles.passwordInput} 
            placeholder="Confirm Password" 
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={(text) => { setConfirmPassword(text); if(error) setError(''); }}
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.requirementsBox}>
          <Text style={styles.requirementsTitle}>Password must contain:</Text>
          
          <View style={styles.requirementItem}>
            <Ionicons name={hasLength ? "checkmark-circle" : "close-circle"} size={16} color={hasLength ? "#10B981" : "#9CA3AF"} />
            <Text style={[styles.requirementText, hasLength && styles.requirementTextSuccess]}>At least 8 characters</Text>
          </View>
          
          <View style={styles.requirementItem}>
            <Ionicons name={hasUppercase ? "checkmark-circle" : "close-circle"} size={16} color={hasUppercase ? "#10B981" : "#9CA3AF"} />
            <Text style={[styles.requirementText, hasUppercase && styles.requirementTextSuccess]}>One uppercase letter</Text>
          </View>
          
          <View style={styles.requirementItem}>
            <Ionicons name={hasNumber ? "checkmark-circle" : "close-circle"} size={16} color={hasNumber ? "#10B981" : "#9CA3AF"} />
            <Text style={[styles.requirementText, hasNumber && styles.requirementTextSuccess]}>One number</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, isLoading && { opacity: 0.7 }]}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
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
  subtitle: { fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 30 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 15, backgroundColor: '#FFFFFF' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  passwordInput: { flex: 1, height: 50, paddingHorizontal: 15, fontSize: 14, color: '#111827' },
  eyeButton: { paddingHorizontal: 15, justifyContent: 'center', height: 50, alignItems: 'center' },
  errorText: { color: '#EF4444', fontSize: 12, marginBottom: 15, marginLeft: 5 },
  requirementsBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 30, borderWidth: 1, borderColor: '#E5E7EB' },
  requirementsTitle: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 12 },
  requirementItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  requirementText: { fontSize: 13, color: '#9CA3AF', marginLeft: 8 },
  requirementTextSuccess: { color: '#4B5563', fontWeight: '500' },
  button: { backgroundColor: '#5B21B6', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});