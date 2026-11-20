import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text } from 'react-native';
import { asList, endpoints, http, errorMessage } from '@/src/api/client';
import { Busy, Card, Field, Heading, Notice, Row, Screen } from '@/src/components/ui';
import type { SavedEstimate, TenderMarket } from '@/src/types/api';

export default function EstimatesScreen() {
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['estimates'], queryFn: async () => (await http.get(endpoints.estimates)).data });
  const marketQuery = useQuery({ queryKey: ['estimation-markets', search], enabled: search.length > 1, queryFn: async () => (await http.get('/client/price-estimation/markets/', { params: { search } })).data });
  const estimates = asList<SavedEstimate>(query.data);
  const markets = asList<TenderMarket>(marketQuery.data);
  return <Screen><Heading title="Estimations de prix" subtitle="Estimation indicative à partir des données disponibles et des sources du backend." />
    <Card><Field label="Trouver un marché à chiffrer" placeholder="Référence ou objet…" value={search} onChangeText={setSearch} />
      {markets.map((m) => <Row key={m.id} title={m.objet || m.title || m.reference || `Marché ${m.id}`} subtitle={m.reference || ''} right="Estimer" onPress={() => router.push((`/market/${m.id}/estimate`) as any)} />)}
    </Card>
    {query.isPending ? <Busy /> : query.isError ? <Notice tone="error">{errorMessage(query.error)}</Notice> : estimates.length ? <Card>{estimates.map((estimate) => <Row key={estimate.id} title={estimate.title || estimate.name || `Estimation ${estimate.id}`} subtitle={estimate.market_reference || estimate.status || 'Brouillon'} right="Ouvrir" onPress={() => router.push((`/features/estimates?id=${estimate.id}`) as any)} />)}</Card> : <Notice>Aucune estimation sauvegardée.</Notice>}
    <Text style={{ color: '#61718A', fontSize: 13 }}>Les montants, marges et hypothèses restent privés à votre entreprise. Vérifiez les lignes extraites avant de les utiliser.</Text>
  </Screen>;
}
