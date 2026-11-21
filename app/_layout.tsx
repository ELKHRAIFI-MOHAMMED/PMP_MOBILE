import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts, PublicSans_400Regular, PublicSans_500Medium, PublicSans_600SemiBold, PublicSans_700Bold, PublicSans_800ExtraBold,
} from '@expo-google-fonts/public-sans';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider } from '@/src/auth/AuthProvider';
import { useTheme } from '@/src/theme/tokens';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const { c, dark } = useTheme();
  const [loaded, error] = useFonts({
    PublicSans_400Regular, PublicSans_500Medium, PublicSans_600SemiBold, PublicSans_700Bold, PublicSans_800ExtraBold,
    ...Ionicons.font,
  });
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false }, mutations: { retry: 0 } },
  }));

  useEffect(() => { if (loaded || error) void SplashScreen.hideAsync().catch(() => undefined); }, [loaded, error]);
  if (!loaded && !error) return null;

  return <SafeAreaProvider>
    <QueryClientProvider client={client}>
      <AuthProvider>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'default' }} />
      </AuthProvider>
    </QueryClientProvider>
  </SafeAreaProvider>;
}
