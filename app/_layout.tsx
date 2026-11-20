import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { AuthProvider } from '@/src/auth/AuthProvider';

export default function RootLayout() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false }, mutations: { retry: 0 } } }));
  return <QueryClientProvider client={client}><AuthProvider><Stack screenOptions={{ headerShown: false }} /></AuthProvider></QueryClientProvider>;
}
