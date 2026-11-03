// app/(customerapp)/notifications.tsx
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView, Alert, BackHandler } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import CustomerBottomNav from '../../components/customer-bottom-nav';
import { webContainerStyle } from '../../constants/webstyles';
import { useAuth } from '../../backend/context/AuthContext';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

type Notification = {
  id: string;
  type: 'requests' | 'payments' | 'bookings' | 'chats';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  status?: 'accepted' | 'rejected' | 'pending';
  bookingId?: string;
  managerName?: string;
  managerImage?: string;
  unreadCount?: number;
  hallName?: string;
  _timestamp?: Date; 
};

const filters = [
  { id: 'all', name: 'All' },
  { id: 'requests', name: 'Requests' },
  { id: 'payments', name: 'Payments' },
  { id: 'bookings', name: 'Bookings' },
  { id: 'chats', name: 'Chats' },
];

export default function NotificationsScreen() {
  const { userData } = useAuth();
  const [dbNotifications, setDbNotifications] = useState<Notification[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set()); 
  
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [showSelectionBar, setShowSelectionBar] = useState(false);

  useEffect(() => {
    if (!userData?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('targetRole', '==', 'customer'),
      where('targetUserId', '==', userData.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const realNotifs: Notification[] = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        let timeStr = 'Just now';
        if (d.timestamp) {
          const date = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
          const now = new Date();
          const isToday = date.toDateString() === now.toDateString();
          timeStr = isToday 
            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        let type: 'requests' | 'payments' | 'bookings' | 'chats' = 'requests';
        let title = d.title || 'Notification';
        let status: 'accepted' | 'rejected' | 'pending' | undefined = undefined;
        
        if (d.type === 'auto_rejection') {
          type = 'requests';  
          title = 'Request Auto-Rejected';
          status = 'rejected';
        }
        else if (d.type === 'payments') {
          type = 'payments';
        }
        else if (d.type === 'bookings' || d.type === 'cancellations' || d.type === 'refunds') {
          type = 'bookings';
        }
        else if (d.type === 'chats') {
          type = 'chats';
        }
        else if (d.type === 'requests') {
          if (d.message?.includes('ACCEPTED')) {
            title = 'Request Accepted';
            status = 'accepted';
          } else if (d.message?.includes('REJECTED')) {
            title = 'Request Rejected';
            status = 'rejected';
          } else {
            title = 'Booking Request';
            status = 'pending';
          }
        }

        return {
          id: docSnap.id,
          type: type,
          title: title,
          message: d.message || 'You have a new notification',
          time: timeStr,
          isRead: d.status === 'read',
          status: status,
          bookingId: d.requestId || d.bookingId || '',
          hallName: d.hallName || d.senderName || '', 
          unreadCount: d.unreadCount || 0,
          _timestamp: d.timestamp?.toDate?.() || new Date()
        };
      });
      setDbNotifications(realNotifs);
    });

    return () => unsubscribe();
  }, [userData?.uid]);

  const allNotifications = useMemo(() => {
    return [...dbNotifications].sort((a, b) => {
      const timeA = (a as any)._timestamp?.getTime() || 0;
      const timeB = (b as any)._timestamp?.getTime() || 0;
      return timeB - timeA;
    });
  }, [dbNotifications]);

  const activeNotifications = useMemo(() => {
    return allNotifications.filter(n => !deletedIds.has(n.id));
  }, [allNotifications, deletedIds]);
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification> = {};
    
    activeNotifications.forEach((notif: Notification) => {
      const groupKey = notif.type === 'chats' 
        ? `chat_${notif.bookingId || notif.id}` 
        : `other_${notif.id}`;

      if (!groups[groupKey]) {
        groups[groupKey] = { 
          ...notif, 
          unreadCount: notif.isRead ? 0 : (notif.unreadCount || 1)
        };
      } else {
        if (!notif.isRead) {
          groups[groupKey].unreadCount =
          (groups[groupKey].unreadCount || 0) + (notif.unreadCount || 1);        }
        const newTime = notif._timestamp?.getTime() || 0;
        const oldTime = groups[groupKey]._timestamp?.getTime() || 0;
        if (newTime > oldTime) {
          groups[groupKey].message = notif.message;
          groups[groupKey].time = notif.time;
          groups[groupKey]._timestamp = notif._timestamp;
          if (notif.hallName) groups[groupKey].hallName = notif.hallName;
        }
      }
    });

    return Object.values(groups).sort((a, b) => {
      const timeA = a._timestamp?.getTime() || 0;
      const timeB = b._timestamp?.getTime() || 0;
      return timeB - timeA;
    });
  }, [activeNotifications]);

  const filteredNotifications = useMemo(() => {
    if (selectedFilter === 'all') return groupedNotifications;
    return groupedNotifications.filter((n: Notification) => n.type === selectedFilter);
  }, [groupedNotifications, selectedFilter]);

  const getUnreadCount = (type: string) => {
    const targetNotifications = type === 'all' 
      ? groupedNotifications 
      : groupedNotifications.filter((n: Notification) => n.type === type);
    
    return targetNotifications.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);
  };

   const getSenderName = (item: Notification) => {
    if (item.hallName && item.hallName.trim() !== '') {
      return item.hallName;
    }
    const match = item.message?.match(/regarding (.+)/i);
    if (match && match[1]) {
      return match[1].replace(/[\.!]+$/, '').trim(); 
    }
    if (item.type === 'requests') return item.hallName || 'Hall Manager';
    switch (item.type) {
      case 'payments': return 'EvenrHall';
      case 'bookings': return  item && item.hallName || 'EventHall';
      default: return 'EventHall';
    }
  };

  const getAvatarColor = (item: Notification) => {
    switch (item.type) {
      case 'requests': return item.status === 'accepted' ? '#10B981' : item.status === 'rejected' ? '#EF4444' : '#F59E0B';
      case 'payments': return '#3B82F6';
      case 'bookings': return '#8B5CF6';
      case 'chats': return '#5B21B6';
      default: return '#6B7280';
    }
  };

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  useEffect(() => {
    const backAction = () => {
      if (showSelectionBar) {
        cancelSelection();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showSelectionBar]);

  const handleLongPress = (item: Notification) => {
    if (!selectedNotifications.includes(item.id)) {
      setSelectedNotifications([...selectedNotifications, item.id]);
      setShowSelectionBar(true);
    }
  };
  const handlePress = async (item: Notification) => {
    if (!userData) return; 
    if (showSelectionBar) {
      if (selectedNotifications.includes(item.id)) {
        const updated = selectedNotifications.filter(id => id !== item.id);
        setSelectedNotifications(updated);
        if (updated.length === 0) setShowSelectionBar(false);
      } else {
        setSelectedNotifications([...selectedNotifications, item.id]);
      }
      return;
    }
    if (item.type === 'chats' && item.bookingId) {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('targetUserId', '==', userData.uid),
          where('targetRole', '==', 'customer'),
          where('type', '==', 'chats'),
          where('bookingId', '==', item.bookingId)
        );
        const snapshot = await getDocs(q);
        
        const updatePromises = snapshot.docs.map(docSnap => 
          updateDoc(doc(db, 'notifications', docSnap.id), {
            status: 'read',
            unreadCount: 0,
          }))
        await Promise.all(updatePromises);
      } catch (e) {
        console.error('Failed to mark chat notifications as read:', e);
      }
    } else {
      if (!item.isRead) {
        try {
          await updateDoc(doc(db, 'notifications', item.id), { status: 'read' });
        } catch (e) {
          console.error('Failed to mark as read:', e);
        }
      }
    }
    if (item.type === 'chats') {
      router.push(`/(customerapp)/chat?bookingId=${item.bookingId}` as any);
    } else {
      router.push(`/(customerapp)/notification-detail?id=${item.id}&type=${item.type}&status=${item.status}&requestId=${item.bookingId}` as any);
    }
  };

  const handleDeleteSelected = async () => {
    Alert.alert(
      'Delete Notifications',
      `Delete ${selectedNotifications.length} notification(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const newDeletedIds = new Set(deletedIds);
            selectedNotifications.forEach(id => newDeletedIds.add(id));
            setDeletedIds(newDeletedIds);
            const dbDeletes = selectedNotifications
              .filter(id => dbNotifications.some(n => n.id === id))
              .map(id => deleteDoc(doc(db, 'notifications', id)));
            
            await Promise.all(dbDeletes);
            
            setSelectedNotifications([]);
            setShowSelectionBar(false);
          }
        }
      ]
    );
  };

  const cancelSelection = () => {
    setSelectedNotifications([]);
    setShowSelectionBar(false);
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const senderName = getSenderName(item);
    const avatarColor = getAvatarColor(item);
    const isSelected = selectedNotifications.includes(item.id);

    return (
      <TouchableOpacity 
        style={[
          styles.notificationItem, 
          !item.isRead && styles.unreadItem, 
          isSelected && styles.notificationItemSelected
        ]}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
        activeOpacity={0.7}
      >
        {isSelected && (
          <View style={styles.selectedCheckmark}>
            <Ionicons name="checkmark-circle" size={20} color="#5B21B6" />
          </View>
        )}

        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{getInitials(senderName)}</Text>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.senderName, !item.isRead && styles.unreadSender]}>
              {senderName}
            </Text>
            <Text style={[styles.timeText, !item.isRead && styles.unreadTime]}>
              {item.time}
            </Text>
          </View>
          
          <Text 
            style={[styles.messagePreview, !item.isRead && styles.unreadMessage]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.message}
          </Text>
        </View>

        {((item.unreadCount || 0) > 0) && !isSelected && (
          <View style={styles.countCircle}>
            <Text style={styles.countText}>{item.unreadCount}</Text>
          </View>
        )}

        {!item.isRead && !isSelected && !((item.unreadCount || 0) > 0) && (
          <View style={styles.unreadBadge}>
            <View style={styles.unreadDot} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, webContainerStyle]} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(customerapp)/home')}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.titleText}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filtersWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filter) => {
            const unreadCount = getUnreadCount(filter.id);
            const isActive = selectedFilter === filter.id;
            
            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setSelectedFilter(filter.id)}
              >
                <View style={styles.filterTextRow}>
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                    {filter.name}
                  </Text>
                  {unreadCount > 0 && (
                    <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
                      <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
                        {unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={60} color="#9CA3AF" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'all' 
                ? "You're all caught up!"
                : `No ${selectedFilter} notifications`}
            </Text>
          </View>
        }
      />
      
      <CustomerBottomNav />
      {showSelectionBar && (
        <View style={[styles.selectionBar, { zIndex: 1000, position: 'absolute', bottom: 0, left: 0, right: 0 }]}>
          <TouchableOpacity style={styles.selectionBarBtn} onPress={cancelSelection}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>            
          <Text style={styles.selectionBarCount}>
            {selectedNotifications.length} selected
          </Text>            
          <TouchableOpacity style={styles.selectionBarDeleteBtn} onPress={handleDeleteSelected}>
            <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, backgroundColor: '#FFFFFF' },
  titleText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  filtersWrapper: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filtersContent: { paddingHorizontal: 20, gap: 24 },
  filterTab: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterTabActive: { borderBottomColor: '#5B21B6' },
  filterTextRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  filterTextActive: { color: '#5B21B6', fontWeight: '600' },
  filterBadge: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 18, alignItems: 'center' },
  filterBadgeActive: { backgroundColor: '#EDE9FE' },
  filterBadgeText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  filterBadgeTextActive: { color: '#5B21B6' },
  listContainer: { paddingBottom: 100 },
  notificationItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', position: 'relative' },
  unreadItem: { backgroundColor: '#F9FAFB' },
  notificationItemSelected: { backgroundColor: '#F5F3FF', borderBottomColor: '#5B21B6' },
  selectedCheckmark: { position: 'absolute', top: 8, right: 8, zIndex: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  contentContainer: { flex: 1, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  senderName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  unreadSender: { fontWeight: '700' },
  timeText: { fontSize: 12, color: '#9CA3AF', marginLeft: 8 },
  unreadTime: { color: '#5B21B6', fontWeight: '600' },
  messagePreview: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  unreadMessage: { color: '#111827', fontWeight: '500' },
  unreadBadge: { justifyContent: 'center', alignItems: 'center', paddingLeft: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5B21B6' },
  countCircle: { backgroundColor: '#5B21B6', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, marginLeft: 8 },
  countText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, color: '#9CA3AF', marginTop: 16, fontWeight: '600', textAlign: 'center' },
  emptySubtext: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  selectionBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#5B21B6', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderTopWidth: 1, borderTopColor: '#E9D5FF', zIndex: 1000, elevation: 10 },
  selectionBarBtn: { padding: 8 },
  selectionBarCount: { flex: 1, fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  selectionBarDeleteBtn: { padding: 8 },
});