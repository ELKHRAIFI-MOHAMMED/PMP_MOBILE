import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/src/auth/AuthProvider';
import { Busy, palette } from '@/src/components/ui';

export default function TabsLayout() {
  const { loading, signedIn } = useAuth();
  if (loading) return <Busy />;
  if (!signedIn) return <Redirect href={'/(auth)/login' as any} />;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: palette.blue, tabBarInactiveTintColor: palette.muted, tabBarStyle: { height: 62, paddingTop: 5, paddingBottom: 6 } }}>
    <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarLabel: 'Accueil' }} />
    <Tabs.Screen name="markets" options={{ title: 'Marchés', tabBarLabel: 'Marchés' }} />
    <Tabs.Screen name="applications" options={{ title: 'Dossiers', tabBarLabel: 'Dossiers' }} />
    <Tabs.Screen name="estimates" options={{ title: 'Prix', tabBarLabel: 'Prix' }} />
    <Tabs.Screen name="more" options={{ title: 'Plus', tabBarLabel: 'Plus' }} />
  </Tabs>;
}
