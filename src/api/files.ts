import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL, getAccessToken } from '@/src/api/client';

export async function downloadPrivateFile(path: string, filename: string) {
  if (Platform.OS === 'web') throw new Error('Le téléchargement sécurisé des documents est disponible dans la version Android/iOS.');
  if (!FileSystem.cacheDirectory) throw new Error('Le stockage temporaire du téléphone est indisponible.');
  const token = getAccessToken();
  if (!token) throw new Error('Reconnectez-vous pour télécharger ce document.');
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'document';
  const destination = `${FileSystem.cacheDirectory}${Date.now()}-${safeName}`;
  const result = await FileSystem.downloadAsync(`${API_BASE_URL}${path}`, destination, {
    headers: { Authorization: `Token ${token}`, Accept: '*/*' },
  });
  if (result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(destination, { idempotent: true });
    throw new Error(`Téléchargement refusé par le serveur (HTTP ${result.status}).`);
  }
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { dialogTitle: safeName });
  return result.uri;
}
