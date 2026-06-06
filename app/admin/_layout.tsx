import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="employees" />
      <Stack.Screen name="subscription" />
      <Stack.Screen name="ai-settings" />
      <Stack.Screen name="organization-settings" />
    </Stack>
  );
}
