/** Statistics screens: reports, finance, subscription & quotas, compliance, guarantees, invoices. */
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { asList, errorMessage, http } from '@/src/api/client';
import { ChartCard, ColumnChart, MeterBar, MeterList, RankedBars, SegmentedBar, StatGrid, type Point, type Stat } from '@/src/components/charts';
import { Banner, Chips, EmptyState, Row, Screen, Section, Skeleton, StatusPill, T } from '@/src/components/ui';
import { sentenceCase, shortBuyer } from '@/src/components/market';
import { formatDate, formatMoney, relativeTime } from '@/src/lib/format';
import { font, space, useTheme } from '@/src/theme/tokens';

type Period = '7d' | '30d' | '3m' | 'all';
const PERIODS: { key: Period; label: string }[] = [{ key: '7d', label: '7 jours' }, { key: '30d', label: '30 jours' }, { key: '3m', label: '3 mois' }, { key: 'all', label: 'Tout' }];
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

/** Sparse daily activity → continuous series, grouped to ≤ 15 columns. */
function activitySeries(rows: { date?: string; label?: string; actions?: number }[], start?: string, end?: string): Point[] {
  const byDate = new Map(rows.filter((r) => r.date).map((r) => [r.date!, num(r.actions)]));
  if (!start || !end) return rows.map((r) => ({ label: r.label || r.date || '', value: num(r.actions) }));
  const days: { date: Date; value: number }[] = [];
  for (let d = new Date(`${start}T00:00:00`); d <= new Date(`${end}T00:00:00`); d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    days.push({ date: new Date(d), value: byDate.get(key) || 0 });
  }
  const size = Math.max(1, Math.ceil(days.length / 15));
  const out: Point[] = [];
  for (let i = 0; i < days.length; i += size) {
    const chunk = days.slice(i, i + size);
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');
    out.push({ label: size > 1 ? `${fmt(chunk[0].date)} – ${fmt(chunk[chunk.length - 1].date)}` : fmt(chunk[0].date), value: chunk.reduce((s, x) => s + x.value, 0) });
  }
  return out;
}

function Insights({ items, missing }: { items?: { title?: string; message?: string }[]; missing?: string[] }) {
  return <>
    {(items || []).map((i, k) => <Banner key={k} tone="info" title={i.title}>{i.message || ''}</Banner>)}
    {missing?.length ? <Section title="Limites des données" footnote="Ces indicateurs restent partiels tant que ces données manquent.">
      {missing.map((m, k) => <Row key={k} icon="information-circle-outline" iconTone="closed" title={m} numberOfLines={4} />)}
    </Section> : null}
  </>;
}

/* ───────────── Rapports ───────────── */

