import { Redirect } from 'expo-router';
import { Busy } from '@/src/components/ui';
import { useAuth } from '@/src/auth/AuthProvider';

export default function Index() {
  const { loading, signedIn } = useAuth();
  if (loading) return <Busy label="Vérification de la session…" />;
  return <Redirect href={(signedIn ? '/(tabs)' : '/(auth)/login') as any} />;
}
