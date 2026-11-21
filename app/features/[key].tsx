import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { encode } from 'base64-arraybuffer';
import { asList, endpoints, errorMessage, http, saveToken } from '@/src/api/client';
import { useAuth } from '@/src/auth/AuthProvider';
import { Banner, Button, Card, Chips, EmptyState, Field, Row, Screen, Section, Skeleton, StatusPill, T, type IconName } from '@/src/components/ui';
import { MarketRow, sentenceCase } from '@/src/components/market';
import { ValueView } from '@/src/components/ValueView';
import { ComplianceScreen, FinanceScreen, GuaranteesScreen, InvoicesScreen, ReportsScreen, SubscriptionScreen } from '@/src/screens/stats';
import { formatDate, formatMoney, relativeTime } from '@/src/lib/format';
import { space, useTheme } from '@/src/theme/tokens';
import type { TenderMarket } from '@/src/types/api';

type Feature = { title: string; endpoint: string; description: string; icon: IconName; admin?: boolean; unavailable?: string; empty?: string };

const F: Record<string, Feature> = {
  analyses: { title: 'Analyses IA', endpoint: endpoints.analyses, icon: 'sparkles-outline', description: 'Les analyses lancées sur vos marchés.', empty: 'Lancez une analyse depuis la fiche d’un marché.' },
  exports: { title: 'Exports', endpoint: '/exports/', icon: 'share-outline', description: 'Vos demandes d’export et leur état.' },
  estimates: { title: 'Estimation', endpoint: endpoints.estimates, icon: 'calculator-outline', description: 'Estimations enregistrées.' },
  favorites: { title: 'Favoris', endpoint: endpoints.features.favorites, icon: 'heart-outline', description: 'Marchés que vous suivez.' },
  payments: { title: 'Paiements', endpoint: endpoints.features.payments, icon: 'card-outline', description: 'Vos demandes de paiement et leur statut.' },
  profile: { title: 'Informations personnelles', endpoint: '/auth/me/', icon: 'person-circle-outline', description: '' },
  documents: { title: 'Mes documents', endpoint: endpoints.features.documents, icon: 'documents-outline', description: 'Bibliothèque documentaire de votre entreprise.', empty: 'Ajoutez vos pièces depuis un dossier de candidature.' },
  templates: { title: 'Modèles de documents', endpoint: endpoints.features.templates, icon: 'copy-outline', description: 'Modèles prêts à pré-remplir avec le profil de l’entreprise.' },
  generatedDocuments: { title: 'Documents générés', endpoint: '/generated-documents/', icon: 'create-outline', description: 'Brouillons à relire avant usage.' },
  reports: { title: 'Rapports', endpoint: endpoints.features.reports, icon: 'bar-chart-outline', description: 'Synthèse de votre activité.' },
  invoices: { title: 'Devis et factures', endpoint: '/invoices/', icon: 'receipt-outline', description: 'Facturation de votre entreprise.' },
  calendar: { title: 'Calendrier', endpoint: '/client/calendar/events/', icon: 'calendar-outline', description: 'Échéances, visites de lieux et ouvertures de plis.', empty: 'Les échéances des marchés suivis apparaîtront ici.' },
  tasks: { title: 'Plan d’action', endpoint: endpoints.features.tasks, icon: 'checkbox-outline', description: 'Les tâches de votre équipe.' },
  guarantees: { title: 'Garanties et cautions', endpoint: endpoints.features.guarantees, icon: 'lock-closed-outline', description: 'Cautions provisoires et définitives, mainlevées.' },
  subscriptions: { title: 'Abonnement et quotas', endpoint: endpoints.features.subscriptions, icon: 'ribbon-outline', description: 'Votre offre et sa consommation.' },
  plans: { title: 'Offres', endpoint: endpoints.features.plans, icon: 'pricetags-outline', description: 'Offres disponibles.', admin: true },
  usage: { title: 'Consommation', endpoint: endpoints.features.usage, icon: 'speedometer-outline', description: 'Utilisation sur la période en cours.' },
  marketplace: { title: 'Fournisseurs', endpoint: endpoints.features.marketplace, icon: 'storefront-outline', description: 'Annonces de fournisseurs et partenaires.' },
  company: { title: 'Profil de l’entreprise', endpoint: endpoints.features.companies, icon: 'business-outline', description: '' },
  finance: { title: 'Tableau financier', endpoint: endpoints.features.finance, icon: 'wallet-outline', description: 'Dépenses par marché et synthèse financière.' },
  compliance: { title: 'Conformité documentaire', endpoint: '/conformite/documents/', icon: 'shield-checkmark-outline', description: 'Attestations fiscales, CNSS, RC… et leurs dates d’expiration.' },
  priceHistory: { title: 'Historique des prix', endpoint: endpoints.features.priceHistory, icon: 'time-outline', description: 'Prix relevés sur les marchés passés. Vérifiez périmètre et source.' },
  alerts: { title: 'Alertes', endpoint: endpoints.features.notifications, icon: 'alarm-outline', description: '' },
  team: { title: 'Équipe', endpoint: '/client/calendar/tasks/members/', icon: 'people-outline', description: 'Membres de votre espace.' },
  checklist: { title: 'Checklists', endpoint: endpoints.dossiers, icon: 'list-outline', description: 'Exigences des dossiers enregistrés.' },
  users: { title: 'Utilisateurs', endpoint: endpoints.features.users, icon: 'person-outline', description: 'Comptes de la plateforme.', admin: true },
  companies: { title: 'Entreprises', endpoint: endpoints.features.companies, icon: 'business-outline', description: 'Entreprises inscrites.', admin: true },
  paymentRequests: { title: 'Demandes de paiement', endpoint: endpoints.features.paymentRequests, icon: 'cash-outline', description: 'Demandes à valider.', admin: true },
  paymentMethods: { title: 'Moyens de paiement', endpoint: endpoints.features.paymentMethods, icon: 'card-outline', description: 'Moyens proposés aux clients.', admin: true },
  permissions: { title: 'Permissions', endpoint: endpoints.features.permissions, icon: 'key-outline', description: 'Permissions disponibles.', admin: true },
  aiResults: { title: 'Résultats IA', endpoint: endpoints.features.aiResults, icon: 'analytics-outline', description: 'Analyses produites sur la plateforme.', admin: true },
  comparison: { title: 'Comparer aux marchés similaires', endpoint: '', icon: 'git-compare-outline', description: 'Situez un marché par rapport aux références de prix disponibles.' },
  recommendedPrice: { title: 'Prix recommandé', endpoint: '', icon: 'trophy-outline', description: 'Recommandation et éléments qui la justifient.' },
  assistant: { title: 'Assistant documentaire', endpoint: '', icon: 'chatbubbles-outline', description: 'Posez une question : la réponse cite des extraits exacts du DCE.' },
  marketImport: { title: 'Importer un avis PDF', endpoint: '', icon: 'document-attach-outline', description: '' },
  converter: { title: 'Conversion de fichiers', endpoint: '/file-converter/history/', icon: 'swap-horizontal-outline', description: 'Convertissez PDF, Word et Excel.' },
};

