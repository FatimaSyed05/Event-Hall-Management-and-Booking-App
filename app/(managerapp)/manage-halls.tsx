// app/(managerapp)/manage-halls.tsx
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const myHalls = [
  { id: '1', name: 'Imperial Hall', location: 'Wapda Town, Lahore', price: '45,000' },
  { id: '2', name: 'Grand Regency Hall', location: 'Wapda Town, Lahore', price: '32,000' },
  { id: '3', name: 'Royal Event Marquee', location: 'Wapda Town, Lahore', price: '58,000' },
];

export default function ManageHallsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Hall Information</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hall List</Text>
          <TouchableOpacity onPress={() => router.push('/(managerapp)/add-hall' as any)}>
            <Ionicons name="add-circle-outline" size={28} color="#5B21B6" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={myHalls}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.hallCard}
              onPress={() => router.push(`/(managerapp)/hall-details?id=${item.id}` as any)}
            >
              <View style={styles.hallImage}>
                <Ionicons name="business" size={40} color="#C4B5FD" />
              </View>
              <View style={styles.hallInfo}>
                <Text style={styles.hallName}>{item.name}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text style={styles.locationText}>{item.location}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.viewButton}>
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { paddingHorizontal: 24, flex: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  hallCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 12 },
  hallImage: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  hallInfo: { flex: 1 },
  hallName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: '#6B7280' },
  viewButton: { backgroundColor: '#5B21B6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  viewButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});