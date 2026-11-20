import { create, isAxiosError, type AxiosError } from 'axios';
import { DeviceEventEmitter, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const API_BASE_URL = (configuredUrl || (__DEV__ ? 'http://127.0.0.1:8000/api/v1' : '')).replace(/\/$/, '');
const TOKEN_KEY = 'marches-publics.auth-token';
let accessToken: string | null = null;

export async function restoreToken() {
  accessToken = Platform.OS === 'web' ? null : await SecureStore.getItemAsync(TOKEN_KEY);
  return accessToken;
}

export async function saveToken(token: string) {
  accessToken = token;
  if (Platform.OS !== 'web') await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken() {
  accessToken = null;
  if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function setMemoryToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() { return accessToken; }

export const http = create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { Accept: 'application/json' },
});

http.interceptors.request.use((config) => {
  if (!API_BASE_URL) throw new Error('Configurez EXPO_PUBLIC_API_URL avant de lancer l’application.');
  const parsed = new URL(API_BASE_URL);
  if (parsed.username || parsed.password || (!__DEV__ && parsed.protocol !== 'https:') || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
    throw new Error('EXPO_PUBLIC_API_URL doit être une URL HTTPS de production sans identifiants intégrés. HTTP est réservé au développement local.');
  }
  if (accessToken) config.headers.Authorization = `Token ${accessToken}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await removeToken();
      DeviceEventEmitter.emit('mobile:session-expired');
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const data = error.response?.data as any;
    if (typeof data?.detail === 'string') return data.detail;
    if (typeof data?.error === 'string') return data.error;
    if (typeof data?.message === 'string') return data.message;
    if (error.code === 'ECONNABORTED') return 'Le serveur met trop de temps à répondre. Réessayez.';
    if (!error.response) return `Serveur inaccessible. Vérifiez l’URL de l’API (${API_BASE_URL || 'non configurée'}).`;
    return `La requête a échoué (HTTP ${error.response.status}).`;
  }
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };
export function asList<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export const endpoints = {
  auth: {
    login: '/auth/login/', register: '/auth/register/', me: '/auth/me/', logout: '/auth/logout/',
    changePassword: '/auth/change-password/',
  },
  dashboard: '/client/reports/dashboard/',
  markets: '/marches/',
  analyses: '/my-analyses/',
  dossiers: '/client/dossier-preparation/',
  estimates: '/client/price-estimation/estimates/',
  features: {
    notifications: '/notifications/', documents: '/documents/', templates: '/document-templates/',
    generatedDocuments: '/generated-documents/', reports: '/client/reports/', invoices: '/invoices/',
    calendar: '/client/calendar/', tasks: '/client/calendar/tasks/', guarantees: '/client/guarantees/',
    subscriptions: '/subscriptions/user-subscriptions/', plans: '/subscriptions/plans/',
    usage: '/subscriptions/usage/', marketplace: '/marketplace/', companies: '/companies/',
    favorites: '/favorites/', payments: '/payments/requests/',
    finance: '/client/finance/', compliance: '/conformite/', priceHistory: '/client/price-estimation/history/',
    users: '/users/', permissions: '/permissions/permissions/', paymentRequests: '/payments/requests/',
    paymentMethods: '/payments/methods/', aiResults: '/ai-results/',
  },
} as const;