const titleOf = (r: any) => r.title || r.name || r.legal_name || r.objet || r.reference || r.filename || r.original_name || r.input_filename || r.email || r.numero || r.number || `Élément ${r.id ?? ''}`;
const subtitleOf = (r: any) => [r.reference && r.reference !== titleOf(r) ? r.reference : null, r.description && typeof r.description === 'string' ? r.description.slice(0, 90) : null,
  r.due_date || r.date || r.start_date || r.expiry_date || r.expires_at ? formatDate(r.due_date || r.date || r.start_date || r.expiry_date || r.expires_at) : r.created_at ? relativeTime(r.created_at) : null].filter(Boolean).join('\n');
const amountOf = (r: any) => formatMoney(r.total_ttc ?? r.amount ?? r.montant ?? r.price ?? r.total);
const statusOf = (r: any) => r.status || r.state || r.verification_status || (typeof r.is_read === 'boolean' ? (r.is_read ? 'DONE' : 'PENDING') : undefined);

export default function FeatureScreen() {
  const { key, id, market } = useLocalSearchParams<{ key: string; id?: string; market?: string }>();
  const feature: Feature = F[key] || { title: 'Fonction indisponible', endpoint: '', icon: 'help-circle-outline', description: '', unavailable: 'Cette fonction n’est pas encore disponible sur mobile.' };
  const { user } = useAuth();
  const isAdmin = ['ADMIN', 'STAFF', 'MANAGER', 'MODERATOR'].includes(String(user?.role || '').toUpperCase()) || user?.is_staff || user?.is_superuser;

  if (key === 'notifications' || key === 'alerts') return <Redirect href={'/notifications' as any} />;
  if (feature.admin && !isAdmin) return <Screen back title={feature.title}><Banner tone="error">Cette section est réservée aux administrateurs.</Banner></Screen>;
  if (feature.unavailable) return <Screen back title={feature.title}><EmptyState icon={feature.icon} title="Bientôt sur mobile" body={feature.unavailable} /></Screen>;
  if (key === 'marketImport') return <MarketPdfImport />;
  if (key === 'profile') return <ProfileScreen />;
  if (key === 'company') return <CompanyScreen />;
  if (key === 'assistant') return <AssistantScreen initialMarket={market} />;
  if (key === 'comparison' || key === 'recommendedPrice') return <PriceInsightScreen kind={key} feature={feature} initialMarket={market} />;
  if (key === 'converter') return <ConverterScreen feature={feature} />;
  if (key === 'reports') return <ReportsScreen />;
  if (key === 'finance') return <FinanceScreen />;
  if (key === 'subscriptions' || key === 'usage') return <SubscriptionScreen />;
  if (key === 'compliance') return <ComplianceScreen />;
  if (key === 'guarantees') return <GuaranteesScreen />;
  if (key === 'invoices' && !id) return <InvoicesScreen />;
  return <GenericList featureKey={key} feature={feature} id={id} />;
}

