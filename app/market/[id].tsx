import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Text } from 'react-native';
import { asList, endpoints, http, errorMessage } from '@/src/api/client';
import { Button, Busy, Card, Heading, Notice, Row, Screen, palette } from '@/src/components/ui';
import { downloadPrivateFile } from '@/src/api/files';

export default function MarketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const qc = useQueryClient();
  const marketQuery = useQuery({ queryKey: ['market', id], queryFn: async () => (await http.get(`${endpoints.markets}${id}/`)).data, enabled: Boolean(id) });
  const analysisQuery = useQuery({ queryKey: ['market-analysis-status', id], queryFn: async () => (await http.get(`${endpoints.markets}${id}/analysis-status/`)).data, enabled: Boolean(id), refetchInterval: (q) => ['QUEUED', 'RUNNING', 'PROCESSING', 'EXTRACTING'].includes(String(q.state.data?.analysis?.status || '').toUpperCase()) ? 3000 : false });
  const favQuery = useQuery({ queryKey: ['favorites'], queryFn: async () => (await http.get('/favorites/')).data });
  const market = marketQuery.data || {};
  const favorite = asList<any>(favQuery.data).some((x) => String(x.marche || x.market || x.marche_id) === String(id));
  const analyze = useMutation({ mutationFn: async () => (await http.post(`${endpoints.markets}${id}/analyze/`, { ai_provider_consent: true })).data, onSuccess: () => { void qc.invalidateQueries({ queryKey: ['market', id] }); void qc.invalidateQueries({ queryKey: ['market-analysis-status', id] }); } });
  const startDossier = useMutation({ mutationFn: async () => (await http.post(`${endpoints.dossiers}start-market/`, { marche: Number(id) })).data, onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['dossiers'] }); router.push((`/application/${data.id}`) as any); } });
  const toggleFavorite = useMutation({ mutationFn: async () => favorite ? http.delete(`/favorites/${asList<any>(favQuery.data).find((x) => String(x.marche || x.market || x.marche_id) === String(id))?.id}/`) : http.post('/favorites/', { marche: Number(id) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }) });
  if (marketQuery.isPending) return <Screen><Busy label="Chargement du marché…" /></Screen>;
  if (marketQuery.isError) return <Screen><Notice tone="error">{errorMessage(marketQuery.error)}</Notice></Screen>;
  const analysis = market.analysis || market.latest_analysis || analysisQuery.data?.analysis;
  return <Screen><Heading title={market.objet || market.title || market.reference || `Marché ${id}`} subtitle={[market.reference, market.administration, market.date_limite].filter(Boolean).join(' · ')} />
    {market.description ? <Card><Text style={{ color: palette.ink, lineHeight: 22 }}>{market.description}</Text></Card> : null}
    <Card>
      {[['Maître d’ouvrage', market.administration || market.maitre_ouvrage], ['Lieu', market.ville || market.region], ['Date limite', market.date_limite || market.date_limite_depot], ['Estimation administrative', market.estimation || market.montant_estime]].filter(([, v]) => v).map(([label, value]) => <Row key={String(label)} title={String(label)} subtitle={String(value)} />)}
      {analysis ? <Notice>Analyse connue : {String(analysis.status || 'résultat disponible')}. Vérifiez les sources et les documents.</Notice> : null}
    </Card>
    <Button title="Préparer ma candidature" onPress={() => startDossier.mutate()} loading={startDossier.isPending} />
    <Button title="Télécharger le DCE officiel disponible" secondary onPress={() => void downloadPrivateFile(`${endpoints.markets}${id}/download-source/?variant=zip`, `DCE-${market.reference || id}.zip`).catch((e) => Alert.alert('DCE indisponible', errorMessage(e)))} />
    <Button title="Estimer le prix" secondary onPress={() => router.push((`/market/${id}/estimate`) as any)} />
    <Button title={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} secondary onPress={() => toggleFavorite.mutate()} loading={toggleFavorite.isPending} />
    <Button title="Lancer / relancer l’analyse IA" secondary onPress={() => Alert.alert('Transmission à Gemini', 'Le backend peut transmettre les documents du marché au fournisseur Gemini pour analyse. Les résultats restent à vérifier. Voulez-vous continuer ?', [{ text: 'Annuler', style: 'cancel' }, { text: 'Continuer', onPress: () => analyze.mutate() }])} loading={analyze.isPending} />
    {analyze.isError ? <Notice tone="error">{errorMessage(analyze.error)}</Notice> : null}
    {analyze.data ? <Card><Text style={{ color: palette.ink, fontWeight: '700' }}>Traitement de l’analyse</Text><Text style={{ color: palette.muted }}>{String(analyze.data.status || analyze.data.message || 'Demande envoyée au backend.')}</Text></Card> : null}
    <Button title="Ouvrir l’estimation détaillée" secondary onPress={() => router.push((`/features/priceWorkflow?market=${id}`) as any)} />
  </Screen>;
}
