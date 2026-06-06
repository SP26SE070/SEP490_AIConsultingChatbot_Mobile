import { Stack } from 'expo-router';

export default function TabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="chatbot" />
      <Stack.Screen name="history" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
