import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { asList, endpoints, http, errorMessage } from '@/src/api/client';
import { Button, Busy, Card, Field, Heading, Notice, Row, Screen } from '@/src/components/ui';
import type { TenderMarket } from '@/src/types/api';

export default function MarketsScreen() {
  const [draft, setDraft] = useState(''); const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['markets', search], queryFn: async () => (await http.get(endpoints.markets, { params: search ? { search, q: search } : undefined })).data });
  const rows = asList<TenderMarket>(query.data);
  return <Screen><Heading title="Marchés publics" subtitle="Recherche dans les marchés accessibles à votre compte." />
    <Card><Field label="Recherche" placeholder="Objet, référence, administration…" value={draft} onChangeText={setDraft} returnKeyType="search" onSubmitEditing={() => setSearch(draft.trim())} /><Button title="Rechercher" onPress={() => setSearch(draft.trim())} /></Card>
    {query.isPending ? <Busy label="Chargement des marchés…" /> : query.isError ? <Notice tone="error">{errorMessage(query.error)}</Notice> : rows.length ? <Card>{rows.map((market) => <Row key={market.id} title={market.objet || market.title || market.reference || `Marché ${market.id}`} subtitle={[market.reference, market.administration, market.date_limite].filter(Boolean).join(' · ')} right="Détails" onPress={() => router.push((`/market/${market.id}`) as any)} />)}</Card> : <Notice>Aucun marché ne correspond à cette recherche.</Notice>}
  </Screen>;
}
