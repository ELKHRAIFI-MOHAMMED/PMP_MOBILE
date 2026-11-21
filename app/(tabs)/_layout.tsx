import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/auth/AuthProvider';
import { Busy } from '@/src/components/ui';
import { useUnreadNotifications } from '@/src/api/hooks';
import { font, useTheme } from '@/src/theme/tokens';

type IconPair = [React.ComponentProps<typeof Ionicons>['name'], React.ComponentProps<typeof Ionicons>['name']];
const icons: Record<string, IconPair> = {
  index: ['today', 'today-outline'],
  markets: ['briefcase', 'briefcase-outline'],
  applications: ['folder-open', 'folder-open-outline'],
  estimates: ['calculator', 'calculator-outline'],
  more: ['person-circle', 'person-circle-outline'],
};

export default function TabsLayout() {
  const { c } = useTheme();
  const { loading, signedIn } = useAuth();
  const unread = useUnreadNotifications();
  if (loading) return <Busy />;
  if (!signedIn) return <Redirect href={'/(auth)/login' as any} />;
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: c.accent,
    tabBarInactiveTintColor: c.inkFaint,
    tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11, lineHeight: 15, paddingBottom: 1 },
    tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line, ...(Platform.OS !== 'ios' ? { height: 68, paddingTop: 6, paddingBottom: 10 } : {}) },
    sceneStyle: { backgroundColor: c.bg },
    tabBarIcon: ({ focused, color, size }) => <Ionicons name={(icons[route.name] || icons.index)[focused ? 0 : 1]} size={size - 1} color={color as string} />,
  })}>
    <Tabs.Screen name="index" options={{ title: 'Aujourd’hui' }} />
    <Tabs.Screen name="markets" options={{ title: 'Marchés' }} />
    <Tabs.Screen name="applications" options={{ title: 'Dossiers' }} />
    <Tabs.Screen name="estimates" options={{ title: 'Prix' }} />
    <Tabs.Screen name="more" options={{ title: 'Compte', tabBarBadge: unread.data ? (unread.data > 9 ? '9+' : unread.data) : undefined, tabBarBadgeStyle: { backgroundColor: c.urgent, fontFamily: font.bold, fontSize: 11 } }} />
  </Tabs>;
}
