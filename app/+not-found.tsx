import { router } from 'expo-router';
import { EmptyState, Screen } from '@/src/components/ui';

export default function NotFoundScreen() {
  return <Screen back>
    <EmptyState icon="compass-outline" title="Page introuvable" body="Ce lien ne correspond à aucun écran de l’application." action={{ label: 'Revenir à l’accueil', onPress: () => router.replace('/(tabs)' as any) }} />
  </Screen>;
}
