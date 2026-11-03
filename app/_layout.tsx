import 'react-native-gesture-handler'; 
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../backend/context/AuthContext';
import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';

if (Platform.OS === 'web') {
  LogBox.ignoreAllLogs();
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}> 
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(customerapp)" />
          <Stack.Screen name="(managerapp)" />
          <Stack.Screen name="(adminapp)" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}