import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorMessage } from '@/src/api/client';
import { favoriteMarketId, useFavorites, useMarkets } from '@/src/api/hooks';
import { Banner, Chips, EmptyState, IconButton, Row, SearchField, Skeleton, T } from '@/src/components/ui';
import { MarketRow } from '@/src/components/market';
import { radius, space, useTheme } from '@/src/theme/tokens';
import { parseDate } from '@/src/lib/format';
import type { TenderMarket } from '@/src/types/api';

type Filter = 'open' | 'all' | 'Travaux' | 'Fournitures' | 'Services' | 'favorites';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'Ouverts' }, { key: 'all', label: 'Tous' }, { key: 'favorites', label: 'Favoris' },
  { key: 'Travaux', label: 'Travaux' }, { key: 'Fournitures', label: 'Fournitures' }, { key: 'Services', label: 'Services' },
];

export default function MarketsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('open');
  const category = ['Travaux', 'Fournitures', 'Services'].includes(filter) ? filter : undefined;
  const query = useMarkets({ search, categorie: category, ordering: filter === 'open' ? '-date_limite' : '-created_at' });
  const favorites = useFavorites();
  const favIds = useMemo(() => new Set((favorites.data || []).map(favoriteMarketId)), [favorites.data]);

  const rows = useMemo(() => {
    let list: TenderMarket[] = (query.data?.pages || []).flatMap((p) => p.rows);
    if (filter === 'open') list = list.filter((m) => (parseDate(m.date_limite)?.getTime() ?? 0) > query.dataUpdatedAt);
    if (filter === 'favorites') list = list.filter((m) => favIds.has(String(m.id)));
    return list;
  }, [query.data, query.dataUpdatedAt, filter, favIds]);
  const total = query.data?.pages[0]?.count;

  const header = <View style={{ gap: space.lg, paddingTop: insets.top + space.lg, paddingBottom: space.md }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <T v="largeTitle" accessibilityRole="header">Marchés</T>
      <IconButton name="add" label="Ajouter un marché depuis le portail officiel" onPress={() => router.push('/portal-search' as any)} />
    </View>
    <SearchField value={draft} onChangeText={(v) => { setDraft(v); if (!v) setSearch(''); }} onSubmit={() => setSearch(draft.trim())} placeholder="Objet, référence, acheteur, lieu" />
    <Chips options={FILTERS} value={filter} onChange={setFilter} />
    {typeof total === 'number' && !query.isPending ? <T v="footnote" color={c.inkSoft}>{search ? `${total} résultat${total > 1 ? 's' : ''} pour « ${search} »` : `${total} marché${total > 1 ? 's' : ''} dans votre espace`}</T> : null}
    {query.isError ? <Banner tone="error" action={{ label: 'Réessayer', onPress: () => void query.refetch() }}>{errorMessage(query.error)}</Banner> : null}
  </View>;

  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <FlatList
      data={rows}
      keyExtractor={(m) => String(m.id)}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
      ListHeaderComponent={header}
      renderItem={({ item, index }) => <View style={[{ backgroundColor: c.surface, borderColor: c.line }, styles.item,
        index === 0 && styles.first, index === rows.length - 1 && styles.last, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth }]}>
        <MarketRow market={item} />
      </View>}
      ListEmptyComponent={query.isPending ? <Skeleton rows={5} /> : query.isError ? undefined : <View style={{ gap: space.lg }}>
        <EmptyState icon="search-outline" title={search ? 'Aucun marché trouvé' : filter === 'favorites' ? 'Aucun favori' : 'Aucun marché ouvert'}
          body={search ? 'Ce marché n’est peut-être pas encore dans votre espace. Cherchez-le sur le portail officiel.' : 'Ajoutez un appel d’offres depuis le portail officiel ou importez un avis PDF.'} />
        <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Row icon="globe-outline" title="Chercher sur le portail officiel" subtitle={search ? `Référence « ${search} »` : 'marchespublics.gov.ma'} onPress={() => router.push({ pathname: '/portal-search', params: search ? { q: search } : {} } as any)} />
        </View>
      </View>}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={c.accent} style={{ padding: space.xl }} /> : undefined}
      onEndReachedThreshold={0.4}
      onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }}
      refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => { void query.refetch(); void favorites.refetch(); }} tintColor={c.accent} colors={[c.accent]} progressViewOffset={insets.top} />}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    />
  </View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, maxWidth: 720, width: '100%', alignSelf: 'center' },
  item: { borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  first: { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  last: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