/* ───────────── Generic list / detail ───────────── */

function GenericList({ featureKey, feature, id }: { featureKey: string; feature: Feature; id?: string }) {
  const qc = useQueryClient();
  const endpoint = id && feature.endpoint ? `${feature.endpoint.replace(/\/$/, '')}/${id}/` : feature.endpoint;
  const query = useQuery({ queryKey: ['feature', featureKey, id], enabled: Boolean(endpoint), queryFn: async () => (await http.get(endpoint)).data });
  const toggleMarketplaceFavorite = useMutation({
    mutationFn: ({ itemId, favorite }: { itemId: number; favorite: boolean }) => favorite ? http.delete(`/marketplace/${itemId}/favorite/`) : http.post(`/marketplace/${itemId}/favorite/`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature', 'marketplace'] }),
  });
  const data = query.data;
  const rows = asList<any>(data);
  const forbidden = (query.error as any)?.response?.status === 403;

  const open = (row: any) => {
    if (featureKey === 'favorites') return router.push(`/market/${row.marche?.id ?? row.marche ?? row.market}` as any);
    if (featureKey === 'checklist') return router.push(`/application/${row.id}` as any);
    if (featureKey === 'analyses' && (row.marche || row.market)) return router.push(`/market/${row.marche?.id ?? row.marche ?? row.market}/analysis` as any);
    if (featureKey === 'marketplace') return toggleMarketplaceFavorite.mutate({ itemId: row.id, favorite: Boolean(row.is_favorite) });
    if (row.id != null) router.push(`/features/${featureKey}?id=${row.id}` as any);
  };

  return <Screen back title={id ? (data ? titleOf(data) : feature.title) : feature.title} subtitle={id ? undefined : feature.description}
    refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    {query.isError ? <Banner tone="error" title={forbidden ? 'Accès refusé' : undefined}>{forbidden ? 'Votre rôle ne donne pas accès à cette section.' : errorMessage(query.error)}</Banner> : null}
    {query.isPending ? <Skeleton rows={4} /> : id || (data && !Array.isArray(data) && !Array.isArray(data?.results) && !Array.isArray(data?.data))
      ? (data ? <Card><ValueView value={data} /></Card> : null)
      : rows.length ? <Section>
        {rows.map((row, i) => <Row key={row.id ?? i} icon={feature.icon} title={sentenceCase(String(titleOf(row)))} subtitle={subtitleOf(row) || undefined}
          value={amountOf(row) || undefined}
          trailing={featureKey === 'marketplace' ? undefined : statusOf(row) ? <StatusPill status={statusOf(row)} /> : undefined}
          onPress={featureKey === 'marketplace' ? () => open(row) : row.id != null ? () => open(row) : undefined}
          chevron={featureKey !== 'marketplace'}
          badge={undefined} />)}
      </Section>
      : !query.isError ? <EmptyState icon={feature.icon} title="Rien pour l’instant" body={feature.empty} /> : null}
    {featureKey === 'marketplace' && rows.length ? <T v="footnote">Touchez une annonce pour l’ajouter ou la retirer de vos favoris.</T> : null}
  </Screen>;
}

/* ───────────── Profile ───────────── */

function ProfileScreen() {
  const { c } = useTheme();
  const qc = useQueryClient();
  const { reloadUser } = useAuth();
  const query = useQuery({ queryKey: ['feature', 'profile'], queryFn: async () => (await http.get('/auth/me/')).data });
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [pw, setPw] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [pwMsg, setPwMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const v = draft || query.data || {};
  const save = useMutation({
    mutationFn: () => http.patch('/auth/me/', { first_name: v.first_name, last_name: v.last_name, phone: v.phone, address: v.address, city: v.city }),
    onSuccess: () => { setMsg({ tone: 'success', text: 'Informations enregistrées.' }); setDraft(null); void qc.invalidateQueries({ queryKey: ['feature', 'profile'] }); void reloadUser(); },
    onError: (e) => setMsg({ tone: 'error', text: errorMessage(e) }),
  });
  const changePw = useMutation({
    mutationFn: async () => (await http.post('/auth/change-password/', pw)).data,
    onSuccess: async (r) => { if (r?.token) await saveToken(r.token); setPw({ current_password: '', new_password: '', new_password_confirmation: '' }); setPwMsg({ tone: 'success', text: 'Mot de passe modifié. Votre session a été renouvelée.' }); },
    onError: (e) => setPwMsg({ tone: 'error', text: errorMessage(e) }),
  });
  const set = (k: string) => (val: string) => setDraft((d) => ({ ...(d || query.data), [k]: val }));

  return <Screen back keyboard title="Informations personnelles" subtitle={query.data?.email}>
    {query.isPending ? <Skeleton rows={3} /> : query.isError ? <Banner tone="error">{errorMessage(query.error)}</Banner> : <View style={{ gap: space.lg }}>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}><Field label="Prénom" value={v.first_name || ''} onChangeText={set('first_name')} textContentType="givenName" /></View>
        <View style={{ flex: 1 }}><Field label="Nom" value={v.last_name || ''} onChangeText={set('last_name')} textContentType="familyName" /></View>
      </View>
      <Field label="Téléphone" value={v.phone || ''} onChangeText={set('phone')} keyboardType="phone-pad" textContentType="telephoneNumber" />
      <Field label="Adresse" value={v.address || ''} onChangeText={set('address')} />
      <Field label="Ville" value={v.city || ''} onChangeText={set('city')} />
      {msg ? <Banner tone={msg.tone}>{msg.text}</Banner> : null}
      <Button title="Enregistrer" onPress={() => save.mutate()} loading={save.isPending} disabled={!draft} />
    </View>}
    <View style={{ gap: space.lg }}>
      <T v="headline" accessibilityRole="header">Mot de passe</T>
      <Field label="Mot de passe actuel" secureTextEntry autoComplete="current-password" textContentType="password" value={pw.current_password} onChangeText={(x) => setPw((p) => ({ ...p, current_password: x }))} />
      <Field label="Nouveau mot de passe" secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="8 caractères minimum." value={pw.new_password} onChangeText={(x) => setPw((p) => ({ ...p, new_password: x }))} />
      <Field label="Confirmer le nouveau mot de passe" secureTextEntry autoComplete="new-password" textContentType="newPassword" value={pw.new_password_confirmation} onChangeText={(x) => setPw((p) => ({ ...p, new_password_confirmation: x }))}
        error={pw.new_password_confirmation && pw.new_password !== pw.new_password_confirmation ? 'Les mots de passe ne correspondent pas.' : undefined} />
      {pwMsg ? <Banner tone={pwMsg.tone}>{pwMsg.text}</Banner> : null}
      <Button title="Changer le mot de passe" variant="secondary" onPress={() => changePw.mutate()} loading={changePw.isPending}
        disabled={Object.values(pw).some((x) => !x) || pw.new_password !== pw.new_password_confirmation} />
    </View>
    <T v="footnote" color={c.inkFaint}>Votre adresse e-mail sert d’identifiant et ne peut pas être modifiée ici.</T>
  </Screen>;
}

/* ───────────── Company ───────────── */

const COMPANY_GROUPS: { title: string; fields: [string, string, Partial<React.ComponentProps<typeof Field>>?][] }[] = [
  { title: 'Identité', fields: [['legal_name', 'Raison sociale'], ['legal_form', 'Forme juridique'], ['activity', 'Activité'], ['specialization_domain', 'Domaines de spécialité']] },
  { title: 'Identifiants', fields: [['ice', 'ICE', { keyboardType: 'number-pad' }], ['if_number', 'Identifiant fiscal (IF)', { keyboardType: 'number-pad' }], ['rc_number', 'Registre de commerce'], ['rc_city', 'Ville du RC']] },
  { title: 'Siège et contact', fields: [['head_office_address', 'Adresse du siège'], ['city', 'Ville'], ['region', 'Région'], ['phone', 'Téléphone', { keyboardType: 'phone-pad' }], ['email', 'E-mail', { keyboardType: 'email-address', autoCapitalize: 'none' }], ['website', 'Site web', { autoCapitalize: 'none', keyboardType: 'url' }]] },
  { title: 'Représentant légal', fields: [['representative_first_name', 'Prénom'], ['representative_last_name', 'Nom'], ['representative_quality', 'Qualité']] },
  { title: 'Banque', fields: [['bank_name', 'Banque'], ['rib', 'RIB (24 chiffres)', { keyboardType: 'number-pad' }]] },
];

function CompanyScreen() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['feature', 'company'], queryFn: async () => (await http.get(endpoints.features.companies)).data });
  const company = asList<any>(query.data)[0] || (query.data?.id ? query.data : null);
  const [draft, setDraft] = useState<Record<string, any> | null>(null);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const v = draft || company || {};
  const save = useMutation({
    mutationFn: () => http.patch(`/companies/${company.id}/`, draft),
    onSuccess: () => { setMsg({ tone: 'success', text: 'Profil de l’entreprise enregistré.' }); setDraft(null); void qc.invalidateQueries({ queryKey: ['feature', 'company'] }); },
    onError: (e) => setMsg({ tone: 'error', text: errorMessage(e) }),
  });
  const verified = company?.is_verified || String(company?.verification_status || '').toUpperCase() === 'VERIFIED';

  return <Screen back keyboard title="Profil de l’entreprise" subtitle="Utilisé pour pré-remplir vos déclarations et télécharger les DCE."
    footer={company ? <Button title="Enregistrer" onPress={() => save.mutate()} loading={save.isPending} disabled={!draft} /> : undefined}>
    {query.isPending ? <Skeleton rows={4} /> : query.isError ? <Banner tone="error">{errorMessage(query.error)}</Banner> : !company
      ? <EmptyState icon="business-outline" title="Aucune fiche entreprise" body="Créez la fiche de votre entreprise depuis l’application web, puis complétez-la ici." />
      : <>
        <Banner tone={verified ? 'success' : 'warning'} title={verified ? 'Entreprise vérifiée' : 'Vérification en attente'}>
          {verified ? 'Vos informations ont été contrôlées.' : 'Un administrateur doit contrôler vos informations. Une saisie ne vaut pas justificatif.'}
        </Banner>
        {COMPANY_GROUPS.map((g) => <View key={g.title} style={{ gap: space.lg }}>
          <T v="headline" accessibilityRole="header">{g.title}</T>
          {g.fields.map(([k, label, props]) => <Field key={k} label={label} value={v[k] == null ? '' : String(v[k])} onChangeText={(x) => setDraft((d) => ({ ...(d || {}), [k]: x }))} {...props} />)}
        </View>)}
        {msg ? <Banner tone={msg.tone}>{msg.text}</Banner> : null}
      </>}
  </Screen>;
}

