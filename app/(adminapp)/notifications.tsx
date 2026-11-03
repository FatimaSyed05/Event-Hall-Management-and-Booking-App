// app/(adminapp)/notifications.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, BackHandler } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import AdminBottomNav from '../../components/admin-bottom-nav'; 
import { webContainerStyle } from '@/constants/webstyles';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

interface NotificationData {
  id: string;
  type: string;
  sender: string;
  senderId: string;
  message: string;
  timestamp: any;
  status: string;
  action: string;
  hallId?: string;
  bookingId?: string;
  requestId?: string;
  rawTimestamp?: number; 
  withdrawalId?: string;
}

export default function NotificationsScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  useEffect(() => {
  const q = query(
    collection(db, 'notifications'),
    where('targetRole', '==', 'admin'),
  );

  const unsubscribe = onSnapshot(
    q, 
    (snapshot: any) => {
      const data: NotificationData[] = snapshot.docs.map((docSnap: any) => {
        const d = docSnap.data();
        let formattedTime = 'Just now';
        try {
          if (d.timestamp) {
            const date = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
            if (!isNaN(date.getTime())) {
              const now = new Date();
              const isToday = date.toDateString() === now.toDateString();
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              formattedTime = isToday ? `Today, ${timeStr}` : date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${timeStr}`;
            }
          }
        } catch (e) {
          formattedTime = 'Just now'; 
        }

        let notificationType = d.type || 'Users';
        if (notificationType === 'requests' || notificationType === 'bookings') {
          notificationType = 'Bookings';
        } else if (notificationType === 'payments') {
          notificationType = 'Payments';
        } else if (notificationType === 'withdrawal_request') {
          notificationType = 'Withdrawals';
        } else if (notificationType === 'Halls' || notificationType === 'halls') {
          notificationType = 'Halls';
        }

        let senderName = d.senderName || d.sender || d.managerName || d.customerName || 'System';
        let senderId = d.managerId || d.senderId || d.customerId || '';
        let action = d.action;
        if (!action) {
          if (notificationType === 'Bookings') action = 'booking-details';
          else if (notificationType === 'Payments') action = 'booking-details';
          else if (notificationType === 'Withdrawals') action = 'withdrawals';
          else if (notificationType === 'Halls') action = 'hall-details';
          else action = 'account-details';
        }

        return {
          id: docSnap.id,
          type: notificationType,
          sender: senderName,
          senderId: senderId,
          hallId: d.hallId || '',
          bookingId: d.bookingId || '',
          requestId: d.requestId || '',
          withdrawalId: d.withdrawalId || '', 
          message: d.message || 'New notification',
          timestamp: d.timestamp ? formattedTime : 'Just now',
          status: d.status || 'unread',
          action: action,
          rawTimestamp: d.timestamp?.toMillis ? d.timestamp.toMillis() : 0
        };
      });
      data.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
      setNotifications(data);
      setIsLoading(false);
    },
    (error: any) => {
      console.error("Notification listener error:", error);
      setIsLoading(false);
    }
  );

  return () => unsubscribe();
}, []);

  const filters = ['All', 'Users', 'Halls', 'Payments', 'Withdrawals', 'Bookings'];
   const filteredNotifications = activeFilter === 'All'
    ? notifications
    : notifications.filter(n => n.type === activeFilter);
    const unreadCounts = {
      All: notifications.filter(n => n.status === 'unread').length,
      Users: notifications.filter(n => n.type === 'Users' && n.status === 'unread').length,
      Halls: notifications.filter(n => n.type === 'Halls' && n.status === 'unread').length,
      Payments: notifications.filter(n => n.type === 'Payments' && n.status === 'unread').length,
      Withdrawals: notifications.filter(n => n.type === 'Withdrawals' && n.status === 'unread').length,
      Bookings: notifications.filter(n => n.type === 'Bookings' && n.status === 'unread').length,
    };

  //   const formatTimestamp = (ts: any) => {
  //   if (!ts) return 'Just now';
  //   const date = ts.toDate ? ts.toDate() : new Date(ts);
  //   const now = new Date();
  //   const isToday = date.toDateString() === now.toDateString();
  //   const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
  //   if (isToday) return `Today, ${timeStr}`;
  //   return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${timeStr}`;
  // };

  const handleNotificationPress = async (notification: NotificationData) => {
    if (isSelectionMode) {
      toggleSelection(notification.id);
    } else {
      if (notification.status === 'unread') {
        await updateDoc(doc(db, 'notifications', notification.id), { status: 'read' });
      }
      
      if (notification.action === 'hall-details' && notification.hallId) {
        router.push({
          pathname: '/(adminapp)/hall-details' as any,
          params: { hallId: notification.hallId }
        });
      } 
      else if (notification.action === 'booking-details') {
        const targetId = notification.bookingId || notification.requestId;
        if (targetId) {
          router.push({
            pathname: '/(adminapp)/booking-details' as any,
            params: { bookingId: targetId }
          });
        } else {
          Alert.alert('Error', 'Booking information not available');
        }
      }
      else if (notification.action === 'withdrawals' || notification.action === 'withdrawal-details') {
        router.push({
          pathname: '/(adminapp)/withdrawals' as any,
          params: { withdrawalId: notification.withdrawalId } 
        });
      }
      else if (notification.action === 'managers' && notification.senderId) {
        router.push({
          pathname: '/(adminapp)/managers' as any,
          params: { managerId: notification.senderId }
        });
      }
      else if (notification.action === 'account-details') {
        handleAvatarPress(notification);
      }
      else {
        Alert.alert('Info', notification.message);
      }
    }
  };

  // const handleNotificationPress = (notification: any) => {
  //   if (isSelectionMode) {
  //     toggleSelection(notification.id);
  //   } else {
  //     if (notification.action === 'hall-details') {
  //       router.push('/(adminapp)/halls' as any);
  //     } else if (notification.action === 'booking-details') {
  //       router.push('/(adminapp)/booking-details' as any);
  //     } else if (notification.action === 'withdrawals') {
  //       router.push('/(adminapp)/withdrawals' as any);
  //     } else if (notification.action === 'managers') {
  //       router.push('/(adminapp)/managers' as any);
  //     } else if (notification.action === 'account-details') {
  //       handleAvatarPress(notification);
  //     }
  //   }
  // };

  const handleLongPress = (id: string) => {
    setIsSelectionMode(true);
    setSelectedIds([id]);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev: string[]) => {
      if (prev.includes(id)) {
        const newIds = prev.filter(i => i !== id);
        if (newIds.length === 0) setIsSelectionMode(false);
        return newIds;
      }
      return [...prev, id];
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Notifications',
      `Are you sure you want to delete ${selectedIds.length} notification(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const deletePromises = selectedIds.map(id => deleteDoc(doc(db, 'notifications', id)));
            await Promise.all(deletePromises);
            setSelectedIds([]);
            setIsSelectionMode(false);
          }
        }
      ]
    );
  };
  //  const handleDelete = () => {
  //   Alert.alert(
  //     'Delete Notifications',
  //     `Are you sure you want to delete ${selectedIds.length} notification(s)?`,
  //     [
  //       { text: 'Cancel', style: 'cancel' },
  //       { 
  //         text: 'Delete', 
  //         style: 'destructive',
  //         onPress: () => {
  //           setNotifications(prev => prev.filter(n => !selectedIds.includes(n.id)));
            
  //           // Reset selection state
  //           setSelectedIds([]);
  //           setIsSelectionMode(false);
  //         }
  //       }
  //     ]
  //   );
  // };

  const handleBackAction = () => {
    if (isSelectionMode) {
      setSelectedIds([]);
      setIsSelectionMode(false);
      return true;
    }
    if (activeFilter !== 'All') {
      setActiveFilter('All');
      return true;
    }
    return false;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackAction);
    return () => backHandler.remove();
  }, [isSelectionMode, activeFilter]);

  const onHeaderBackPress = () => {
    if (!handleBackAction()) {
      router.back();
    }
  };

    const handleAvatarPress = async (notification: NotificationData) => {
    if (!isSelectionMode) {
      if (!notification.senderId) {
        Alert.alert('Error', 'User information not available for this notification.');
        return;
      }

      try {
        const userRef = doc(db, 'users', notification.senderId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          router.push({
            pathname: '/(adminapp)/account-details' as any,
            params: { 
              userData: JSON.stringify({
                id: userSnap.id,
                name: userData.name || notification.sender,
                role: userData.role || 'Managers', 
                status: userData.approvalStatus === 'approved' ? 'Active' : (userData.approvalStatus || 'Pending'),
                email: userData.email || 'N/A',
                phone: userData.phone || 'N/A',
                address: userData.address || 'N/A',
                docName: userData.verificationDoc ? 'Document Uploaded' : 'N/A',
                docUri: userData.verificationDoc || '',
                halls: userData.halls || [], 
              }) 
            }
          });
        } else {
          Alert.alert('Not Found', 'This user account no longer exists in the database.');
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
        Alert.alert('Error', 'Failed to load user account details.');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onHeaderBackPress} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
         {filters.map((filter) => {
            const count = unreadCounts[filter as keyof typeof unreadCounts] || 0;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={styles.filterTab}
              >
                <Text style={[
                  styles.filterText,
                  activeFilter === filter && styles.filterTextActive
                ]}>
                  {filter} {count > 0 ? `(${count})` : ''}
                </Text>
                {activeFilter === filter && <View style={styles.filterUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isSelectionMode && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>
            {selectedIds.length} selected
          </Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.listContainer}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {filteredNotifications.map((notification) => {
            const isSelected = selectedIds.includes(notification.id);
            return (
              <TouchableOpacity
                key={notification.id}
                onPress={() => handleNotificationPress(notification)}
                onLongPress={() => handleLongPress(notification.id)}
                activeOpacity={0.7}
                style={[
                  styles.notificationItem,
                  isSelected && styles.selectedItem
                ]}
              >
                <TouchableOpacity
                  onPress={() => handleAvatarPress(notification)}
                  activeOpacity={0.7}
                  style={styles.avatarContainer}
                >
                  <View style={styles.avatar}>
                    <Ionicons name="person-circle" size={40} color="#5B21B6" />
                  </View>
                </TouchableOpacity>

                <View style={styles.content}>
                  <Text style={styles.senderName}>{notification.sender}</Text>
                  <Text style={styles.message}>{notification.message}</Text>
                  <View style={styles.bottomRow}>
                    <Text style={styles.timestamp}>{notification.timestamp}</Text>
                    {notification.status === 'unread' && <View style={styles.unreadDot} />}
                  </View>
                </View>

                {isSelectionMode && (
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      
      <AdminBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  filtersContainer: { borderBottomWidth: 1, borderBottomColor: '#e6dcdc89', backgroundColor: '#FFFFFF' },
  filtersContent: { paddingHorizontal: 20 },
  filterTab: { paddingVertical: 12, paddingHorizontal: 4, marginRight: 24, alignItems: 'center', position: 'relative' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#5B21B6', fontWeight: '700' },
  filterUnderline: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, backgroundColor: '#5B21B6' },
  selectionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#5B21B6' },
  selectionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  deleteBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  listContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { paddingBottom: 100 },
  notificationItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  selectedItem: { backgroundColor: '#F5F3FF' },
  avatarContainer: { marginRight: 14, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  senderName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  message: { fontSize: 14, color: '#6B7280', marginBottom: 8, flexWrap: 'wrap', paddingRight: 20 },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },
  timestamp: { fontSize: 12, color: '#9CA3AF' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6', marginLeft: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', marginLeft: 12, marginTop: 2 },
  checkboxSelected: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
});