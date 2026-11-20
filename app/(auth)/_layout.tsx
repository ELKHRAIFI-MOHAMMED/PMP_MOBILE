import { Redirect, Stack } from 'expo-router';
import { Busy } from '@/src/components/ui';
import { useAuth } from '@/src/auth/AuthProvider';

export default function AuthLayout() {
  const { loading, signedIn } = useAuth();
  if (loading) return <Busy />;
  if (signedIn) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