export function ReportsScreen() {
  const [period, setPeriod] = useState<Period>('30d');
  const q = useQuery({ queryKey: ['reports', period], queryFn: async () => (await http.get('/client/reports/', { params: { period } })).data });
  const d = q.data || {};
  const k = d.kpis || {};
  const decided = num(k.gagnes) + num(k.perdus);
  return <Screen back title="Rapport d’activité" subtitle={d.period?.start_date ? `Du ${formatDate(d.period.start_date)} au ${formatDate(d.period.end_date)}` : undefined}
    refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
    <Chips options={PERIODS} value={period} onChange={setPeriod} />
    {q.isError ? <Banner tone="error">{errorMessage(q.error)}</Banner> : null}
    {q.isPending ? <Skeleton rows={4} /> : <>
      <StatGrid stats={[
        { label: 'Marchés suivis', value: num(k.marches_suivis) },
        { label: 'Marchés analysés', value: num(k.marches_analyses), note: `${num(k.analyses_total)} analyse${num(k.analyses_total) > 1 ? 's' : ''} au total` },
        { label: 'Candidatures', value: num(k.candidatures), note: num(k.en_attente) ? `${num(k.en_attente)} en attente de résultat` : undefined },
        { label: 'Taux de réussite', value: decided ? num(k.taux_reussite) : null, unit: decided ? '%' : '', note: decided ? `sur ${decided} résultat${decided > 1 ? 's' : ''} connu${decided > 1 ? 's' : ''}` : 'Aucun résultat connu' },
        { label: 'Documents générés', value: num(k.documents_generes), note: `${num(k.documents_ajoutes)} ajouté${num(k.documents_ajoutes) > 1 ? 's' : ''}` },
        { label: 'Estimations', value: num(k.estimations), note: `${num(k.exports)} export${num(k.exports) > 1 ? 's' : ''}` },
      ] as Stat[]} />

      <ChartCard title="Activité" subtitle="Actions réalisées dans votre espace">
        <ColumnChart data={activitySeries(d.activity || [], d.period?.start_date, d.period?.end_date)} />
      </ChartCard>

      <ChartCard title="Résultats des candidatures" subtitle={decided ? undefined : 'Les résultats apparaissent après l’ouverture des plis.'}>
        <SegmentedBar parts={[
          { label: 'Gagnées', value: num(k.gagnes), tone: 'good', icon: 'trophy-outline' },
          { label: 'Perdues', value: num(k.perdus), tone: 'bad', icon: 'close-circle-outline' },
          { label: 'En attente', value: num(k.en_attente), tone: 'neutral', icon: 'time-outline' },
        ]} />
      </ChartCard>

      {(num(d.financial?.valeur_analysee) || num(d.financial?.valeur_remportee)) ? <StatGrid stats={[
        { label: 'Valeur des marchés analysés', value: num(d.financial.valeur_analysee), unit: 'MAD' },
        { label: 'Valeur remportée', value: num(d.financial.valeur_remportee), unit: 'MAD' },
        { label: 'Budget moyen', value: num(d.financial.budget_moyen), unit: 'MAD' },
        { label: 'Budget le plus élevé', value: num(d.financial.budget_max), unit: 'MAD' },
      ]} /> : null}

      {d.sectors?.length ? <ChartCard title="Par secteur"><RankedBars rows={d.sectors.map((s: any) => ({ name: sentenceCase(String(s.name ?? s.label ?? s.sector)), value: num(s.value ?? s.count) }))} /></ChartCard> : null}
      {d.organisms?.length ? <ChartCard title="Par acheteur public"><RankedBars rows={d.organisms.map((s: any) => ({ name: shortBuyer(sentenceCase(String(s.name ?? s.label ?? s.organism))), value: num(s.value ?? s.count) }))} /></ChartCard> : null}

      {d.recent_results?.length ? <Section title="Derniers résultats">
        {d.recent_results.slice(0, 8).map((r: any, i: number) => <Row key={r.id ?? i} icon="ribbon-outline" title={sentenceCase(String(r.object ?? r.objet ?? r.reference ?? 'Marché'))} subtitle={[r.reference, r.date ? formatDate(r.date) : null].filter(Boolean).join(', ')}
          trailing={<StatusPill status={r.status === 'gagne' || r.won ? 'COMPLETED' : r.status === 'perdu' ? 'REJECTED' : 'PENDING'} label={r.status_label} />} />)}
      </Section> : null}

      <Insights items={d.insights} missing={d.missing_data} />
    </>}
  </Screen>;
}

/* ───────────── Finances ───────────── */

