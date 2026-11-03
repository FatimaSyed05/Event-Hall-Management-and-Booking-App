// app/(managerapp)/notifications.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, BackHandler } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo } from 'react';
import { webContainerStyle } from '@/constants/webstyles';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';
import { useAuth } from '../../backend/context/AuthContext';

type NotificationType = 'all' | 'requests' | 'payments' | 'halls' | 'messages' | 'chats';

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: string;
  iconColor: string;
  actionText?: string;
  actionUrl?: string;
  userData?: { name: string; avatar?: string };
  hallId?: string; 
  requestId?: string;
  bookingId?: string;
  isRejected?: boolean; 
  unreadCount?: number;
  _timestamp?: Date;
};

export default function NotificationsScreen() {
  const [activeFilter, setActiveFilter] = useState<NotificationType>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [showSelectionBar, setShowSelectionBar] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const { userData } = useAuth();
  const [dbNotifications, setDbNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userData?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('targetRole', '==', 'manager'),
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

        let notifType: NotificationType = 'messages';
        let title = d.title || d.sender || 'System';
        let icon = 'chatbubble-outline';
        let iconColor = '#5B21B6';
        let actionUrl = '/(managerapp)/chat';
        let isRejected = false;
        let reqId = d.requestId || d.bookingId || '';

        if (d.type === 'Halls' || d.type === 'halls') {
          notifType = 'halls';
          title = 'EH System';
          const isApproved = d.message?.toLowerCase().includes('approved');
          const isDisapproved = d.message?.toLowerCase().includes('rejected') || d.message?.toLowerCase().includes('disapproved');
          isRejected = isDisapproved;
          icon = isApproved ? 'checkmark-circle' : (isDisapproved ? 'close-circle' : 'business-outline');
          iconColor = isApproved ? '#10B981' : (isDisapproved ? '#EF4444' : '#5B21B6');
          actionUrl = isRejected ? '/(managerapp)/add-hall' : '/(managerapp)/hall-details';
          } else if (d.type === 'payments' || d.type === 'Payments') {
          notifType = 'payments';
          title = d.senderName || d.sender || 'Payment Received';
          icon = 'cash-outline';
          iconColor = '#10B981';
          actionUrl = 'PAYMENT_DETAILS';
          } else if (d.type === 'refunds' || d.type === 'Refunds') {
          notifType = 'payments';  
          title = d.senderName || 'Event Hall';  
          icon = 'refresh-circle';
          iconColor = '#EF4444';
          actionUrl = 'PAYMENT_DETAILS';
        } else if (d.type === 'bookings' || d.type === 'Bookings') {
          notifType = 'requests';
          title = d.senderName || d.sender || 'Booking Update';
          icon = 'close-circle-outline';
          iconColor = '#EF4444';
          actionUrl = 'BOOKING_DETAILS';
        } else if (d.type === 'requests') {
          notifType = 'requests';
          title = d.sender || 'New Request';
          icon = 'calendar-outline';
          iconColor = '#5B21B6';
          actionUrl = '/(managerapp)/request-details';
        } else if (d.type === 'messages' || d.type === 'chats') {
          notifType = 'messages';
          title = d.title || 'New Message';
          icon = 'chatbubble-outline';
          iconColor = '#5B21B6';
          actionUrl = '/(managerapp)/chat';
        }

        return {
          id: docSnap.id,
          type: notifType, 
          title: title,
          // message: d.message || 'Notification message',
          message: d.lastMessage || d.message || 'Notification message',  
          time: timeStr,
          read: d.status === 'read',
          icon: icon,
          iconColor: iconColor,
          actionUrl: actionUrl,
          hallId: d.hallId || '',
          requestId: reqId,
          bookingId: d.bookingId || reqId,
          isRejected: isRejected,
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
      const timeA = a._timestamp?.getTime() || 0;
      const timeB = b._timestamp?.getTime() || 0;
      return timeB - timeA; 
    });
  }, [dbNotifications]);

  const activeNotifications = useMemo(() => {
    return allNotifications.filter((n: Notification) => !deletedIds.has(n.id));
  }, [allNotifications, deletedIds]);

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification> = {};
    
    activeNotifications.forEach((notif: Notification) => {
      const groupKey = (notif.type === 'chats' || notif.type === 'messages') 
        ? `chat_${notif.requestId || notif.bookingId || notif.id}` 
        : `other_${notif.id}`;

      if (!groups[groupKey]) {
        groups[groupKey] = { 
          ...notif, 
          unreadCount: notif.read ? 0 : (notif.unreadCount || 1)
        };
      } else {
        if (!notif.read) {
          groups[groupKey].unreadCount = (groups[groupKey].unreadCount || 0) + (notif.unreadCount || 1);
        }
        const newTime = notif._timestamp?.getTime() || 0;
        const oldTime = groups[groupKey]._timestamp?.getTime() || 0;
        
        if (newTime > oldTime) {
          groups[groupKey].message = notif.message;
          groups[groupKey].time = notif.time;
          groups[groupKey]._timestamp = notif._timestamp;
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
    if (activeFilter === 'all') return groupedNotifications;
    return groupedNotifications.filter((n: Notification) => n.type === activeFilter);
  }, [groupedNotifications, activeFilter]);

  const unreadCounts = useMemo(() => ({
    all: groupedNotifications.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0),
    requests: groupedNotifications.filter(n => n.type === 'requests').reduce((acc, curr) => acc + (curr.unreadCount || 0), 0),
    payments: groupedNotifications.filter(n => n.type === 'payments').reduce((acc, curr) => acc + (curr.unreadCount || 0), 0),
    halls: groupedNotifications.filter(n => n.type === 'halls').reduce((acc, curr) => acc + (curr.unreadCount || 0), 0),
    messages: groupedNotifications.filter(n => n.type === 'messages').reduce((acc, curr) => acc + (curr.unreadCount || 0), 0),
  }), [groupedNotifications]);

  useEffect(() => {
    const backAction = () => {
      if (showSelectionBar) { cancelSelection(); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showSelectionBar]);

  const handleLongPress = (notification: Notification) => {
    if (!selectedNotifications.includes(notification.id)) {
      setSelectedNotifications([...selectedNotifications, notification.id]);
      setShowSelectionBar(true);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
  if (showSelectionBar) {
    if (selectedNotifications.includes(notification.id)) {
      const updated = selectedNotifications.filter(id => id !== notification.id);
      setSelectedNotifications(updated);
      if (updated.length === 0) setShowSelectionBar(false);
    } else {
      setSelectedNotifications([...selectedNotifications, notification.id]);
    }
    return;
  }
  
  if (!notification.read) {
    if (dbNotifications.some(n => n.id === notification.id)) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), { status: 'read' });
      } catch (e) { console.error('Failed to mark as read:', e); }
    } 
  } 
  
  if (notification.actionUrl === 'PAYMENT_DETAILS') {
    router.push(`/(managerapp)/notification-details?notificationId=${notification.id}` as any);
  }
  else if (notification.actionUrl === 'BOOKING_DETAILS') {
    router.push(`/(managerapp)/booking-details?bookingId=${notification.bookingId}` as any);
  }
  else if (notification.type === 'halls') {
    if (notification.isRejected) router.push('/(managerapp)/add-hall' as any);
    else router.push(`/(managerapp)/hall-details?id=${notification.hallId}` as any);
  }
  else if (notification.type === 'requests') {
    router.push(`/(managerapp)/request-details?requestId=${notification.requestId}` as any);
  }
  else if (notification.type === 'messages' || notification.type === 'chats') {
    router.push(`/(managerapp)/chat?bookingId=${notification.requestId || notification.bookingId}` as any);
  }
};
  // const handleNotificationPress = async (notification: Notification) => {
  //   if (showSelectionBar) {
  //     if (selectedNotifications.includes(notification.id)) {
  //       const updated = selectedNotifications.filter(id => id !== notification.id);
  //       setSelectedNotifications(updated);
  //       if (updated.length === 0) setShowSelectionBar(false);
  //     } else {
  //       setSelectedNotifications([...selectedNotifications, notification.id]);
  //     }
  //     return;
  //   }
    
  //   if (!notification.read) {
  //     if (dbNotifications.some(n => n.id === notification.id)) {
  //       try {
  //         await updateDoc(doc(db, 'notifications', notification.id), { status: 'read' });
  //       } catch (e) { console.error('Failed to mark as read:', e); }
  //     } 
  //   } 
    
  //   if (notification.type === 'halls' && notification.actionUrl) {
  //     if (notification.isRejected) router.push(notification.actionUrl as any);
  //     else router.push(`/(managerapp)/hall-details?id=${notification.hallId}` as any);
  //   } else if (notification.type === 'requests' && notification.actionUrl) {
  //     router.push(`/(managerapp)/request-details?requestId=${notification.requestId}` as any);
  //   } else if ((notification.type === 'messages' || notification.type === 'chats') && notification.actionUrl) {
  //     router.push(`/(managerapp)/chat?bookingId=${notification.requestId || notification.bookingId}` as any);
  //   } else if (notification.actionUrl) {
  //     router.push(notification.actionUrl as any); 
  //   }
  // };

  const handleDeleteSelected = async () => {
    Alert.alert('Delete Notifications', `Delete ${selectedNotifications.length} notification(s)?`, [
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
    ]);
  };

  const cancelSelection = () => { setSelectedNotifications([]); setShowSelectionBar(false); };

  const getInitials = (name: string) => name.charAt(0).toUpperCase();
  const getAvatarColor = (name: string) => {
    const colors = ['#10B981', '#EF4444', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
            <TouchableOpacity style={styles.tab} onPress={() => setActiveFilter('all')}>
              <Text style={[styles.tabText, activeFilter === 'all' && styles.tabTextActive]}>
                All {unreadCounts.all > 0 ? `(${unreadCounts.all})` : ''}
              </Text>
              {activeFilter === 'all' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab} onPress={() => setActiveFilter('requests')}>
              <Text style={[styles.tabText, activeFilter === 'requests' && styles.tabTextActive]}>
                Requests {unreadCounts.requests > 0 ? `(${unreadCounts.requests})` : ''}
              </Text>
              {activeFilter === 'requests' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab} onPress={() => setActiveFilter('payments')}>
              <Text style={[styles.tabText, activeFilter === 'payments' && styles.tabTextActive]}>
                Payments {unreadCounts.payments > 0 ? `(${unreadCounts.payments})` : ''}
              </Text>
              {activeFilter === 'payments' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab} onPress={() => setActiveFilter('halls')}>
              <Text style={[styles.tabText, activeFilter === 'halls' && styles.tabTextActive]}>
                Halls {unreadCounts.halls > 0 ? `(${unreadCounts.halls})` : ''}
              </Text>
              {activeFilter === 'halls' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab} onPress={() => setActiveFilter('messages')}>
              <Text style={[styles.tabText, activeFilter === 'messages' && styles.tabTextActive]}>
                Messages {unreadCounts.messages > 0 ? `(${unreadCounts.messages})` : ''}
              </Text>
              {activeFilter === 'messages' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false} contentContainerStyle={styles.notificationsContent}>
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No notifications</Text>
              <Text style={styles.emptySubtext}>{activeFilter === 'all' ? "You're all caught up!" : `No ${activeFilter} notifications`}</Text>
            </View>
          ) : (
           filteredNotifications.map((notification) => {
            const isSelected = selectedNotifications.includes(notification.id);
            const avatarColor = getAvatarColor(notification.title);
            
            return (
              <TouchableOpacity
                key={notification.id}
                style={[styles.notificationItem, !notification.read && styles.notificationItemUnread, isSelected && styles.notificationItemSelected]}
                onPress={() => handleNotificationPress(notification)}
                onLongPress={() => handleLongPress(notification)}
                delayLongPress={400}
                activeOpacity={0.7}
                >
                  {isSelected && (
                    <View style={styles.selectedCheckmark}>
                      <Ionicons name="checkmark-circle" size={20} color="#5B21B6" />
                    </View>
                  )}

                  <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                    <Text style={styles.avatarText}>{getInitials(notification.title)}</Text>
                  </View>

                  <View style={styles.notificationContent}>
                    <View style={styles.headerRow}>
                      <Text style={[styles.senderName, !notification.read && styles.senderNameUnread]}>
                        {notification.title}
                      </Text>
                      <Text style={styles.time}>{notification.time}</Text>
                    </View>
                    <Text style={[styles.message, !notification.read && styles.messageUnread]} numberOfLines={2}>
                      {notification.message}
                    </Text>
                  </View>

                  {((notification.unreadCount || 0) > 0) && !isSelected && (
                    <View style={styles.countCircle}>
                      <Text style={styles.countText}>{notification.unreadCount}</Text>
                    </View>
                  )}
                  
                  {!notification.read && !isSelected && !((notification.unreadCount || 0) > 0) && (
                    <View style={styles.unreadDot} />
                  )}
                </TouchableOpacity>
              );
            })
          )}          
          <View style={{ height: 100 }} />
        </ScrollView>

        {showSelectionBar && (
          <View style={styles.selectionBar}>
            <TouchableOpacity style={styles.selectionBarBtn} onPress={cancelSelection}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>            
            <Text style={styles.selectionBarCount}>{selectedNotifications.length} selected</Text>            
            <TouchableOpacity style={styles.selectionBarDeleteBtn} onPress={handleDeleteSelected}>
              <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', flex: 1 },
  tabsContainer: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tabsContent: { paddingHorizontal: 20 },
  tab: { paddingVertical: 12, paddingHorizontal: 4, marginRight: 24, alignItems: 'center', position: 'relative' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#111827', fontWeight: '600' },
  tabIndicator: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, backgroundColor: '#5B21B6', borderRadius: 1 },
  notificationsList: { flex: 1 },
  notificationsContent: { padding: 16 },
  notificationItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', position: 'relative', minHeight: 72 },
  notificationItemUnread: { backgroundColor: '#F9FAFB' },
  notificationItemSelected: { backgroundColor: '#F5F3FF' },
  selectedCheckmark: { position: 'absolute', top: 8, right: 8, zIndex: 10 },
  avatar: { width: 44, height: 44, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  notificationContent: { flex: 1, marginRight: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  senderName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  senderNameUnread: { fontWeight: '700' },
  time: { fontSize: 12, color: '#9CA3AF', marginLeft: 8 },
  message: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  messageUnread: { color: '#111827', fontWeight: '500' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5B21B6' },
  countCircle: { backgroundColor: '#5B21B6', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, marginLeft: 8 },
  countText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  selectionBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#5B21B6', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderTopWidth: 1, borderTopColor: '#E9D5FF' },
  selectionBarBtn: { padding: 8 },
  selectionBarCount: { flex: 1, fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  selectionBarDeleteBtn: { padding: 8 },
});