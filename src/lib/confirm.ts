import { Alert, Platform } from 'react-native';

/**
 * Confirmation dialog that works everywhere: native Alert on iOS/Android,
 * window.confirm on web (react-native-web's Alert.alert is a no-op).
 */
export function confirmAction(title: string, message: string, confirmLabel: string, destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}

/** Informational message that also shows on web. */
export function notify(title: string, message: string) {
  if (Platform.OS === 'web') { if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`); return; }
  Alert.alert(title, message);
}