/* ───────────── Market picker (assistant / prices) ───────────── */

function useMarketChoices() {
  return useQuery({ queryKey: ['markets', 'choices'], queryFn: async () => asList<TenderMarket>((await http.get(endpoints.markets, { params: { ordering: '-created_at' } })).data) });
}

function MarketPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const markets = useMarketChoices();
  const selected = (markets.data || []).find((m) => String(m.id) === value);
  if (selected) return <Section title="Marché">
    <MarketRow market={selected} onPress={() => onChange('')} />
    <Row icon="swap-horizontal-outline" title="Choisir un autre marché" onPress={() => onChange('')} />
  </Section>;
  return <Section title="Choisissez un marché">
    {markets.isPending ? <Skeleton rows={3} /> : markets.data?.length ? markets.data.slice(0, 12).map((m) => <MarketRow key={m.id} market={m} onPress={() => onChange(String(m.id))} />)
      : <EmptyState icon="briefcase-outline" title="Aucun marché" body="Ajoutez d’abord un marché depuis le portail officiel." />}
  </Section>;
}

/* ───────────── Document assistant ───────────── */

function AssistantScreen({ initialMarket }: { initialMarket?: string }) {
  const { c } = useTheme();
  const [marketId, setMarketId] = useState(initialMarket || '');
  const [question, setQuestion] = useState('');
  const ask = useMutation({
    mutationFn: async () => {
      const r = (await http.post('/client/document-assistant/', { market_id: Number(marketId), question: question.trim() })).data;
      if (String(r.market_id) !== marketId || (r.citations || []).some((x: any) => String(x.market_id) !== marketId)) throw new Error('Les références retournées ne correspondent pas au marché choisi.');
      return r;
    },
  });
  const r = ask.data;
  return <Screen back keyboard title="Assistant documentaire" subtitle="Les réponses citent mot pour mot les documents du marché. Aucune réponse n’est inventée.">
    <MarketPicker value={marketId} onChange={(x) => { setMarketId(x); ask.reset(); }} />
    {marketId ? <View style={{ gap: space.md }}>
      <Field label="Votre question" value={question} onChangeText={setQuestion} maxLength={1000} multiline placeholder="Ex. Quel est le montant de la caution provisoire ?" style={{ minHeight: 72, textAlignVertical: 'top', paddingTop: space.md }} />
      <Button title="Rechercher dans le DCE" icon="search" onPress={() => ask.mutate()} loading={ask.isPending} disabled={question.trim().length < 3} />
    </View> : null}
    {ask.isError ? <Banner tone="error">{errorMessage(ask.error)}</Banner> : null}
    {r ? <View style={{ gap: space.md }}>
      <Card><T v="headline">Réponse</T><T v="body" selectable>{r.answer}</T>{r.notice ? <T v="footnote" color={c.inkSoft}>{r.notice}</T> : null}</Card>
      {(r.citations || []).length ? <Section title="Extraits cités">
        {r.citations.map((x: any, i: number) => <View key={`${x.sha256}-${i}`} style={{ padding: space.lg, gap: space.sm }}>
          <T v="callout" selectable style={{ fontStyle: 'italic' }}>« {x.quote} »</T>
          <T v="footnote" color={c.inkSoft}>{[x.document_name, x.location].filter(Boolean).join(', ')}</T>
        </View>)}
      </Section> : null}
      {(r.warnings || []).map((w: string, i: number) => <Banner key={i} tone="warning">{w}</Banner>)}
    </View> : null}
  </Screen>;
}

