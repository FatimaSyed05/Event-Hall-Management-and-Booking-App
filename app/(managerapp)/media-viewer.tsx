// app/(managerapp)/media-viewer.tsx
import { View, StyleSheet, Image, TouchableOpacity, Text, Alert, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webContainerStyle } from '../../constants/webstyles';

type MediaItem = {
  uri: string;
  type: 'image' | 'video';
  publicId?: string;
};

export default function MediaViewerScreen() {
  const params = useLocalSearchParams();
  const isInitialized = useRef(false);
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const handleShare = async () => {
    if (!currentMedia) return;
    try {
      await Share.share({
        url: currentMedia.uri,
        message: `Check out this ${currentMedia.type === 'image' ? 'photo' : 'video'} from Event Hall App`,
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share media');
    }
  };
  const deleteMedia = async (publicId: string, resourceType: 'image' | 'video' = 'image') => {
    const response = await fetch('https://bondless-python-floral.ngrok-free.dev/api/delete-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId, resourceType }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete from Cloudinary');
    }
    
    return response.json();
  };

  const handleDelete = () => {
    if (!currentMedia) return;
    
    Alert.alert(
      'Delete Media',
      `Are you sure you want to delete this ${currentMedia.type === 'image' ? 'photo' : 'video'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              if (currentMedia.publicId) {
                const resourceType = currentMedia.type === 'video' ? 'video' : 'image';
                await deleteMedia(currentMedia.publicId, resourceType);
                console.log('Media deleted from Cloudinary');
              } else {
                console.log('No publicId found, deleting locally only');
              }

              const updatedMedia: MediaItem[] = mediaFiles.filter((_: MediaItem, i: number) => i !== currentIndex);
              
              if (updatedMedia.length === 0) {
                router.back();
              } else {
                const newIndex = currentIndex >= updatedMedia.length ? updatedMedia.length - 1 : currentIndex;
                setCurrentIndex(newIndex);
                setMediaFiles(updatedMedia);
                Alert.alert('Deleted', 'Media has been removed successfully');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete media. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };
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
              Alert.alert('Error', 'Video format not supported');
            }}
            onLoad={() => {
            console.log('Video loaded successfully');
            }}
          />
        )}
      </View>
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#FFFFFF" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#000000' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  mediaContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '100%' },
  fullVideo: { width: '100%', height: '100%' },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingBottom: 40, 
    marginBottom: 20, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20,
    marginHorizontal: 10, 
  },
  actionButton: { alignItems: 'center', gap: 4 },
  actionText: { fontSize: 11, color: '#FFFFFF', fontWeight: '500' },
  loadingText: { fontSize: 16, color: '#FFFFFF' },
  errorText: { fontSize: 18, color: '#FFFFFF', marginTop: 16, marginBottom: 20, fontWeight: '600' },
  backButton: { backgroundColor: '#5B21B6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});