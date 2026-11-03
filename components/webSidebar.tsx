import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../backend/config/firebaseConfig';
import { useAuth } from '../backend/context/AuthContext';

type Role = 'customer' | 'manager' | 'admin';

const LINKS: Record<Role, { label: string; path: any; icon: any }[]> = {
  customer: [
    { label: 'Home', path: '/(customerapp)/home', icon: 'home-outline' },
    { label: 'My Bookings', path: '/(customerapp)/bookings-history', icon: 'calendar-outline' },
    { label: 'Notifications', path: '/(customerapp)/notifications', icon: 'notifications-outline' },
    { label: 'Account', path: '/(customerapp)/account', icon: 'person-circle-outline' },
  ],
  manager: [
    { label: 'Home', path: '/(managerapp)/home', icon: 'home-outline' },
    { label: 'Add Hall', path: '/(managerapp)/add-hall', icon: 'add-circle-outline' },
    { label: 'Requests', path: '/(managerapp)/requests', icon: 'business-outline' },
    { label: 'Bookings', path: '/(managerapp)/manage-booking', icon: 'calendar-outline' },
    { label: 'Earnings', path: '/(managerapp)/earnings', icon: 'wallet-outline' },
  ],
  admin: [
    { label: 'Dashboard', path: '/(adminapp)/home', icon: 'grid-outline' },
    { label: 'Reports', path: '/(adminapp)/reports', icon: 'stats-chart-outline' },
    { label: 'Notifications', path: '/(adminapp)/notifications', icon: 'notifications-outline' },
    { label: 'Users', path: '/(adminapp)/users', icon: 'people-outline' },
  ],
};

const TITLES: Record<Role, string> = {
  customer: 'Customer Panel',
  manager: 'Manager Panel',
  admin: 'Admin Panel',
};

const syncBodyPadding = () => {
  if (typeof document === 'undefined') return;
  const sidebars = Array.from(
    document.querySelectorAll('[data-testid="web-sidebar"]')
  ) as HTMLElement[];
  const visible = sidebars.some((el) => el.getBoundingClientRect().width > 0);

  if (visible) {
    document.body.style.paddingLeft = 'max(240px, calc(50% - 380px))';
    document.body.style.paddingRight = 'max(0px, calc(50% - 620px))';
  } else {
    document.body.style.paddingLeft = '';
    document.body.style.paddingRight = '';
  }
};

export default function WebSidebar({ role }: { role: Role }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userData } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || !userData?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('targetUserId', '==', userData.uid),
      where('targetRole', '==', role),
      where('status', '==', 'unread')
    );

    const unsub = onSnapshot(q, (snap) => {
      let total = 0;
      snap.forEach((d) => {
        total += d.data().unreadCount || 1;   
      });
      setUnreadCount(total);
    });

    return () => unsub();
  }, [userData?.uid, role]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const t = setTimeout(syncBodyPadding, 50);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (Platform.OS !== 'web') return;
      setTimeout(syncBodyPadding, 50);
    };
  }, []);

  if (Platform.OS !== 'web') return null;

  const links = LINKS[role];

  return (
    <View style={styles.sidebar as any} testID="web-sidebar">
      <View style={styles.header}>
        <Text style={styles.headerText}>Event Hall</Text>
      </View>
      <Text style={styles.roleText}>{TITLES[role]}</Text>

      <View style={styles.links}>
        {links.map((link) => {
          const isActive = pathname === link.path || pathname.startsWith(link.path + '/');
          const isNotifTab = String(link.path).endsWith('/notifications');

          return (
            <TouchableOpacity
              key={link.path}
              style={[styles.linkItem, isActive && styles.linkItemActive]}
              onPress={() => router.push(link.path as any)}
              activeOpacity={0.7}
            >
              <Ionicons name={link.icon} size={20} color={isActive ? '#5B21B6' : '#6B7280'} />
              <Text style={[styles.linkText, isActive && styles.linkTextActive]}>
                {link.label}
              </Text>

              {isNotifTab && unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'fixed',
    left: 'max(0px, calc(50% - 620px))',
    top: 0,
    bottom: 0,
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingTop: 24,
    paddingHorizontal: 12,
    zIndex: 1000,
  } as any,
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, marginBottom: 4 },
  headerText: { fontSize: 20, fontWeight: '800', color: '#5B21B6' },
  roleText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 12, marginBottom: 16 },
  links: { gap: 4 },
  linkItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 },
  linkItemActive: { backgroundColor: '#F5F3FF' },
  linkText: { fontSize: 14, fontWeight: '600', color: '#6B7280', flex: 1 },
  linkTextActive: { color: '#5B21B6' },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});