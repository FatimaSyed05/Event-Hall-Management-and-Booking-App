// components/customer-bottom-nav.tsx
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../backend/config/firebaseConfig'; 
import { useAuth } from '../backend/context/AuthContext'; 
import WebSidebar from './webSidebar';


export default function CustomerBottomNav() {
  if (Platform.OS === 'web') {
    return <WebSidebar role="customer" />;
  }
  const pathname = usePathname();
  const insets = useSafeAreaInsets(); 
  const { userData } = useAuth(); 
  
  const [unreadCount, setUnreadCount] = useState(0); 
  const isHomeActive = pathname?.includes('/home') || pathname === '/';
  const isNotificationsActive = pathname?.includes('/notifications');
  const isBookingsActive = pathname?.includes('/bookings-history');
  const isAccountActive = pathname?.includes('/account');

  useEffect(() => {
    if (!userData?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('targetUserId', '==', userData.uid),
      where('targetRole', '==', 'customer'),
      where('status', '==', 'unread') 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [userData?.uid]);

 useEffect(() => {
    const backAction = () => {
      const currentPath = pathname || '';

      if (currentPath === '/' || currentPath.includes('/home')) {
        router.replace('/(auth)/login'); 
        return true;
      }
      if (
        currentPath.includes('/notifications') ||
        currentPath.includes('/bookings-history') ||
        currentPath.includes('/account')
      ) {
        router.replace('/(customerapp)/home');
        return true; 
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [pathname]);

  const handleNavigation = (route: string) => {
    router.push(route as any);
  };

  return (    
    <View style={[styles.bottomNav, { paddingBottom: Math.max(12, insets.bottom) }]}>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => handleNavigation('/(customerapp)/home')} >
        <Ionicons 
          name={isHomeActive ? 'home' : 'home-outline'} 
          size={24} 
          color={isHomeActive ? '#5B21B6' : '#9CA3AF'} />
        <Text style={[styles.navText, isHomeActive && styles.navTextActive]}>Home</Text>
      </TouchableOpacity>

      {/* <TouchableOpacity 
        style={styles.navItem}
        onPress={() => handleNavigation('/(customerapp)/notifications')} >
        <Ionicons 
          name={isNotificationsActive ? 'notifications' : 'notifications-outline'} 
          size={24} 
          color={isNotificationsActive ? '#5B21B6' : '#9CA3AF'} />
        <Text style={[styles.navText, isNotificationsActive && styles.navTextActive]}>Notifications</Text>
      </TouchableOpacity> */}
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => handleNavigation('/(customerapp)/notifications')} >
        <View style={styles.iconContainer}>
          <Ionicons 
            name={isNotificationsActive ? 'notifications' : 'notifications-outline'} 
            size={24} 
            color={isNotificationsActive ? '#5B21B6' : '#9CA3AF'} 
          />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.navText, isNotificationsActive && styles.navTextActive]}>Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => handleNavigation('/(customerapp)/bookings-history')} >
        <Ionicons 
          name={isBookingsActive ? 'calendar' : 'calendar-outline'} 
          size={24} 
          color={isBookingsActive ? '#5B21B6' : '#9CA3AF'} />
        <Text style={[styles.navText, isBookingsActive && styles.navTextActive]}>Bookings</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => handleNavigation('/(customerapp)/account')} >
        <Ionicons 
          name={isAccountActive ? 'person-circle' : 'person-circle-outline'} 
          size={24} 
          color={isAccountActive ? '#5B21B6' : '#9CA3AF'} />
        <Text style={[styles.navText, isAccountActive && styles.navTextActive]}>Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
    position: 'absolute',   
    bottom: 0,              
    left: 0,              
    right: 0,         
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  navText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  navTextActive: {
    color: '#5B21B6',
    fontWeight: '600',
  },
  iconContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' }, 
  badge: { position: 'absolute', top: -4, right: -10, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#FFFFFF' }, 
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' }
});