export function FinanceScreen() {
  const { c } = useTheme();
  const [period, setPeriod] = useState<Period>('30d');
  const q = useQuery({ queryKey: ['finance', period], queryFn: async () => (await http.get('/client/finance/', { params: { period } })).data });
  const d = q.data || {};
  const s = d.summary || {};
  const margin = s.average_margin == null ? null : num(s.average_margin);
  return <Screen back title="Tableau financier" subtitle="Rentabilité prévisionnelle de vos marchés, à partir de vos coûts et estimations."
    refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
    <Chips options={PERIODS} value={period} onChange={setPeriod} />
    {q.isError ? <Banner tone="error">{errorMessage(q.error)}</Banner> : null}
    {q.isPending ? <Skeleton rows={4} /> : <>
      <StatGrid stats={[
        { label: 'Chiffre d’affaires prévu', value: num(s.revenue), unit: 'MAD' },
        { label: 'Coûts estimés', value: num(s.estimated_cost), unit: 'MAD' },
        { label: 'Marge prévue', value: num(s.estimated_profit), unit: 'MAD',
          status: s.markets_count ? (num(s.estimated_profit) >= 0 ? { tone: 'good', label: 'Bénéficiaire' } : { tone: 'critical', label: 'Déficitaire' }) : undefined },
        { label: 'Taux de marge moyen', value: margin, unit: margin == null ? '' : '%', note: margin == null ? 'Pas encore calculable' : undefined },
      ] as Stat[]} />

      <ChartCard title="Marchés suivis financièrement" subtitle={`${num(s.markets_count)} marché${num(s.markets_count) > 1 ? 's' : ''} avec des coûts saisis`}>
        <SegmentedBar parts={[
          { label: 'Rentables', value: num(s.profitable_markets), tone: 'good', icon: 'trending-up-outline' },
          { label: 'À risque', value: num(s.at_risk_markets), tone: 'bad', icon: 'warning-outline' },
          { label: 'Autres', value: Math.max(0, num(s.markets_count) - num(s.profitable_markets) - num(s.at_risk_markets)), tone: 'neutral', icon: 'remove-circle-outline' },
        ]} />
      </ChartCard>

      {d.evolution?.length ? <ChartCard title="Marge prévue dans le temps">
        <ColumnChart unit="MAD" data={d.evolution.map((e: any) => ({ label: e.label ?? e.period ?? e.date, value: num(e.profit ?? e.estimated_profit ?? e.value) }))} />
      </ChartCard> : null}

      {d.top_profitable?.length ? <ChartCard title="Marchés les plus rentables">
        <RankedBars unit="MAD" rows={d.top_profitable.map((m: any) => ({ name: sentenceCase(String(m.object ?? m.objet ?? m.reference)), value: num(m.profit ?? m.estimated_profit) }))} />
      </ChartCard> : null}

      {d.at_risk?.length ? <Section title="Marchés à risque">
        {d.at_risk.map((m: any, i: number) => <Row key={m.id ?? i} icon="warning-outline" iconTone="urgent" title={sentenceCase(String(m.object ?? m.objet ?? m.reference))} value={formatMoney(m.profit ?? m.estimated_profit)}
          onPress={m.marche_id || m.id ? () => router.push(`/market/${m.marche_id ?? m.id}` as any) : undefined} />)}
      </Section> : null}

      {num(s.total_active_guarantees) ? <Row icon="lock-closed-outline" title="Cautions actives immobilisées" value={formatMoney(s.total_active_guarantees)} onPress={() => router.push('/features/guarantees' as any)} /> : null}
      <T v="footnote" color={c.inkFaint}>Montants prévisionnels, privés à votre entreprise.</T>
      <Insights items={d.insights} missing={d.missing_data} />
    </>}
  </Screen>;
}

/* ───────────── Abonnement et quotas ───────────── */

export function SubscriptionScreen() {
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['subscription'], queryFn: async () => asList<any>((await http.get('/subscriptions/user-subscriptions/')).data) });
  const sub = (q.data || []).find((s) => String(s.status).toUpperCase() === 'ACTIVE') || q.data?.[0];
  const plan = sub?.plan_detail || {};
  const usage = sub?.usage_periods?.[sub.usage_periods.length - 1] || {};
  const daysLeft = sub?.end_date ? Math.max(0, Math.ceil((new Date(sub.end_date).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000)) : null;
  const total = sub?.start_date && sub?.end_date ? Math.max(1, Math.round((new Date(sub.end_date).getTime() - new Date(sub.start_date).getTime()) / 86_400_000)) : null;
  return <Screen back title="Abonnement" refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
    {q.isError ? <Banner tone="error">{errorMessage(q.error)}</Banner> : null}
    {q.isPending ? <Skeleton rows={3} /> : !sub ? <EmptyState icon="ribbon-outline" title="Aucun abonnement" body="Choisissez une offre depuis l’application web pour débloquer les analyses IA et les exports." /> : <>
      <ChartCard title={plan.name || 'Votre offre'} subtitle={plan.price ? `${formatMoney(plan.price)} pour ${plan.duration_days} jours` : undefined}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <StatusPill status={sub.status} />
          <T v="subhead" color={c.inkSoft}>{sub.end_date ? `Jusqu’au ${formatDate(sub.end_date)}` : ''}</T>
        </View>
        {daysLeft != null && total ? <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="subhead">Période écoulée</T>
            <T v="subhead" color={c.inkSoft} style={{ fontVariant: ['tabular-nums'] }}>{daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}</T>
          </View>
          <MeterBar value={total - daysLeft} max={total} color={c.chartAccent} />
        </View> : null}
      </ChartCard>
      <ChartCard title="Consommation de la période" subtitle={usage.period_start ? `Du ${formatDate(usage.period_start)} au ${formatDate(usage.period_end)}` : undefined}>
        <MeterList rows={[
          { label: 'Analyses IA', value: num(usage.ai_analysis_count), max: plan.max_ai_analyses ?? null },
          { label: 'Exports', value: num(usage.export_count), max: plan.max_exports ?? null },
          { label: 'Documents', value: num(usage.document_count), max: plan.max_documents ?? null },
          { label: 'Profils entreprise', value: num(usage.profile_count), max: plan.max_profiles ?? null },
        ]} />
      </ChartCard>
    </>}
  </Screen>;
}

