// app/(managerapp)/media-gallery.tsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '../../constants/webstyles';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../backend/config/firebaseConfig';

type MediaItem = {
  uri: string;
  type: 'image' | 'video';
  publicId?: string;
};

type HallData = {
  id: string;
  hallName: string;
  mediaFiles: MediaItem[];
};

export default function HallMediaScreen() {
  const params = useLocalSearchParams();
  const hallId = params.hallId as string;
  
  const [hall, setHall] = useState<HallData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHallMedia = async () => {
      if (!hallId) {
        setIsLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'halls', hallId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setHall({
            id: docSnap.id,
            hallName: data.hallName || 'Hall',
            mediaFiles: data.mediaFiles || [],
          });
        }
      } catch (error) {
        console.error('Error fetching hall media:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHallMedia();
  }, [hallId]);

  const handleMediaPress = (index: number) => {
    if (!hall) return;
    
    router.push({
      pathname: '/(managerapp)/media-viewer' as any,
      params: {
        mediaFiles: JSON.stringify(hall.mediaFiles),
        index: index.toString()
      }
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B21B6" />
          <Text style={styles.loadingText}>Loading media...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hall || hall.mediaFiles.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Media</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={60} color="#D1D5DB" />
            <Text style={styles.emptyText}>No media uploaded yet</Text>
            <Text style={styles.emptySubtext}>Add photos and videos to showcase your hall</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{hall.hallName} - Media</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {hall.mediaFiles.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.mediaItem}
                onPress={() => handleMediaPress(index)}
                activeOpacity={0.9}
              >
                {item.type === 'image' ? (
                  <Image source={{ uri: item.uri }} style={styles.mediaImage} resizeMode="cover" />
                ) : (
                  <View style={styles.videoContainer}>
                    <Image source={{ uri: item.uri }} style={styles.mediaImage} resizeMode="cover" />
                    <View style={styles.playIcon}>
                      <Ionicons name="play" size={24} color="#FFFFFF" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  mediaItem: { width: '47%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F9FAFB' },
  mediaImage: { width: '100%', height: '100%' },
  videoContainer: { position: 'relative', width: '100%', height: '100%' },
  playIcon: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -20 }, { translateY: -20 }], width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(91, 33, 182, 0.9)', justifyContent: 'center', alignItems: 'center' },
});