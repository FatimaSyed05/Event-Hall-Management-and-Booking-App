// components/BottomNav.tsx
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, Platform } from 'react-native';
import { router, usePathname, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebSidebar from './webSidebar';

export default function BottomNav() {
  if (Platform.OS === 'web') {
    return <WebSidebar role="manager" />;
  }
  const pathname = usePathname();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets(); 
  const isHomeActive = pathname?.includes('/home') || pathname === '/';
  const isRequestsActive = pathname?.includes('/requests');
  const isAddHallActive = pathname?.includes('/add-hall');
  const isBookingsActive = pathname?.includes('/manage-booking');
  const isEarningsActive = pathname?.includes('/earnings');

  useEffect(() => {
    const backAction = () => {
      const currentPath = pathname || '';

      if (currentPath === '/' || currentPath.endsWith('/home') || currentPath.includes('/home')) {
       router.replace('/(auth)/login');
        return true; 
      }
      if (
        currentPath.includes('/requests') ||
        currentPath.includes('/add-hall') ||
        currentPath.includes('/manage-booking') ||
        currentPath.includes('/payments') ||
        currentPath.includes('/notifications') ||
        currentPath.includes('/account')
      ) {
        router.replace('/(managerapp)/home');
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
        onPress={() => handleNavigation('/(managerapp)/home')} >
        <Ionicons 
          name={isHomeActive ? 'home' : 'home-outline'} 
          size={24} 
          color={isHomeActive ? '#5B21B6' : '#9CA3AF'} />
        <Text style={[styles.navText, isHomeActive && styles.navTextActive]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => handleNavigation('/(managerapp)/requests')} >
        <Ionicons 
          name={isRequestsActive ? 'document-text' : 'document-text-outline'} 
          size={24} 
          color={isRequestsActive ? '#5B21B6' : '#9CA3AF'}  />
        <Text style={[styles.navText, isRequestsActive && styles.navTextActive]}>Requests</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => handleNavigation('/(managerapp)/add-hall')} >
        <Ionicons name={isAddHallActive ? 'add-circle' : 'add-circle-outline'} 
           size={24}
           color={isAddHallActive ? '#5B21B6' : '#9CA3AF'}  />
        <Text style={[styles.navText, isAddHallActive && styles.navTextActive]}>Add Hall</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => handleNavigation('/(managerapp)/manage-booking')} >
        <Ionicons 
          name={isBookingsActive ? 'calendar' : 'calendar-outline'} 
          size={24} 
          color={isBookingsActive ? '#5B21B6' : '#9CA3AF'} />
        <Text style={[styles.navText, isBookingsActive && styles.navTextActive]}>Bookings</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => handleNavigation('/(managerapp)/earnings')} >
        <Ionicons 
          name={isEarningsActive ? 'card' : 'card-outline'} 
          size={24} 
          color={isEarningsActive ? '#5B21B6' : '#9CA3AF'} />
        <Text style={[styles.navText, isEarningsActive && styles.navTextActive]}>Earnings</Text>
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
});