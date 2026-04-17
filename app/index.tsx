import { useEffect } from 'react';
import { router } from 'expo-router';
import { getAccessToken, isRole } from '../lib/auth-store';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = await getAccessToken();
    if (token) {
      const staffRole = await isRole('ROLE_STAFF');
      if (staffRole) {
        router.replace('/staff');
      } else {
        router.replace('/chatbot');
      }
    } else {
      router.replace('/login');
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
      <ActivityIndicator size="large" color="#22c55e" />
    </View>
  );
}