/* ───────────── Conformité ───────────── */

const COMPLIANCE_STATUS: Record<string, { label: string; pill: string; icon: 'checkmark-circle' | 'time-outline' | 'alert-circle' | 'ellipse-outline'; tone: 'ready' | 'soon' | 'urgent' | 'closed' }> = {
  valide: { label: 'Valide', pill: 'COMPLETED', icon: 'checkmark-circle', tone: 'ready' },
  expire_bientot: { label: 'Expire bientôt', pill: 'EXPIRING', icon: 'time-outline', tone: 'soon' },
  expire: { label: 'Expirée', pill: 'EXPIRED', icon: 'alert-circle', tone: 'urgent' },
  manquant: { label: 'Manquante', pill: 'MISSING', icon: 'ellipse-outline', tone: 'closed' },
};

export function ComplianceScreen() {
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['compliance'], queryFn: async () => (await http.get('/conformite/')).data });
  const s = q.data?.summary || {};
  const docs: any[] = q.data?.documents || [];
  const score = num(s.score);
  return <Screen back title="Conformité documentaire" subtitle="Les attestations exigées dans la plupart des dossiers de candidature."
    refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
    {q.isError ? <Banner tone="error">{errorMessage(q.error)}</Banner> : null}
    {q.isPending ? <Skeleton rows={4} /> : <>
      <ChartCard title="Score de conformité" subtitle={`${num(s.valides)} pièce${num(s.valides) > 1 ? 's' : ''} valide${num(s.valides) > 1 ? 's' : ''} sur ${num(s.total)}`}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
          <T v="largeTitle" style={{ fontFamily: font.semibold, fontVariant: ['tabular-nums'] }}>{score}</T>
          <T v="headline" color={c.inkSoft}>%</T>
        </View>
        <SegmentedBar parts={[
          { label: 'Valides', value: num(s.valides), tone: 'good', icon: 'checkmark-circle-outline' },
          { label: 'Expirées ou expirant', value: num(s.expires) + num(s.expire_bientot), tone: 'bad', icon: 'alert-circle-outline' },
          { label: 'Manquantes', value: num(s.manquants), tone: 'neutral', icon: 'ellipse-outline' },
        ]} />
      </ChartCard>
      <Section title="Pièces" footnote="Ajoutez ou renouvelez une attestation depuis l’application web.">
        {docs.map((doc, i) => {
          const st = COMPLIANCE_STATUS[String(doc.status)] || COMPLIANCE_STATUS.manquant;
          const when = doc.jours_restants != null ? `Expire dans ${doc.jours_restants} j` : doc.jours_depuis_expiration != null ? `Expirée depuis ${doc.jours_depuis_expiration} j` : doc.date_expiration ? `Expire le ${formatDate(doc.date_expiration)}` : doc.missing ? 'À fournir' : undefined;
          return <Row key={doc.id ?? `${doc.type_document}-${i}`} icon={st.icon} iconTone={st.tone} title={doc.nom || doc.type_document} subtitle={when}
            trailing={<StatusPill status={st.pill} label={st.label} />} chevron={false} />;
        })}
      </Section>
    </>}
  </Screen>;
}

/* ───────────── Garanties ───────────── */

