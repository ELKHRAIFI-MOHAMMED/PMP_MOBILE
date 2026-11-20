import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';
import { asList, endpoints, http, errorMessage } from '@/src/api/client';
import { Busy, Card, Heading, Notice, Row, Screen } from '@/src/components/ui';
import type { ApplicationDossier } from '@/src/types/api';

export default function ApplicationsScreen() {
  const query = useQuery({ queryKey: ['dossiers'], queryFn: async () => (await http.get(endpoints.dossiers)).data });
  const rows = asList<ApplicationDossier>(query.data);
  return <Screen><Heading title="Mes candidatures" subtitle="Dossiers propres à votre entreprise et aux consultations sélectionnées." />
    {query.isPending ? <Busy /> : query.isError ? <Notice tone="error">{errorMessage(query.error)}</Notice> : rows.length ? <Card>{rows.map((dossier) => <Row key={dossier.id} title={dossier.title || dossier.market_summary?.objet || `Dossier ${dossier.id}`} subtitle={`${dossier.reference || 'Référence non renseignée'} · ${dossier.job_status || dossier.status || 'À examiner'}`} right="Ouvrir" onPress={() => router.push((`/application/${dossier.id}`) as any)} />)}</Card> : <Notice>Vous n’avez pas encore de dossier. Ouvrez un marché pour démarrer une candidature.</Notice>}
    <Text style={{ color: '#61718A', fontSize: 13, lineHeight: 19 }}>Les documents générés sont des brouillons à vérifier. L’application ne signe pas et ne dépose pas l’offre.</Text>
  </Screen>;
}
