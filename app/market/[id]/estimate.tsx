import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Text } from 'react-native';
import { http, errorMessage } from '@/src/api/client';
import { Button, Busy, Card, Heading, Notice, Row, Screen, palette } from '@/src/components/ui';

export default function MarketEstimateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const qc = useQueryClient();
  const query = useQuery({ queryKey: ['estimate-workflow', id], queryFn: async () => (await http.get(`/client/price-estimation/markets/${id}/workflow/`)).data, refetchInterval: (q) => ['PENDING', 'QUEUED', 'PROCESSING', 'RUNNING'].includes(String(q.state.data?.estimation?.status || '').toUpperCase()) ? 3000 : false });
  const prepare = useQuery({ queryKey: ['estimate-prepare', id], queryFn: async () => (await http.get(`/client/price-estimation/markets/${id}/prepare/`)).data });
  const generate = useMutation({ mutationFn: async () => (await http.post(`/client/price-estimation/markets/${id}/estimation/generate/`, { ai_provider_consent: true })).data, onSuccess: () => { void qc.invalidateQueries({ queryKey: ['estimate-workflow', id] }); } });
  const data = query.data || {}; const prep = prepare.data || {};
  return <Screen><Heading title="Estimation indicative" subtitle="Les calculs et sources restent fournis par le backend. Contrôlez les valeurs avant toute décision commerciale." />
    {query.isPending || prepare.isPending ? <Busy /> : query.isError ? <Notice tone="error">{errorMessage(query.error)}</Notice> : <>
      <Card><Text style={{ color: palette.ink, fontWeight: '800' }}>Consultation</Text><Text style={{ color: palette.muted }}>{prep.market?.objet || prep.market?.reference || `Marché ${id}`}</Text><Row title="Estimation administrative sourcée" subtitle={prep.official_estimate_source || 'Aucune source indiquée'} right={prep.official_estimate ? `${prep.official_estimate} MAD` : 'Indisponible'} /></Card>
      <Card><Text style={{ color: palette.ink, fontWeight: '800' }}>Données disponibles</Text><Row title="Lignes extraites" right={String(prep.extracted_items?.length ?? data.items?.length ?? 0)} /><Row title="Historique associé" right={String(data.history?.count ?? data.history?.length ?? '—')} />{(prep.extracted_items || []).slice(0, 12).map((item: any, i: number) => <Row key={item.id || i} title={item.designation || item.label || `Ligne ${i + 1}`} subtitle={`Quantité : ${item.quantity ?? 'à vérifier'} ${item.unit || ''}`} right={item.unit_price ? String(item.unit_price) : 'Prix à confirmer'} />)}</Card>
      <Notice>Les données extraites par OCR doivent être vérifiées. L’application ne remplace aucune valeur absente par zéro et n’affiche pas une estimation indicative comme une offre prête au dépôt.</Notice>
      <Button title="Générer / actualiser l’estimation assistée" onPress={() => Alert.alert('Estimation assistée', 'Le backend peut envoyer les documents de la consultation au fournisseur IA. Les résultats sont indicatifs et doivent être vérifiés. Autorisez-vous cet envoi ?', [{ text: 'Annuler', style: 'cancel' }, { text: 'Autoriser', onPress: () => generate.mutate() }])} loading={generate.isPending} />
      {generate.isError ? <Notice tone="error">{errorMessage(generate.error)}</Notice> : null}
      {generate.data ? <Notice tone="success">{generate.data.detail || generate.data.status || 'Traitement créé par le backend.'}</Notice> : null}
    </>}
  </Screen>;
}