export function GuaranteesScreen() {
  const q = useQuery({ queryKey: ['guarantees-summary'], queryFn: async () => (await http.get('/client/guarantees/summary/')).data });
  const s = q.data?.summary || {};
  const rows: any[] = q.data?.guarantees || [];
  const typeLabel = Object.fromEntries((q.data?.types || []).map((t: any) => [t.value, t.label]));
  return <Screen back title="Garanties et cautions" refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
    {q.isError ? <Banner tone="error">{errorMessage(q.error)}</Banner> : null}
    {q.isPending ? <Skeleton rows={3} /> : <>
      <StatGrid stats={[
        { label: 'Montant immobilisé', value: num(s.total_active_amount), unit: 'MAD' },
        { label: 'Cautions actives', value: num(s.active) },
        { label: 'Expirent bientôt', value: num(s.expiring_soon), status: num(s.expiring_soon) ? { tone: 'warning', label: 'Mainlevée à préparer' } : undefined },
        { label: 'Expirées', value: num(s.expired), status: num(s.expired) ? { tone: 'critical', label: 'À régulariser' } : undefined },
      ] as Stat[]} />
      {(q.data?.alerts || []).map((a: any, i: number) => <Banner key={i} tone="warning" title={a.title}>{a.message || ''}</Banner>)}
      {rows.length ? <Section title="Vos garanties">
        {rows.map((g, i) => <Row key={g.id ?? i} icon="lock-closed-outline" title={typeLabel[g.guarantee_type] || g.type_label || 'Garantie'}
          subtitle={[g.reference || g.market_reference, g.expiry_date ? `échéance ${formatDate(g.expiry_date)}` : null].filter(Boolean).join(', ')}
          value={formatMoney(g.amount)} trailing={<StatusPill status={g.status} />} chevron={false} />)}
      </Section> : <EmptyState icon="lock-closed-outline" title="Aucune garantie" body="Les cautions provisoires et définitives que vous enregistrez apparaîtront ici avec leurs échéances." />}
    </>}
  </Screen>;
}

/* ───────────── Devis et factures ───────────── */

export function InvoicesScreen() {
  const totals = useQuery({ queryKey: ['invoices-totals'], queryFn: async () => (await http.get('/invoices/totals_summary/')).data });
  const list = useQuery({ queryKey: ['invoices'], queryFn: async () => asList<any>((await http.get('/invoices/')).data) });
  const t = totals.data || {};
  const paid = num(t.total_paid), pending = num(t.pending_total), total = num(t.total_grand_amount);
  return <Screen back title="Devis et factures" refreshing={list.isRefetching} onRefresh={() => { void totals.refetch(); void list.refetch(); }}>
    {totals.isPending ? <Skeleton rows={2} /> : <StatGrid stats={[
      { label: 'Total facturé', value: total, unit: 'MAD', note: `${num(t.total_invoices)} document${num(t.total_invoices) > 1 ? 's' : ''}` },
      { label: 'Encaissé', value: paid, unit: 'MAD', meter: total ? { value: paid, of: total } : undefined },
      { label: 'En attente', value: pending, unit: 'MAD' },
      { label: 'TVA', value: num(t.total_tax_amount), unit: 'MAD' },
    ]} />}
    {list.isError ? <Banner tone="error">{errorMessage(list.error)}</Banner> : null}
    {list.isPending ? <Skeleton rows={3} /> : list.data?.length ? <Section title="Documents">
      {list.data.map((inv) => <Row key={inv.id} icon={inv.document_type === 'QUOTATION' ? 'document-outline' : 'receipt-outline'}
        title={inv.invoice_number || inv.number || `Facture ${inv.id}`} subtitle={[inv.customer_company || inv.customer_name, inv.invoice_date ? formatDate(inv.invoice_date) : relativeTime(inv.created_at)].filter(Boolean).join(', ')}
        value={formatMoney(inv.grand_total ?? inv.total_ttc ?? inv.total)} trailing={<StatusPill status={inv.status} />}
        onPress={() => router.push(`/features/invoices?id=${inv.id}` as any)} />)}
    </Section> : <EmptyState icon="receipt-outline" title="Aucune facture" body="Vos devis et factures créés depuis l’application web apparaîtront ici." />}
  </Screen>;
}

