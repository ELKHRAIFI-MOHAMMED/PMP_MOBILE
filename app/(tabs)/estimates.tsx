import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { asList, endpoints, errorMessage, http } from '@/src/api/client';
import { Banner, Busy, EmptyState, Row, Screen, SearchField, Section, Skeleton, StatusPill } from '@/src/components/ui';
import { MarketRow } from '@/src/components/market';
import { formatMoney, relativeTime } from '@/src/lib/format';
import type { SavedEstimate, TenderMarket } from '@/src/types/api';

export default function EstimatesScreen() {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => { const t = setTimeout(() => setSearch(draft.trim()), 350); return () => clearTimeout(t); }, [draft]);

  const estimates = useQuery({ queryKey: ['estimates'], queryFn: async () => asList<SavedEstimate>((await http.get(endpoints.estimates)).data) });
  const markets = useQuery({ queryKey: ['estimation-markets', search], enabled: search.length > 1, queryFn: async () => asList<TenderMarket>((await http.get('/client/price-estimation/markets/', { params: { search } })).data) });

  return <Screen title="Prix" subtitle="Estimez un prix de référence à partir de l’estimation administrative, des offres publiées et du bordereau."
    refreshing={estimates.isRefetching} onRefresh={() => void estimates.refetch()} keyboard>
    <SearchField value={draft} onChangeText={setDraft} placeholder="Chiffrer un marché : référence ou objet" />
    {search.length > 1 ? <Section title="Marchés à chiffrer">
      {markets.isPending ? <Busy label="Recherche…" /> : markets.isError ? <Row icon="alert-circle-outline" iconTone="urgent" title={errorMessage(markets.error)} />
        : markets.data?.length ? markets.data.slice(0, 8).map((m) => <MarketRow key={m.id} market={m} onPress={() => router.push(`/market/${m.id}/estimate` as any)} />)
        : <Row icon="search-outline" title="Aucun marché correspondant" subtitle="Ajoutez-le d’abord depuis le portail officiel." onPress={() => router.push({ pathname: '/portal-search', params: { q: search } } as any)} />}
    </Section> : null}

    {estimates.isError ? <Banner tone="error">{errorMessage(estimates.error)}</Banner> : null}
    <Section title="Estimations enregistrées">
      {estimates.isPending ? <Skeleton rows={2} /> : estimates.data?.length ? estimates.data.map((e) => <Row key={e.id} icon="calculator-outline"
        title={e.title || e.name || `Estimation ${e.id}`} subtitle={[e.market_reference, e.updated_at ? `modifiée ${relativeTime(e.updated_at)}` : null].filter(Boolean).join(', ')}
        value={formatMoney(e.total_ttc) || undefined} trailing={!e.total_ttc ? <StatusPill status={e.status || 'DRAFT'} /> : undefined}
        onPress={() => router.push(`/features/estimates?id=${e.id}` as any)} />)
        : <EmptyState icon="calculator-outline" title="Aucune estimation" body="Cherchez un marché ci-dessus pour calculer un premier prix de référence." />}
    </Section>

    <Section title="Outils">
      <Row icon="time-outline" title="Historique des prix" subtitle="Prix relevés sur les marchés passés" onPress={() => router.push('/features/priceHistory' as any)} />
      <Row icon="git-compare-outline" title="Comparer aux marchés similaires" onPress={() => router.push('/features/comparison' as any)} />
      <Row icon="trophy-outline" title="Prix recommandé" onPress={() => router.push('/features/recommendedPrice' as any)} />
    </Section>
  </Screen>;
}
