// app/(customerapp)/settings.tsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '../../constants/webstyles';
import { useAuth } from '../../backend/context/AuthContext';

export default function SettingsScreen() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [locationAccess, setLocationAccess] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { deleteAccount } = useAuth(); 

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Forever', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              Alert.alert('Deleted', 'Your account has been permanently deleted.');
              router.replace('/(auth)/login');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const SettingItem = ({ icon, title, onPress, rightComponent, isDestructive }: any) => (
    <TouchableOpacity 
      style={[styles.item, isDestructive && styles.destructiveItem]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconContainer, isDestructive && styles.destructiveIcon]}>
          <Ionicons name={icon} size={20} color={isDestructive ? '#EF4444' : '#5B21B6'} />
        </View>
        <Text style={[styles.itemTitle, isDestructive && styles.destructiveText]}>{title}</Text>
      </View>
      {rightComponent || <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.titleText}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <SettingItem 
          icon="notifications-outline" 
          title="Notifications" 
          rightComponent={
            <Switch 
              value={pushNotifications} 
              onValueChange={setPushNotifications}
              trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
              thumbColor={pushNotifications ? '#5B21B6' : '#F3F4F6'}
            />
          }
        />

        <SettingItem 
          icon="location-outline" 
          title="Location Access" 
          rightComponent={
            <Switch 
              value={locationAccess} 
              onValueChange={setLocationAccess}
              trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
              thumbColor={locationAccess ? '#5B21B6' : '#F3F4F6'}
            />
          }
        />

        <SettingItem 
          icon="moon-outline" 
          title="Dark Mode" 
          rightComponent={
            <Switch 
              value={isDarkMode} 
              onValueChange={setIsDarkMode}
              trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
              thumbColor={isDarkMode ? '#5B21B6' : '#F3F4F6'}
            />
          }
        />

        <View style={styles.divider} />
        <SettingItem 
          icon="alert-circle-outline" 
          title="Report a Problem" 
          onPress={() => Alert.alert('Report', 'Please describe the issue you are facing.')} 
        />
        <SettingItem 
          icon="information-circle-outline" 
          title="App Version" 
          rightComponent={<Text style={styles.versionText}>v1.0.0</Text>}
        />

        <View style={styles.divider} />
        <SettingItem 
          icon="trash-outline" 
          title="Delete Account" 
          onPress={handleDeleteAccount}
          isDestructive
        />

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 },
  titleText: { fontSize: 24, fontWeight: '700', color: '#111827' },
  content: { paddingHorizontal: 24, paddingTop: 10 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  destructiveItem: { borderBottomColor: '#FEE2E2' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  destructiveIcon: { backgroundColor: '#FEE2E2' },
  itemTitle: { fontSize: 15, fontWeight: '500', color: '#111827' },
  destructiveText: { color: '#EF4444' },
  versionText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  divider: { height: 10, backgroundColor: '#F9FAFB', marginVertical: 10, marginHorizontal: -24 },
});