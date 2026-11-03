// components/HallMapModal.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapComponent, Marker } from './MapComponent';

type Props = {
  visible: boolean;
  onClose: () => void;
  mapRef: React.RefObject<any>;
  mapRegion: any;
  tempMarker: { latitude: number; longitude: number } | null;
  onMapPress: (e: any) => void;
  onDragEnd: (e: any) => void;
  onConfirm: () => void;
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  isLocating: boolean;
  onUseCurrentLocation: () => void;
};

const HallMapModal = React.memo(function HallMapModal({
  visible, onClose, mapRef, mapRegion, tempMarker, onMapPress, onDragEnd,
  onConfirm, searchQuery, setSearchQuery, onSearch, isSearching, isLocating, onUseCurrentLocation,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.mapModalContainer}>
        <View style={styles.mapModalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={26} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.mapModalTitle}>Select Hall Location</Text>
          <View style={{ width: 30 }} />
        </View>

        {Platform.OS !== 'web' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginLeft: 12 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search location (e.g., Sheikhupura)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={onSearch}
              returnKeyType="search"
            />
            <TouchableOpacity onPress={onSearch} style={{ paddingHorizontal: 12 }}>
              {isSearching ? <ActivityIndicator size="small" color="#5B21B6" /> : <Ionicons name="arrow-forward-circle" size={22} color="#5B21B6" />}
            </TouchableOpacity>
          </View>
        </View>
        )}

        <View style={styles.mapContainer}>
          <MapComponent ref={mapRef} style={styles.map} region={mapRegion} onPress={onMapPress}>
            {tempMarker && (
              <Marker coordinate={tempMarker} draggable onDragEnd={onDragEnd} />
            )}
          </MapComponent>
          <TouchableOpacity style={styles.currentLocationBtn} onPress={onUseCurrentLocation} disabled={isLocating}>
            {isLocating ? <ActivityIndicator size="small" color="#5B21B6" /> : <Ionicons name="navigate" size={22} color="#5B21B6" />}
          </TouchableOpacity>
          <Text style={styles.mapInstructionText}>
            {Platform.OS === 'web' ? 'Click on the map to place the pin' : 'Drag map to adjust the pin'}
          </Text>
        </View>

        <View style={styles.mapModalFooter}>
          <TouchableOpacity style={styles.mapCancelButton} onPress={onClose}>
            <Text style={styles.mapCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapConfirmButton, !tempMarker && styles.mapConfirmButtonDisabled]}
            onPress={onConfirm}
            disabled={!tempMarker}
          >
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.mapConfirmText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

export default HallMapModal;

const styles = StyleSheet.create({
  mapModalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  mapModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  mapModalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 4 },
  searchInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, color: '#111827' },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  currentLocationBtn: { position: 'absolute', bottom: 20, right: 20, width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  mapInstruction: { position: 'absolute', top: 20, left: 20, right: 20, backgroundColor: 'rgba(91, 33, 182, 0.9)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  mapInstructionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  mapModalFooter: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFFFFF' },
  mapCancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#F3F4F6' },
  mapCancelText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  mapConfirmButton: { flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5B21B6', gap: 8 },
  mapConfirmButtonDisabled: { backgroundColor: '#D1D5DB' },
  mapConfirmText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});