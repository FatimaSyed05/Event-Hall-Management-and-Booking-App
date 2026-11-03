// backend/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User, 
  deleteUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
// import Constants from 'expo-constants';
// import { Platform } from 'react-native';
// import { savePushToken } from '../services/notificationServices';
export type UserRole = 'customer' | 'manager' | 'admin';
export type approvalStatus = 'pending_verification' | 'pending_approval' | 'approved' | 'rejected';
export type accountStatus = 'active' | 'suspended' | 'deleted';

export interface UserData {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  approvalStatus: approvalStatus, 
  accountStatus: accountStatus,
  emailVerified: boolean;
  phone?: string;               
  address?: string;             
  verificationDoc?: string;    
  createdAt: string;
  paymentMethod?: string;        
  accountTitle?: string;     
  accountNumber?: string; 
  profilePhoto?: string;
  profilePhotoPublicId?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
    signup: (
    email: string, 
    password: string, 
    name: string, 
    role: UserRole,
    phone?: string,
    address?: string,
    verificationDoc?: string
  ) => Promise<string>; 
  verifyOtp: (uid: string, enteredOtp: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (updates: Partial<UserData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const signup = async (
    email: string, 
    password: string, 
    name: string, 
    role: UserRole,
    phone?: string,               
    address?: string,             
    verificationDoc?: string     
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      let status: approvalStatus = 'approved';
      let emailVerified = false;

      if (role === 'customer') {
        status = 'pending_verification';
      } else if (role === 'manager') {
        status = 'pending_approval';
      }
      const userDataObj: UserData = {
        uid: user.uid,
        email: user.email!,
        name: name,
        role: role,
        approvalStatus: status,
        accountStatus: 'active',
        emailVerified: emailVerified,
        phone: phone || '',
        address: address || '',
        verificationDoc: verificationDoc || '',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid), userDataObj);     
      return user.uid; 
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please log in.');
      }
      throw new Error(error.message);
    }
  };

  const verifyOtp = async (uid: string, enteredOtp: string) => {
    try {
      const otpDoc = await getDoc(doc(db, 'otps', uid));
      
      if (!otpDoc.exists()) {
        throw new Error('OTP not found or has expired. Please sign up again.');
      }

      const otpData = otpDoc.data();      
      if (otpData.otp !== enteredOtp) {
        throw new Error('Invalid OTP. Please try again.');
      }

      const expiryDate = otpData.expiresAt.toDate();
      if (new Date() > expiryDate) {
        throw new Error('OTP has expired. Please sign up again.');
      }
      // await registerPushToken(uid);   
      await updateDoc(doc(db, 'users', uid), {
        approvalStatus: 'approved',
        accountStatus: 'active',
        emailVerified: true,
      });

      await deleteDoc(doc(db, 'otps', uid));
      const updatedUserDoc = await getDoc(doc(db, 'users', uid));
      setUserData(updatedUserDoc.data() as UserData);
    } catch (error: any) {
      throw new Error(error.message);
    }
};

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));      
      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error('Account found but profile data is missing. Please sign up first.');
      }

      const data = userDoc.data() as UserData;
      if (data.role === 'customer' && data.approvalStatus === 'pending_verification') {
        await signOut(auth);
        throw new Error('Please verify your email first.');
      }

      if (data.role === 'manager' && data.approvalStatus === 'pending_approval') {
        await signOut(auth);
        throw new Error('Your account is pending for admin approval. You will be notified once approved.');
      }

      if (data.approvalStatus === 'rejected') {
        await signOut(auth);
        throw new Error('Your account has been rejected by the Admin.');
      }
      setUserData(data);

      // try {
      //   await registerPushToken(user.uid);
      // } catch (err) {
      //   console.log("Push token registration skipped during login (Non-fatal)");
      // }
    } catch (error: any) {
      let errorMessage = 'Login failed. Please try again.';      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        errorMessage = 'This user is not registered in the system. Please sign up first.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format.';
      } else {
        errorMessage = error.message; 
      }
      
      throw new Error(errorMessage);
    }
  };
    const logout = async () => {
    setUserData(null);
    setCurrentUser(null);
    await signOut(auth);
  };
  const deleteAccount = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user is currently logged in.');
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteDoc(doc(db, 'otps', user.uid)).catch(() => {});
      await deleteUser(user);
      setUserData(null);
      setCurrentUser(null);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('Please log out and log in again before deleting your account.');
      }
      throw new Error(error.message);
    }
  };
 
  const updateProfile = async (updates: Partial<UserData>) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user is currently logged in.');
      await updateDoc(doc(db, 'users', user.uid), updates);
      const updatedUserDoc = await getDoc(doc(db, 'users', user.uid));
      setUserData(updatedUserDoc.data() as UserData);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          
          if (data.approvalStatus === 'pending_approval' || data.approvalStatus === 'pending_verification'|| data.approvalStatus === 'rejected') {
            //  await signOut(auth);
             setUserData(null);
          } else {
            // setCurrentUser(user); 
             setUserData(data);
          }
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    signup,
    verifyOtp,
    login,
    logout,
    deleteAccount,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// const registerPushToken = async (userId: string) => {
//   try {
//     const isExpoGo = Constants.appOwnership === 'expo';
//     if (isExpoGo) {
//       console.log('Push notifications disabled in Expo Go. Use dev build to test.');
//       return; 
//     }

//     if (!Device.isDevice) {
//       console.log('Push notifications only work on physical devices');
//       return;
//     }

//     const { status: existingStatus } = await Notifications.getPermissionsAsync();
//     let finalStatus = existingStatus;
    
//     if (existingStatus !== 'granted') {
//       const { status } = await Notifications.requestPermissionsAsync();
//       finalStatus = status;
//     }
    
//     if (finalStatus !== 'granted') {
//       console.log('Push notification permission denied');
//       return;
//     }

//     const token = (await Notifications.getExpoPushTokenAsync({
//       projectId: 'event-hall-app', 
//     })).data;

//     console.log('Expo Push Token:', token);
//     await savePushToken(userId, token);
//   } catch (error) {
//     console.error('Error registering push token (Non-fatal):', error);
//   }
// };