/* ───────────── Comparison / recommended price ───────────── */

function PriceInsightScreen({ kind, feature, initialMarket }: { kind: 'comparison' | 'recommendedPrice'; feature: Feature; initialMarket?: string }) {
  const [marketId, setMarketId] = useState(initialMarket || '');
  const run = useMutation({
    mutationFn: async () => {
      const path = `/client/price-estimation/markets/${marketId}/${kind === 'comparison' ? 'comparison/' : 'recommendation/'}`;
      return (kind === 'comparison' ? await http.post(path, {}) : await http.get(path)).data;
    },
  });
  return <Screen back title={feature.title} subtitle={feature.description}>
    <MarketPicker value={marketId} onChange={(x) => { setMarketId(x); run.reset(); }} />
    {marketId ? <Button title={kind === 'comparison' ? 'Comparer' : 'Calculer la recommandation'} icon={feature.icon} onPress={() => run.mutate()} loading={run.isPending} /> : null}
    {run.isError ? <Banner tone="error">{errorMessage(run.error)}</Banner> : null}
    {run.data ? <Card><ValueView value={run.data} /></Card> : null}
    {run.data ? <Banner tone="info">Résultat indicatif, limité aux références disponibles. Il ne prédit pas l’offre gagnante.</Banner> : null}
  </Screen>;
}

