import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { endpoints, errorMessage, http } from '@/src/api/client';
import { Banner, Busy, Card, EmptyState, Row, Screen, Section, StatusPill, T } from '@/src/components/ui';
import { ValueView } from '@/src/components/ValueView';
import { formatBytes, formatDate, humanizeKey } from '@/src/lib/format';
import { space, useTheme } from '@/src/theme/tokens';
import type { MarketAnalysis } from '@/src/types/api';

export default function AnalysisScreen() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['market-analysis', id], queryFn: async () => (await http.get(`${endpoints.markets}${id}/analysis/`)).data?.analysis as MarketAnalysis });

  if (query.isPending) return <Screen back title="Analyse"><Busy /></Screen>;
  if (query.isError) return <Screen back title="Analyse"><Banner tone="error">{errorMessage(query.error)}</Banner></Screen>;
  const a = query.data;
  const result = (a?.analysis_result || {}) as Record<string, unknown>;
  const summary = (result.resume_executif || result.summary || a?.summary) as string | undefined;
  const sections = Object.entries(result).filter(([k, v]) => !['resume_executif', 'summary'].includes(k) && v != null && v !== '' && !(Array.isArray(v) && !v.length));

  return <Screen back title="Analyse du DCE" subtitle={a?.finished_at ? `Produite le ${formatDate(a.finished_at, true)}` : undefined}
    refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}><StatusPill status={a?.status} /><T v="footnote" color={c.inkSoft}>Aide à la lecture — à vérifier dans les pièces officielles.</T></View>
    {summary ? <Card><T v="headline">Résumé</T><T v="body" selectable>{summary}</T></Card> : null}
    {sections.length ? sections.map(([k, v]) => <Card key={k}><ValueView label={k} value={v} /></Card>)
      : !summary ? <EmptyState icon="document-text-outline" title="Aucun contenu exploitable" body={a?.public_error || 'L’analyse n’a pas produit de résultat structuré.'} /> : null}
    {a?.dossier_documents?.length ? <Section title="Documents analysés">
      {a.dossier_documents.map((d) => <Row key={d.id} icon="document-outline" title={d.original_name} subtitle={[formatBytes(d.size), d.processing_status && humanizeKey(d.processing_status)].filter(Boolean).join(', ')} />)}
    </Section> : null}
  </Screen>;
}
