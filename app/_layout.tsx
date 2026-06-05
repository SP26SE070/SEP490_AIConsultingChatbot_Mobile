import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationProvider } from '../lib/notification';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NotificationProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="splash" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="change-password" />
            <Stack.Screen name="chatbot" />
            <Stack.Screen name="history" />
            <Stack.Screen name="documents" />
            <Stack.Screen name="analytics" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="admin/employees" />
            <Stack.Screen name="admin/subscription" />
            <Stack.Screen name="admin/ai-settings" />
            <Stack.Screen name="admin/organization-settings" />
          </Stack>
        </NotificationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
