// app/(auth)/login.tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, BackHandler, Alert, ActivityIndicator } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webAuthContainerStyle, webContainerStyle } from '../../constants/webstyles'; 
import { useAuth } from '../../backend/context/AuthContext';
import { registerPushToken } from '@/backend/services/pushService';
import { auth } from '@/backend/config/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginScreen() {
  const { login, currentUser, userData, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  
  // const [selectedRole, setSelectedRole] = useState<'customer' | 'manager' | 'admin'>('customer');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const pathname = usePathname();

  const validateInputs = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      setEmailError('Email address is required');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      isValid = false;
    }

    return isValid;
  };

//   const handleLogin = async () => {
//   try {
//     const userCredential = await signInWithEmailAndPassword(auth, email, password);
//     const user = userCredential.user;
    
//     try {
//       await login(email, password);
//       await registerPushToken(user.uid);
//       console.log('Push token registered on login');
//     } catch (pushError) {
//       console.log('Push token failed (non-critical):', pushError);
//     }
    
//   } catch (error: any) {
//     Alert.alert('Login Failed', error.message);
//   } finally {
//       setIsLoggingIn(false);
//     }
// };
  const handleLogin = async () => {
    if (!validateInputs()) return; 

    setIsLoggingIn(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // const handleUITestAccess = (role: 'customer' | 'manager' | 'admin') => {
  //   setSelectedRole(role);
  //   if (role === 'manager') {
  //     router.replace('/(managerapp)/home');
  //   } else if (role === 'customer') {
  //     router.replace('/(customerapp)/home');
  //   } else {
  //     router.replace('/(adminapp)/home' as any);
  //   }
  // };

  useEffect(() => {
    if (currentUser && userData) {
      if (userData.role === 'manager') {
        router.replace('/(managerapp)/home');
      } else if (userData.role === 'customer') {
        router.replace('/(customerapp)/home');
      } else if (userData.role === 'admin') {
        router.replace('/(adminapp)/home' as any);
      }
    }
  }, [currentUser, userData]);

  useEffect(() => {
    const backAction = () => {
      if (pathname === '/(auth)/login' || pathname === '/login') {
        BackHandler.exitApp(); 
        return true;
      }
      return false; 
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [pathname]); 

  const handleRoleSelect = (role: 'customer' | 'manager') => {
    setShowRoleModal(false);
    router.push(`/signup?role=${role}`);
  };

  return (
    <SafeAreaView style={[styles.safeArea, webAuthContainerStyle]}>
      <View style={styles.container}>
        <Text style={styles.heading}>
          Hello!{'\n'}Welcome back
        </Text>

        {/* 🛠️ UI TESTING BUTTONS (Bina DB ke access ke liye)
        <Text style={styles.testLabel}>🛠️ Quick UI Test Access:</Text>
        <View style={styles.roleSelectorContainer}>
          <TouchableOpacity 
            style={[styles.roleSelectorButton, selectedRole === 'customer' && styles.roleSelectorActive]}
            onPress={() => handleUITestAccess('customer')}
          >
            <Ionicons 
              name={selectedRole === 'customer' ? 'person' : 'person-outline'} 
              size={16} 
              color={selectedRole === 'customer' ? '#FFFFFF' : '#6B7280'} 
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.roleSelectorText, selectedRole === 'customer' && styles.roleSelectorTextActive]}>
              Customer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.roleSelectorButton, selectedRole === 'manager' && styles.roleSelectorActive]}
            onPress={() => handleUITestAccess('manager')}
          >
            <Ionicons 
              name={selectedRole === 'manager' ? 'business' : 'business-outline'} 
              size={16} 
              color={selectedRole === 'manager' ? '#FFFFFF' : '#6B7280'} 
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.roleSelectorText, selectedRole === 'manager' && styles.roleSelectorTextActive]}>
              Manager
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.roleSelectorButton, selectedRole === 'admin' && styles.roleSelectorActive]}
            onPress={() => handleUITestAccess('admin')}
          >
            <Ionicons 
              name={selectedRole === 'admin' ? 'shield-checkmark' : 'shield-checkmark-outline'} 
              size={16} 
              color={selectedRole === 'admin' ? '#FFFFFF' : '#6B7280'} 
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.roleSelectorText, selectedRole === 'admin' && styles.roleSelectorTextActive]}>
              Admin
            </Text>
          </TouchableOpacity>
        </View> */}

        {/* <View style={styles.divider} /> */}

        <Text style={styles.label}>Email Address</Text>
        <TextInput 
          style={[styles.input, emailError ? styles.inputError : null]} 
          placeholder="Enter your email" 
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          editable={!isLoggingIn}
          onChangeText={(text) => {
            setEmail(text);
            if (emailError) setEmailError('');
          }}
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        
        <Text style={styles.label}>Password</Text>
        <View style={[styles.passwordContainer, passwordError ? styles.inputErrorBorder : null]}>
          <TextInput 
            style={styles.passwordInput} 
            placeholder="Enter your password" 
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
            textContentType="none"      
            autoComplete="off"          
            autoCorrect={false}
            value={password}
            editable={!isLoggingIn}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError('');
            }}
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
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        <TouchableOpacity onPress={() => router.push('/forgot-password')} style={styles.forgotContainer}
          disabled={isLoggingIn}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, isLoggingIn && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoggingIn || authLoading}
        >
          {isLoggingIn || authLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerTextContainer}>
          <Text style={styles.footerText}>You don't have an account? </Text>
          <TouchableOpacity onPress={() => setShowRoleModal(true)}
            disabled={isLoggingIn} >
            <Text style={styles.linkText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showRoleModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRoleModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowRoleModal(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Account As</Text>
              <Text style={styles.modalSubtitle}>Select your role to continue</Text>

              <TouchableOpacity 
                style={styles.roleButton}
                onPress={() => handleRoleSelect('customer')}
              >
                <View style={styles.roleIconContainer}>
                  <Ionicons name="person-outline" size={28} color="#5B21B6" />
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={styles.roleTitle}>I am a Customer</Text>
                  <Text style={styles.roleDescription}>Book halls for your events</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.roleButton}
                onPress={() => handleRoleSelect('manager')}
              >
                <View style={styles.roleIconContainer}>
                  <Ionicons name="business-outline" size={28} color="#5B21B6" />
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={styles.roleTitle}>I am a Hall Manager</Text>
                  <Text style={styles.roleDescription}>Manage and list your halls</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowRoleModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 30, justifyContent: 'center' },
  heading: { fontSize: 32, fontWeight: '700', color: '#111827', marginBottom: 20, lineHeight: 40, textAlign: 'center' },

  // testLabel: { fontSize: 12, fontWeight: '600', color: '#5B21B6', marginBottom: 8, textAlign: 'center' },
  // roleSelectorContainer: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  // roleSelectorButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  // roleSelectorActive: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
  // roleSelectorText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  // roleSelectorTextActive: { color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { height: 50, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 15, marginBottom: 4, fontSize: 14, color: '#111827', backgroundColor: '#FFFFFF' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { fontSize: 12, color: '#EF4444', marginBottom: 12, marginLeft: 4 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 4, backgroundColor: '#FFFFFF' },
  inputErrorBorder: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  passwordInput: { flex: 1, height: 50, paddingHorizontal: 15, fontSize: 14, color: '#111827' },
  eyeButton: { paddingHorizontal: 15, justifyContent: 'center', height: 50, alignItems: 'center' },
  forgotContainer: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 14, color: '#5B21B6', fontWeight: '500' },
  button: { backgroundColor: '#5B21B6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  buttonDisabled: { backgroundColor: '#9CA3AF' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  footerTextContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: '#6B7280' },
  linkText: { fontSize: 14, color: '#5B21B6', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '85%', maxWidth: 400 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  roleButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 12, backgroundColor: '#FAFAFA' },
  roleIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  roleTextContainer: { flex: 1 },
  roleTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  roleDescription: { fontSize: 12, color: '#6B7280' },
  cancelButton: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
});