import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Share, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { endpoints, errorMessage, http } from '@/src/api/client';
import { favoriteMarketId, useFavorites } from '@/src/api/hooks';
import { downloadPrivateFile } from '@/src/api/files';
import { Banner, Button, Busy, DeadlineStamp, EmptyState, Fact, IconButton, Progress, Row, Screen, Section, StatusPill, T } from '@/src/components/ui';
import { marketBuyer, marketEstimate, marketTitle, sentenceCase } from '@/src/components/market';
import { deadlineInfo, formatDate, statusInfo } from '@/src/lib/format';
import { space, useTheme } from '@/src/theme/tokens';
import type { AnalysisStatus, TenderMarket } from '@/src/types/api';

const RUNNING = ['QUEUED', 'PENDING', 'RUNNING', 'PROCESSING', 'EXTRACTING', 'STARTED'];

export default function MarketDetailScreen() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const marketQuery = useQuery({ queryKey: ['market', id], enabled: Boolean(id), queryFn: async () => (await http.get(`${endpoints.markets}${id}/`)).data as TenderMarket });
  const statusQuery = useQuery({
    queryKey: ['market-analysis-status', id], enabled: Boolean(id),
    queryFn: async () => ((await http.get(`${endpoints.markets}${id}/analysis-status/`)).data?.analysis || null) as AnalysisStatus | null,
    refetchInterval: (q) => RUNNING.includes(String(q.state.data?.status || '').toUpperCase()) ? 3000 : false,
  });
  const favorites = useFavorites();
  const fav = (favorites.data || []).find((f) => favoriteMarketId(f) === String(id));

  const analyze = useMutation({
    mutationFn: async () => (await http.post(`${endpoints.markets}${id}/analyze/`, { ai_provider_consent: true, force: Boolean(statusQuery.data) })).data,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['market-analysis-status', id] }); },
  });
  const startDossier = useMutation({
    mutationFn: async () => (await http.post(`${endpoints.dossiers}start-market/`, { marche: Number(id) })).data,
    onSuccess: (data) => { void qc.invalidateQueries({ queryKey: ['dossiers'] }); router.push(`/application/${data.id}` as any); },
  });
  const toggleFavorite = useMutation({
    mutationFn: async () => fav ? http.delete(`/favorites/${fav.id}/`) : http.post('/favorites/', { marche: Number(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
    onError: (e) => Alert.alert('Favoris', errorMessage(e)),
  });

  if (marketQuery.isPending) return <Screen back><Busy label="Chargement du marché…" /></Screen>;
  if (marketQuery.isError) return <Screen back><Banner tone="error" action={{ label: 'Réessayer', onPress: () => void marketQuery.refetch() }}>{errorMessage(marketQuery.error)}</Banner></Screen>;

  const m = marketQuery.data;
  const deadline = deadlineInfo(m.date_limite);
  const analysis = statusQuery.data;
  const aStatus = String(analysis?.status || '').toUpperCase();
  const running = RUNNING.includes(aStatus);
  const hasResult = ['COMPLETED', 'PARTIAL'].includes(aStatus);

  const confirmAnalysis = () => Alert.alert(
    'Analyser avec l’IA',
    'Les documents du marché seront transmis à Google Gemini pour en extraire les exigences, pièces et critères. Le résultat est une aide : vérifiez-le toujours dans les documents officiels.',
    [{ text: 'Annuler', style: 'cancel' }, { text: 'Lancer l’analyse', onPress: () => analyze.mutate() }],
  );
  const downloadDce = () => void downloadPrivateFile(`${endpoints.markets}${id}/download-source/?variant=zip`, `DCE-${m.reference || id}.zip`)
    .catch((e) => Alert.alert('DCE indisponible', errorMessage(e)));

  return <Screen back
    refreshing={marketQuery.isRefetching} onRefresh={() => { void marketQuery.refetch(); void statusQuery.refetch(); }}
    headerRight={<>
      {m.detail_url ? <IconButton name="share-outline" label="Partager" onPress={() => void Share.share({ message: `${marketTitle(m)}\n${m.detail_url}`, url: m.detail_url || undefined })} /> : null}
      <IconButton name={fav ? 'heart' : 'heart-outline'} color={fav ? c.urgent : undefined} label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} onPress={() => toggleFavorite.mutate()} />
    </>}
    footer={deadline.urgency === 'closed'
      ? <Button title="Consultation clôturée" onPress={() => undefined} disabled variant="secondary" />
      : <Button title="Préparer ma candidature" icon="folder-open-outline" onPress={() => startDossier.mutate()} loading={startDossier.isPending} />}
  >
    <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
      <DeadlineStamp date={m.date_limite} size="lg" />
      <View style={{ flex: 1, gap: 4 }}>
        <T v="footnote" color={c.inkSoft}>{[m.reference, m.categorie].filter(Boolean).join(' – ')}</T>
        <T v="subhead" color={deadline.urgency === 'urgent' ? c.urgent : c.ink}>{deadline.long}</T>
      </View>
    </View>
    <View style={{ gap: space.sm }}>
      <T v="title" selectable>{sentenceCase(marketTitle(m))}</T>
      {marketBuyer(m) ? <T v="callout" color={c.inkSoft}>{sentenceCase(marketBuyer(m))}</T> : null}
    </View>
    {startDossier.isError ? <Banner tone="error">{errorMessage(startDossier.error)}</Banner> : null}

    <Section title="Fiche du marché">
      <Fact icon="business-outline" label="Acheteur public" value={sentenceCase(marketBuyer(m))} />
      <Fact icon="location-outline" label="Lieu d’exécution" value={m.lieu_execution} />
      <Fact icon="git-branch-outline" label="Procédure" value={m.procedure_complete || m.procedure} />
      <Fact icon="pricetag-outline" label="Estimation du maître d’ouvrage" value={marketEstimate(m)} />
      <Fact icon="calendar-outline" label="Date limite de dépôt" value={formatDate(m.date_limite, true)} />
      <Fact icon="megaphone-outline" label="Publication" value={formatDate(m.date_publication)} />
      {m.lots?.length ? <Fact icon="layers-outline" label="Lots" value={`${m.lots.length} lot${m.lots.length > 1 ? 's' : ''}`} /> : null}
    </Section>

    <Section title="Analyse du dossier de consultation" footnote="L’analyse extrait exigences, pièces à fournir et critères. Elle ne remplace pas la lecture du DCE.">
      {statusQuery.isPending ? <Busy label="État de l’analyse…" /> : analysis ? <View style={{ padding: space.lg, gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md }}>
          <T v="bodyStrong" style={{ flex: 1 }}>{statusInfo(analysis.status).tone === 'urgent' ? 'L’analyse n’a pas abouti' : hasResult ? 'Analyse disponible' : analysis.current_step || statusInfo(analysis.status).label}</T>
          <StatusPill status={analysis.status} />
        </View>
        {running ? <Progress value={analysis.progress ?? 0} label="Progression" /> : null}
        {analysis.public_error ? <Banner tone="error">{analysis.public_error}</Banner> : null}
        {analysis.summary ? <T v="callout" numberOfLines={6}>{analysis.summary}</T> : null}
        {analysis.documents_count ? <T v="footnote" color={c.inkSoft}>{analysis.documents_count} document{analysis.documents_count > 1 ? 's' : ''} analysé{analysis.documents_count > 1 ? 's' : ''}{analysis.finished_at ? `, le ${formatDate(analysis.finished_at, true)}` : ''}</T> : null}
      </View> : <EmptyState icon="sparkles-outline" title="Pas encore analysé" body="Lancez l’analyse pour obtenir la liste des pièces et exigences du DCE." />}
      {hasResult ? <Row icon="reader-outline" title="Lire l’analyse complète" onPress={() => router.push(`/market/${id}/analysis` as any)} /> : null}
      {!running ? <Row icon="sparkles-outline" title={analysis ? 'Relancer l’analyse' : 'Lancer l’analyse IA'} subtitle="Transmission à Google Gemini, avec votre accord" onPress={confirmAnalysis} /> : null}
    </Section>
    {analyze.isError ? <Banner tone="error">{errorMessage(analyze.error)}</Banner> : null}

    <Section title="Documents">
      <Row icon="archive-outline" title="Télécharger le DCE" subtitle="Archive ZIP du dossier de consultation" onPress={downloadDce} />
      {m.detail_url ? <Row icon="open-outline" title="Ouvrir l’avis officiel" subtitle="marchespublics.gov.ma" onPress={() => void WebBrowser.openBrowserAsync(m.detail_url!)} /> : null}
      <Row icon="chatbubbles-outline" title="Questionner les documents" subtitle="Réponses citées, extraites du DCE" onPress={() => router.push({ pathname: '/features/[key]', params: { key: 'assistant', market: String(id) } } as any)} />
    </Section>

    <Section title="Prix">
      <Row icon="calculator-outline" title="Estimation et offres" subtitle="Prix de référence, offres publiées et lignes du bordereau" onPress={() => router.push(`/market/${id}/estimate` as any)} />
    </Section>
  </Screen>;
}
