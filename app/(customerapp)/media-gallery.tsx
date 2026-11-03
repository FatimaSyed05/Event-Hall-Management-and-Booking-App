// app/(customerapp)/media-gallery.tsx
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '../../constants/webstyles';

type MediaItem = {
  uri: string;
  type: 'image' | 'video';
};

export default function MediaGalleryScreen() {
  const params = useLocalSearchParams();  
  const hallName = params.hallName ? decodeURIComponent(params.hallName as string) : 'Hall Media';
  
  let mediaFiles: MediaItem[] = [];
  if (params.mediaFiles) {
    try {
      mediaFiles = JSON.parse(params.mediaFiles as string);
    } catch (error) {
      console.error("Error parsing media files:", error);
      mediaFiles = []; 
    }
  }

  const handleMediaClick = (item: MediaItem) => {
    router.push(`/(customerapp)/media-viewer?uri=${encodeURIComponent(item.uri)}&type=${item.type}`);
  };

  const renderItem = ({ item, index }: { item: MediaItem; index: number }) => (
    <TouchableOpacity 
      style={styles.mediaItem}
      onPress={() => handleMediaClick(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} resizeMode="cover" />      
      {item.type === 'video' && (
        <View style={styles.videoOverlay}>
          <Ionicons name="play-circle" size={40} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{hallName}</Text>
          <View style={{ width: 40 }} /> 
        </View>

        {mediaFiles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No media available for this hall.</Text>
          </View>
        ) : (
          <FlatList
            data={mediaFiles}
            renderItem={renderItem}
            keyExtractor={(_, index) => index.toString()} 
            numColumns={2}
            contentContainerStyle={styles.galleryContainer}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,  borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  galleryContainer: { padding: 12, paddingBottom: 40 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  mediaItem: { width: '48%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6', position: 'relative' },
  mediaThumbnail: { width: '100%', height: '100%' },
  videoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.3)', justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12, textAlign: 'center' }
});