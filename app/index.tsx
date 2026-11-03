// app/index.tsx
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, Platform } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const onboardingData = [
  {
    title: "Discover Perfect Event Halls",
    description: "Explore thousands of wedding halls, banquet centers and event venues near you. Find the ideal space for your special occasions.",
    image: require('../assets/images/onboarding1.jpg'),
    buttonText: "Next",
  },
  {
    title: "Book in Just a Few Taps",
    description: "Simple and fast booking process. Check availability, compare prices, chat with managers and reserve your dream hall instantly without any hassle.",
    image: require('../assets/images/onboarding2.jpg'),
    buttonText: "Next",
  },
  {
    title: "Manage Your Halls & Bookings",
    description: "If you are a Hall Manager: List your venue, manage bookings, track payments and grow your business with our powerful manager tools.",
    image: require('../assets/images/onboarding3.jpg'),
    buttonText: "Get Started",
  },
];

export default function OnboardingScreen() {
  if (Platform.OS === 'web') {
    return <Redirect href="/(auth)/login" />;
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(slideIndex);
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: width * (currentIndex + 1),
        animated: true,
      });
    } else {
      router.push('/(auth)/login');
    }
  };

  const handleSkip = () => {
    router.push('/(auth)/login');
  };

  return (
    // <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 60 }} />
          {currentIndex < 2 && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
        >
          {onboardingData.map((screen, index) => (
            <View key={index} style={styles.slide}>
              
              {/* Logo */}
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>
                  <Text style={{ color: '#E74C3C' }}>V</Text>
                  <Text style={{ color: '#3498DB' }}>E</Text>
                  <Text style={{ color: '#2ECC71' }}>N</Text>
                  <Text style={{ color: '#F39C12' }}>U</Text>
                  <Text style={{ color: '#9B59B6' }}>E</Text>
                </Text>
              </View>

              <View style={styles.imageContainer}>
                <Image source={screen.image} style={styles.image} resizeMode="contain" />
              </View>

              <Text style={styles.heading}>{screen.title}</Text>
              <Text style={styles.description}>{screen.description}</Text>
              
              <TouchableOpacity style={styles.button} onPress={handleNext}>
                <Text style={styles.buttonText}>{screen.buttonText}</Text>
              </TouchableOpacity>
              
              <View style={styles.dotsContainer}>
                {onboardingData.map((_, dotIndex) => (
                  <View 
                    key={dotIndex} 
                    style={[styles.dot, dotIndex === currentIndex && styles.activeDot]} 
                  />
                ))}
              </View>

            </View>
          ))}
        </ScrollView>
      </View>
    // </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 10 },
  skipButton: { paddingHorizontal: 16, paddingVertical: 8 },
  skipText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  slide: { width: width, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  logoContainer: { marginBottom: 30, marginTop: 20 },
  logoText: { fontSize: 36, fontWeight: '900', letterSpacing: 4 },
  imageContainer: { width: '100%', height: 250, marginBottom: 30, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 16, lineHeight: 28 },
  description: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 40, paddingHorizontal: 10 },
  button: { backgroundColor: '#5B21B6', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 30 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  activeDot: { backgroundColor: '#5B21B6', width: 24 },
});