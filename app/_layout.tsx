import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="splash" />
          <Stack.Screen name="login" />
          <Stack.Screen name="chatbot" />
          <Stack.Screen name="history" />
          <Stack.Screen name="documents" />
          <Stack.Screen name="analytics" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="staff" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
