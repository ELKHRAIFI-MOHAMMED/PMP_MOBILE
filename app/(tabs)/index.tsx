import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';
import { endpoints, http, errorMessage } from '@/src/api/client';
import { useAuth } from '@/src/auth/AuthProvider';
import { Busy, Card, Heading, Notice, Row, Screen, palette } from '@/src/components/ui';

export default function HomeScreen() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['dashboard'], queryFn: async () => (await http.get(endpoints.dashboard)).data });
  const data = query.data || {};
  const shortcuts = [
    ['Rechercher des marchés', '/(tabs)/markets'], ['Mes candidatures', '/(tabs)/applications'],
    ['Estimations de prix', '/(tabs)/estimates'], ['Notifications', '/features/notifications'],
  ] as const;
  return <Screen>
    <Text style={{ color: palette.blue, fontWeight: '800', letterSpacing: 1 }}>TRUEAI · MARCHÉS PUBLICS</Text>
    <Heading title={`Bonjour ${user?.first_name || 'et bienvenue'}`} subtitle="Votre espace entreprise, connecté aux données de votre compte." />
    {query.isPending ? <Busy label="Chargement du tableau de bord…" /> : query.isError ? <Notice tone="error">{errorMessage(query.error)}</Notice> : (
      <Card><Text style={{ color: palette.ink, fontSize: 17, fontWeight: '800' }}>Activité récente</Text>
        <Row title="Marchés suivis" right={String(data.kpis?.markets_count ?? data.markets_count ?? '—')} />
        <Row title="Analyses" right={String(data.kpis?.analyses_count ?? data.analyses_count ?? '—')} />
        <Row title="Dossiers de candidature" right={String(data.kpis?.applications_count ?? data.applications_count ?? '—')} />
        {data.notice ? <Notice>{String(data.notice)}</Notice> : null}
      </Card>
    )}
    {!user?.profile_completed ? <Notice>Complétez le profil de votre entreprise avant de lancer les analyses qui le nécessitent.</Notice> : null}
    <Card><Text style={{ color: palette.ink, fontSize: 17, fontWeight: '800' }}>Accès rapide</Text>{shortcuts.map(([title, href]) => <Link key={title} href={href as any} asChild><Row title={title} right="Ouvrir" /></Link>)}</Card>
    <Card><Text style={{ color: palette.muted, fontSize: 13 }}>Les marchés et dossiers proviennent du backend existant. Les appels de scraping passent par Django; l’application mobile n’accède pas directement aux services internes.</Text></Card>
  </Screen>;
}
