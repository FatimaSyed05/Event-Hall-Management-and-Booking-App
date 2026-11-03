// app/(customerapp)/media-viewer.tsx (Ya app/(managerapp)/media-viewer.tsx)
import { View, StyleSheet, Image, TouchableOpacity, Text, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '../../constants/webstyles';

type MediaItem = {
  uri: string;
  type: 'image' | 'video';
};

export default function MediaViewerScreen() {
  const params = useLocalSearchParams();
  const isInitialized = useRef(false);
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    try {
      let parsedMedia: MediaItem[] = [];
      let initialIndex = 0;
      
      if (params.mediaFiles) {
        parsedMedia = JSON.parse(params.mediaFiles as string);
        initialIndex = parseInt(params.index as string || '0');
      } else if (params.uri && params.type) {
        parsedMedia = [{
          uri: params.uri as string,
          type: params.type as 'image' | 'video'
        }];
        initialIndex = parseInt(params.index as string || '0');
      }
      
      setMediaFiles(parsedMedia);
      setCurrentIndex(initialIndex);
    } catch (error) {
      console.error('Error parsing media:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const currentMedia = mediaFiles[currentIndex];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
      </SafeAreaView>
    );
  }

  if (!currentMedia) {
    return (
      <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
          <Text style={styles.errorText}>Media not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, webContainerStyle]}>
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        {mediaFiles.length > 1 && (
          <Text style={styles.counter}>
            {currentIndex + 1} / {mediaFiles.length}
          </Text>
        )}       
        
        <View style={styles.headerButton} />
      </View>

      <View style={styles.mediaContainer}>
        {currentMedia.type === 'image' ? (
          <Image 
            source={{ uri: currentMedia.uri }} 
            style={styles.fullImage}
            resizeMode="contain" 
          />
        ) : (
          <Video
            source={{ uri: currentMedia.uri.replace('file://', '') }}
            style={styles.fullVideo}
            useNativeControls 
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={true}
            onError={(error) => {
              console.log('Video Error:', error);
              Alert.alert('Error', 'Video format not supported or file corrupted');
            }}
          />
        )}
      </View>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  headerButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  counter: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  mediaContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }, // ✅ Pure black background for better viewing
  fullImage: { width: '100%', height: '100%' },
  fullVideo: { width: '100%', height: '100%' },
  loadingText: { fontSize: 16, color: '#FFFFFF' },
  errorText: { fontSize: 18, color: '#FFFFFF', marginTop: 16, marginBottom: 20, fontWeight: '600' },
  backButton: { backgroundColor: '#5B21B6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});