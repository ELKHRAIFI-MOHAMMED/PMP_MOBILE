import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, StyleSheet, View } from 'react-native';
import { errorMessage, http } from '@/src/api/client';
import { Banner, Busy, Card, Fact, Row, Screen, Section, StatusPill, T } from '@/src/components/ui';
import { marketTitle, sentenceCase } from '@/src/components/market';
import { formatDate, formatMoney } from '@/src/lib/format';
import { font, radius, space, useTheme } from '@/src/theme/tokens';

type Workflow = {
  market?: { id: number; reference?: string; objet?: string };
  estimation_mo?: string | number | null;
  estimation_source?: string;
  offers?: any[];
  items?: any[];
  calculation?: { available?: boolean; average_offers?: number | string | null; reference_price?: number | string | null; formula?: string; eligible_offers?: number; method_note?: string };
  confidence?: { level?: string; basis?: string };
  anomaly_rule?: string;
  missing?: string[];
  calculated_at?: string;
};

const confidenceTone = (level?: string) => ({ elevee: 'COMPLETED', élevée: 'COMPLETED', moyenne: 'PARTIAL', faible: 'FAILED', insuffisante: 'FAILED' } as Record<string, string>)[String(level || '').toLowerCase()] || '';

export default function MarketEstimateScreen() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['estimate-workflow', id], queryFn: async () => (await http.get(`/client/price-estimation/markets/${id}/workflow/`)).data as Workflow });
  const refreshAll = () => qc.invalidateQueries({ queryKey: ['estimate-workflow', id] });
  const refreshOffers = useMutation({ mutationFn: async () => (await http.post(`/client/price-estimation/markets/${id}/official-offers/refresh/`, {}, { timeout: 120_000 })).data, onSuccess: refreshAll });
  const generate = useMutation({ mutationFn: async () => (await http.post(`/client/price-estimation/markets/${id}/estimation/generate/`, { ai_provider_consent: true })).data, onSuccess: refreshAll });

  if (query.isPending) return <Screen back title="Prix"><Busy label="Calcul en cours…" /></Screen>;
  if (query.isError) return <Screen back title="Prix"><Banner tone="error" action={{ label: 'Réessayer', onPress: () => void query.refetch() }}>{errorMessage(query.error)}</Banner></Screen>;

  const w = query.data;
  const calc = w.calculation || {};
  const reference = formatMoney(calc.reference_price);

  return <Screen back title="Prix" subtitle={w.market ? sentenceCase(marketTitle(w.market)) : undefined}
    refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>

    <View style={[styles.hero, { backgroundColor: c.surface, borderColor: c.line }]}>
      <T v="footnote" color={c.inkSoft}>Prix de référence indicatif</T>
      <T v="largeTitle" color={reference ? c.ink : c.inkFaint} style={{ fontVariant: ['tabular-nums'] }} selectable>{reference || 'Non calculable'}</T>
      {calc.formula ? <T v="footnote" color={c.inkSoft}>Formule {calc.formula}, {calc.eligible_offers ?? 0} offre{(calc.eligible_offers ?? 0) > 1 ? 's' : ''} admissible{(calc.eligible_offers ?? 0) > 1 ? 's' : ''}</T> : null}
      <View style={[styles.divider, { backgroundColor: c.line }]} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md }}>
        <T v="subhead" style={{ fontFamily: font.semibold }}>Fiabilité</T>
        <StatusPill status={confidenceTone(w.confidence?.level)} label={w.confidence?.level ? w.confidence.level.charAt(0).toUpperCase() + w.confidence.level.slice(1) : 'Inconnue'} />
      </View>
      {w.confidence?.basis ? <T v="footnote" color={c.inkSoft}>{w.confidence.basis}</T> : null}
    </View>

    {w.missing?.length ? <Banner tone="warning" title="Données manquantes">
      <View style={{ gap: 4 }}>{w.missing.map((m, i) => <T key={i} v="subhead">• {m}</T>)}</View>
    </Banner> : null}

    <Section title="Repères">
      <Fact icon="business-outline" label="Estimation du maître d’ouvrage (E)" value={formatMoney(w.estimation_mo) || 'Non publiée'} />
      <Fact icon="stats-chart-outline" label="Moyenne des offres (M)" value={formatMoney(calc.average_offers) || 'Aucune offre exploitable'} />
      <Fact icon="alert-circle-outline" label="Règle d’anomalie" value={w.anomaly_rule} />
      {calc.method_note ? <Fact icon="information-circle-outline" label="Méthode" value={calc.method_note} /> : null}
    </Section>

    <Section title={`Offres publiées${w.offers?.length ? ` (${w.offers.length})` : ''}`} action={{ label: refreshOffers.isPending ? 'Actualisation…' : 'Actualiser', onPress: () => refreshOffers.mutate() }}
      footnote="Résultats d’ouverture des plis publiés sur le portail, lorsqu’ils sont disponibles.">
      {w.offers?.length ? w.offers.map((o, i) => <Row key={o.id ?? i} icon="ribbon-outline" iconTone={o.is_admissible === false ? 'closed' : 'accent'}
        title={o.soumissionnaire || o.company_name || o.name || `Offre ${i + 1}`} subtitle={o.is_admissible === false ? 'Non admissible' : o.rank ? `Rang ${o.rank}` : undefined}
        value={formatMoney(o.montant ?? o.amount ?? o.amount_ttc)} />)
        : <Row icon="hourglass-outline" title="Aucune offre publiée pour l’instant" subtitle="Elles apparaissent après la séance d’ouverture des plis." />}
    </Section>
    {refreshOffers.isError ? <Banner tone="error">{errorMessage(refreshOffers.error)}</Banner> : null}

    <Section title={`Lignes du bordereau${w.items?.length ? ` (${w.items.length})` : ''}`} action={{ label: generate.isPending ? 'Extraction…' : 'Extraire', onPress: () => Alert.alert('Extraire les lignes de prix', 'Le BPU/DQE du DCE sera transmis à Google Gemini pour en extraire les lignes. Vérifiez chaque quantité et unité avant usage.', [{ text: 'Annuler', style: 'cancel' }, { text: 'Extraire', onPress: () => generate.mutate() }]) }}>
      {w.items?.length ? w.items.slice(0, 50).map((it, i) => <Row key={it.id ?? i}
        title={it.designation || it.label || `Ligne ${i + 1}`} subtitle={[it.quantity != null ? `${it.quantity} ${it.unit || ''}`.trim() : null, it.numero ? `N° ${it.numero}` : null].filter(Boolean).join(', ') || undefined}
        value={formatMoney(it.unit_price ?? it.prix_unitaire) || 'à chiffrer'} />)
        : <Row icon="list-outline" title="Aucune ligne extraite" subtitle="Extrayez le bordereau des prix depuis le DCE." />}
    </Section>
    {generate.isError ? <Banner tone="error">{errorMessage(generate.error)}</Banner> : null}
    {generate.data ? <Banner tone="success">L’extraction est lancée. Tirez vers le bas pour actualiser.</Banner> : null}

    <Card style={{ backgroundColor: c.surfaceAlt, borderColor: c.surfaceAlt }}>
      <T v="footnote" color={c.inkSoft}>Estimation indicative, privée à votre entreprise. Elle ne prédit pas l’offre gagnante et ne remplace pas les règles du règlement de consultation.{w.calculated_at ? ` Calculée le ${formatDate(w.calculated_at, true)}.` : ''}</T>
    </Card>
  </Screen>;
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.xl, gap: space.sm },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: space.sm },
});