/* ───────────── File converter ───────────── */

type Mode = 'pdf-word' | 'pdf-excel' | 'word-pdf' | 'excel-pdf';
const MODES: { key: Mode; label: string; ext: string; accept: string[] }[] = [
  { key: 'pdf-word', label: 'PDF → Word', ext: 'docx', accept: ['application/pdf'] },
  { key: 'pdf-excel', label: 'PDF → Excel', ext: 'xlsx', accept: ['application/pdf'] },
  { key: 'word-pdf', label: 'Word → PDF', ext: 'pdf', accept: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'] },
  { key: 'excel-pdf', label: 'Excel → PDF', ext: 'pdf', accept: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'] },
];

function ConverterScreen({ feature }: { feature: Feature }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>('pdf-word');
  const history = useQuery({ queryKey: ['feature', 'converter'], queryFn: async () => asList<any>((await http.get(feature.endpoint)).data) });
  const spec = useMemo(() => MODES.find((m) => m.key === mode)!, [mode]);
  const convert = useMutation({
    mutationFn: async () => {
      const pick = await DocumentPicker.getDocumentAsync({ type: spec.accept, copyToCacheDirectory: true });
      if (pick.canceled || !pick.assets?.[0]) return null;
      const file = pick.assets[0];
      const payload = new FormData();
      payload.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as any);
      payload.append('mode', mode);
      const res = await http.post('/file-converter/convert/', payload, { responseType: 'arraybuffer', headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 });
      const name = `${file.name.replace(/\.[^.]+$/, '')}.${spec.ext}`;
      const uri = `${FileSystem.cacheDirectory}${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await FileSystem.writeAsStringAsync(uri, encode(res.data), { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { dialogTitle: name });
      return name;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature', 'converter'] }),
  });
  return <Screen back title={feature.title} subtitle="Le fichier est converti par le serveur puis proposé au partage. Ne convertissez que des documents que vous êtes autorisé à traiter."
    refreshing={history.isRefetching} onRefresh={() => void history.refetch()}>
    <Chips options={MODES.map(({ key, label }) => ({ key, label }))} value={mode} onChange={setMode} />
    <Button title="Choisir un fichier" icon="folder-open-outline" onPress={() => convert.mutate()} loading={convert.isPending} />
    {convert.isError ? <Banner tone="error">{errorMessage(convert.error)}</Banner> : null}
    {convert.data ? <Banner tone="success">{convert.data} est prêt.</Banner> : null}
    <Section title="Conversions récentes">
      {history.isPending ? <Skeleton rows={2} /> : history.data?.length ? history.data.slice(0, 20).map((r, i) => <Row key={r.id ?? i} icon="document-outline" title={r.input_filename || r.output_filename || 'Conversion'} subtitle={[r.mode_label, relativeTime(r.created_at)].filter(Boolean).join(', ')} />)
        : <Row icon="time-outline" title="Aucune conversion" />}
    </Section>
  </Screen>;
}

/* ───────────── PDF notice import ───────────── */

function MarketPdfImport() {
  const qc = useQueryClient();
  const run = useMutation({
    mutationFn: async () => {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true, copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.length) return null;
      const form = new FormData();
      for (const f of picked.assets) form.append('files', { uri: f.uri, name: f.name, type: f.mimeType || 'application/pdf' } as any);
      return (await http.post('/marches/import-pdf/', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 })).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['markets'] }),
  });
  const created: TenderMarket[] = run.data ? (Array.isArray(run.data) ? run.data : asList<TenderMarket>(run.data).length ? asList<TenderMarket>(run.data) : run.data?.id ? [run.data] : asList<TenderMarket>(run.data?.markets)) : [];
  return <Screen back title="Importer un avis PDF" subtitle="Créez la fiche d’un marché à partir de l’avis d’appel d’offres en PDF.">
    <Button title="Choisir un ou plusieurs PDF" icon="document-attach-outline" onPress={() => run.mutate()} loading={run.isPending} />
    {run.isError ? <Banner tone="error">{errorMessage(run.error)}</Banner> : null}
    {run.data ? created.length ? <Section title="Marchés importés">{created.map((m) => <MarketRow key={m.id} market={m} />)}</Section>
      : <Banner tone="success" title="Import terminé"><ValueView value={run.data} /></Banner> : null}
    <Banner tone="info">L’import ne certifie pas l’origine du fichier. Vérifiez les informations sur l’avis officiel.</Banner>
  </Screen>;
}

