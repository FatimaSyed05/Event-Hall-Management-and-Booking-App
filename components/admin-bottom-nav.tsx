// components/admin-bottom-nav.tsx
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { db } from '../backend/config/firebaseConfig'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebSidebar from './webSidebar';

export default function AdminBottomNav() {
  if (Platform.OS === 'web') {
    return <WebSidebar role="admin" />;
  }
  const pathname = usePathname();
  const insets = useSafeAreaInsets(); 
  const isHomeActive = pathname === '/' || pathname?.includes('/home');
  const isNotificationsActive = pathname?.includes('/notifications');
  const isReportsActive = pathname?.includes('/reports');
  const isUsersActive = pathname?.includes('/users');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      where('targetRole', '==', 'admin'),
      where('status', '==', 'unread')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const backAction = () => {
      const currentPath = pathname || '';
      if (currentPath === '/' || currentPath.includes('/home')) {
        router.replace('/(auth)/login' as any);
        return true;
      }
      if (
        currentPath.includes('/notifications') ||
        currentPath.includes('/reports') ||
        currentPath.includes('/users')
      ) {
        router.replace('/(adminapp)/home' as any);
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
        onPress={() => handleNavigation('/(adminapp)/home')} >
        <Ionicons 
          name={isHomeActive ? 'home' : 'home-outline'} 
          size={24} 
          color={isHomeActive ? '#363636' : '#9CA3AF'} />
        <Text style={[styles.navText, isHomeActive && styles.navTextActive]}>Home</Text>
      </TouchableOpacity>

      {/* <TouchableOpacity 
        style={styles.navItem}
        onPress={() => handleNavigation('/(adminapp)/notifications')} >
        <Ionicons 
          name={isNotificationsActive ? 'notifications' : 'notifications-outline'} 
          size={24} 
          color={isNotificationsActive ? '#363636' : '#9CA3AF'} />
        <Text style={[styles.navText, isNotificationsActive && styles.navTextActive]}>Notifications</Text>
      </TouchableOpacity> */}
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => handleNavigation('/(adminapp)/notifications')} 
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name={isNotificationsActive ? 'notifications' : 'notifications-outline'} 
            size={24} 
            color={isNotificationsActive ? '#363636' : '#9CA3AF'} 
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
        onPress={() => handleNavigation('/(adminapp)/reports')} >
        <Ionicons 
          name={isReportsActive ? 'stats-chart' : 'stats-chart-outline'} 
          size={24} 
          color={isReportsActive ? '#363636' : '#9CA3AF'} />
        <Text style={[styles.navText, isReportsActive && styles.navTextActive]}>Reports</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => handleNavigation('/(adminapp)/users')} >
        <Ionicons 
          name={isUsersActive ? 'people' : 'people-outline'} 
          size={24} 
          color={isUsersActive ? '#363636' : '#9CA3AF'} />
        <Text style={[styles.navText, isUsersActive && styles.navTextActive]}>Users</Text>
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
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4 },
  navText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  navTextActive: { color: '#363636', fontWeight: '600' },
    iconContainer: { 
    position: 'relative', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EF4444', 
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF', 
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});