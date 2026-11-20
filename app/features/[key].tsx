import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { encode } from 'base64-arraybuffer';
import { asList, endpoints, errorMessage, http, saveToken } from '@/src/api/client';
import { useAuth } from '@/src/auth/AuthProvider';
import { Button, Busy, Card, ErrorText, Field, Heading, Notice, Row, Screen, palette } from '@/src/components/ui';

const featureMap: Record<string, { title: string; endpoint: string; description: string; admin?: boolean; unavailable?: string }> = {
  analyses: { title: 'Analyses IA', endpoint: endpoints.analyses, description: 'Résultats et états d’analyse enregistrés pour votre compte.' },
  exports: { title: 'Exports', endpoint: '/exports/', description: 'Demandes d’export et leur état de traitement.' },
  estimates: { title: 'Estimations', endpoint: endpoints.estimates, description: 'Estimations enregistrées dans votre espace.' },
  favorites: { title: 'Favoris', endpoint: endpoints.features.favorites, description: 'Marchés marqués comme favoris pour votre compte.' },
  payments: { title: 'Paiements', endpoint: endpoints.features.payments, description: 'Demandes et statuts de paiement accessibles à votre compte.' },
  profile: { title: 'Paramètres du compte', endpoint: '/auth/me/', description: 'Informations personnelles de votre compte.' },
  documents: { title: 'Documents', endpoint: endpoints.features.documents, description: 'Bibliothèque documentaire de votre espace.' },
  templates: { title: 'Modèles de documents', endpoint: endpoints.features.templates, description: 'Modèles disponibles via le backend.' },
  generatedDocuments: { title: 'Documents générés', endpoint: '/generated-documents/', description: 'Brouillons générés pour validation.' },
  notifications: { title: 'Notifications', endpoint: endpoints.features.notifications, description: 'Notifications enregistrées dans le backend.' },
  reports: { title: 'Rapports', endpoint: endpoints.features.reports, description: 'Rapports calculés par le backend.' },
  invoices: { title: 'Factures', endpoint: '/invoices/', description: 'Facturation du compte entreprise.' },
  calendar: { title: 'Calendrier', endpoint: endpoints.features.calendar, description: 'Échéances et événements du compte.' },
  tasks: { title: 'Plan d’action et tâches', endpoint: endpoints.features.tasks, description: 'Tâches persistées par le backend.' },
  guarantees: { title: 'Garanties', endpoint: endpoints.features.guarantees, description: 'Suivi des garanties de votre entreprise.' },
  subscriptions: { title: 'Abonnement', endpoint: endpoints.features.subscriptions, description: 'Abonnement et accès de votre compte.' },
  plans: { title: 'Offres', endpoint: endpoints.features.plans, description: 'Plans disponibles dans le backend.', admin: true },
  usage: { title: 'Consommation et quotas', endpoint: endpoints.features.usage, description: 'Usage et quotas exposés par le backend.' },
  marketplace: { title: 'Fournisseurs et annonces', endpoint: endpoints.features.marketplace, description: 'Annonces et favoris disponibles; les demandes/devis B2B nécessitent des API dédiées.' },
  company: { title: 'Profil entreprise', endpoint: endpoints.features.companies, description: 'Profil entreprise associé à votre compte.' },
  finance: { title: 'Finances', endpoint: endpoints.features.finance, description: 'Données financières privées du compte.' },
  compliance: { title: 'Conformité documentaire', endpoint: endpoints.features.compliance, description: 'État documentaire et pièces à renouveler.' },
  priceHistory: { title: 'Historique des prix', endpoint: endpoints.features.priceHistory, description: 'Références de prix enregistrées; vérifiez leur périmètre et leur source.' },
  alerts: { title: 'Alertes', endpoint: endpoints.features.notifications, description: 'Alertes et notifications visibles dans votre compte. Les notifications push nécessitent une API d’enregistrement d’appareil absente.' },
  team: { title: 'Équipe', endpoint: '/users/', description: 'Membres visibles selon vos permissions backend.' },
  checklist: { title: 'Checklists de candidature', endpoint: endpoints.dossiers, description: 'Exigences et pièces des dossiers enregistrés.' },
  actionPlan: { title: 'Plan d’action', endpoint: endpoints.features.tasks, description: 'Tâches persistées dans votre compte.' },
  users: { title: 'Gestion des utilisateurs', endpoint: endpoints.features.users, description: 'Utilisateurs auxquels votre permission donne accès.', admin: true },
  companies: { title: 'Gestion des entreprises', endpoint: endpoints.features.companies, description: 'Entreprises accessibles selon vos permissions.', admin: true },
  paymentRequests: { title: 'Demandes de paiement', endpoint: endpoints.features.paymentRequests, description: 'Demandes accessibles selon les autorisations backend.', admin: true },
  paymentMethods: { title: 'Moyens de paiement', endpoint: endpoints.features.paymentMethods, description: 'Configuration des moyens de paiement.', admin: true },
  permissions: { title: 'Permissions', endpoint: endpoints.features.permissions, description: 'Permissions exposées par Django.', admin: true },
  aiResults: { title: 'Résultats IA', endpoint: endpoints.features.aiResults, description: 'Résultats accessibles par l’administration.', admin: true },
  priceWorkflow: { title: 'Estimation détaillée', endpoint: '/client/price-estimation/markets/', description: 'État du workflow de prix du marché sélectionné.' },
  comparison: { title: 'Comparaison historique', endpoint: '', description: 'Comparaison générée par le backend à partir des données historiques disponibles.' },
  recommendedPrice: { title: 'Prix recommandé', endpoint: '', description: 'Recommandation enregistrée et éléments de preuve associés.' },
  assistant: { title: 'Assistant documentaire', endpoint: '', description: 'Recherche d’extraits textuels sourcés dans les documents autorisés du marché.' },
  marketImport: { title: 'Importer un avis PDF', endpoint: '', description: 'Import d’un PDF via l’endpoint Django existant.' },
  converter: { title: 'Conversion de fichiers', endpoint: '/file-converter/history/', description: 'Conversion serveur des documents autorisés par votre permission.' },
  systemHealth: { title: 'Santé système', endpoint: '', description: '', unavailable: 'Aucune API de santé système mobile vérifiée.' },
  storage: { title: 'Stockage', endpoint: '', description: '', unavailable: 'Aucune API de gouvernance stockage mobile vérifiée.' },
  integrations: { title: 'Intégrations', endpoint: '', description: '', unavailable: 'Aucune API de gestion des intégrations mobile vérifiée.' },
  aiModels: { title: 'Modèles IA', endpoint: '', description: '', unavailable: 'Aucune API de gestion des modèles IA mobile vérifiée.' },
  aiUsage: { title: 'Gouvernance IA', endpoint: '', description: '', unavailable: 'Aucune API d’administration mobile pour la gouvernance et les coûts IA n’a été vérifiée.' },
  aiCosts: { title: 'Coûts IA', endpoint: '', description: '', unavailable: 'Aucune API d’administration mobile pour les coûts IA n’a été vérifiée.' },
  revenue: { title: 'Revenus', endpoint: '', description: '', unavailable: 'Aucune API d’administration mobile pour les revenus n’a été vérifiée.' },
  security: { title: 'Sécurité plateforme', endpoint: '', description: '', unavailable: 'Aucune API d’administration mobile pour la sécurité système n’a été vérifiée.' },
  systemLogs: { title: 'Journaux système', endpoint: '', description: '', unavailable: 'Aucune API de journaux système mobile n’a été vérifiée.' },
  alertSettings: { title: 'Paramètres des alertes', endpoint: '', description: '', unavailable: 'Aucune API mobile de configuration des alertes ou des appareils push n’a été vérifiée.' },
};

function titleOf(row: any) { return row.title || row.name || row.objet || row.reference || row.filename || row.original_name || row.email || row.id || 'Élément'; }
function subtitleOf(row: any) { return [row.reference, row.status, row.state, row.created_at, row.updated_at].filter(Boolean).join(' · '); }

export default function FeatureScreen() {
  const { key, id, market } = useLocalSearchParams<{ key: string; id?: string; market?: string }>();
  const feature = featureMap[key] || { title: 'Fonctionnalité', endpoint: '', description: '', unavailable: 'Cette fonction n’a pas de route backend mobile identifiée.' };
  const { user } = useAuth(); const qc = useQueryClient(); const [profile, setProfile] = useState<any>(null); const [message, setMessage] = useState('');
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [marketId, setMarketId] = useState(String(market || '')); const [question, setQuestion] = useState(''); const [assistantResult, setAssistantResult] = useState<any>(null); const [operationError, setOperationError] = useState(''); const [busy, setBusy] = useState(false); const [convertMode, setConvertMode] = useState('pdf-word');
  const endpoint = useMemo(() => {
    if (key === 'priceWorkflow') return market ? `/client/price-estimation/markets/${market}/workflow/` : '';
    if (key === 'recommendedPrice') return marketId ? `/client/price-estimation/markets/${marketId}/recommendation/` : '';
    if (key === 'company') return id ? `/companies/${id}/` : feature.endpoint;
    if (key === 'profile') return '/auth/me/';
    if (id && feature.endpoint) return `${feature.endpoint.replace(/\/$/, '')}/${id}/`;
    return feature.endpoint;
  }, [key, id, market, marketId, feature.endpoint]);
  const query = useQuery({ queryKey: ['feature', key, id, market, marketId], enabled: Boolean(endpoint) && key !== 'converter', queryFn: async () => (await http.get(endpoint)).data });
  const marketsQuery = useQuery({ queryKey: ['assistant-markets'], enabled: ['assistant', 'comparison', 'recommendedPrice'].includes(key), queryFn: async () => (await http.get(endpoints.markets, { params: { page_size: 50 } })).data });
  const markRead = useMutation({ mutationFn: (notificationId: number) => http.post(`/notifications/${notificationId}/read/`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['feature', 'notifications'] }) });
  const toggleMarketplaceFavorite = useMutation({ mutationFn: ({ id: itemId, favorite }: { id: number; favorite: boolean }) => favorite ? http.delete(`/marketplace/${itemId}/favorite/`) : http.post(`/marketplace/${itemId}/favorite/`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['feature', 'marketplace'] }) });
  const markAll = useMutation({ mutationFn: () => http.post('/notifications/read-all/', {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['feature', 'notifications'] }) });
  const isAdminUser = ['ADMIN', 'STAFF', 'MANAGER', 'MODERATOR'].includes(String(user?.role || '').toUpperCase()) || user?.is_staff || user?.is_superuser;
  if (feature.admin && !isAdminUser) return <Screen><Heading title={feature.title} /><Notice tone="error">Cette section est réservée aux rôles administratifs. Les permissions restent appliquées par Django.</Notice></Screen>;
  if (feature.unavailable) return <Screen><Heading title={feature.title} /><Notice>{feature.unavailable}</Notice></Screen>;
  if (key === 'marketImport') return <MarketPdfImport />;
  const data = query.data;
  const rows = key === 'priceWorkflow' ? [] : asList<any>(data);
  const profileValue = profile || data;
  if (key === 'profile') return <Screen><Heading title="Paramètres du compte" subtitle="Modifiez les champs autorisés par l’API du profil." />
    {query.isPending ? <Busy /> : query.isError ? <Notice tone="error">{errorMessage(query.error)}</Notice> : <Card>
      {(['first_name', 'last_name', 'phone', 'address', 'city'] as const).map((field) => <Field key={field} label={{ first_name: 'Prénom', last_name: 'Nom', phone: 'Téléphone', address: 'Adresse', city: 'Ville' }[field]} value={profileValue?.[field] || ''} onChangeText={(value) => setProfile((old: any) => ({ ...(old || profileValue), [field]: value }))} />)}
      <Button title="Enregistrer le profil" onPress={async () => { try { await http.patch('/auth/me/', profile || profileValue); setMessage('Profil mis à jour.'); void qc.invalidateQueries({ queryKey: ['feature', 'profile'] }); } catch (e) { setMessage(errorMessage(e)); } }} />{message ? <Text style={{ color: palette.muted }}>{message}</Text> : null}
    </Card>}
    <Card><Text style={{ color: palette.ink, fontWeight: '800' }}>Changer le mot de passe</Text>
      <Field label="Mot de passe actuel" secureTextEntry value={passwords.current_password} onChangeText={(v) => setPasswords((p) => ({ ...p, current_password: v }))} />
      <Field label="Nouveau mot de passe" secureTextEntry value={passwords.new_password} onChangeText={(v) => setPasswords((p) => ({ ...p, new_password: v }))} />
      <Field label="Confirmer le nouveau mot de passe" secureTextEntry value={passwords.new_password_confirmation} onChangeText={(v) => setPasswords((p) => ({ ...p, new_password_confirmation: v }))} />
      <Button title="Mettre à jour le mot de passe" secondary disabled={Object.values(passwords).some((v) => !v)} onPress={async () => { try { const result = (await http.post('/auth/change-password/', passwords)).data; await saveToken(result.token); setPasswords({ current_password: '', new_password: '', new_password_confirmation: '' }); setMessage('Mot de passe modifié; votre session a été renouvelée.'); } catch (e) { setMessage(errorMessage(e)); } }} />
      {message ? <Text style={{ color: palette.muted }}>{message}</Text> : null}
    </Card></Screen>;
  if (key === 'company') {
    const company = profile || asList<any>(data)[0] || data;
    const fields = ['legal_name', 'legal_form', 'ice', 'if_number', 'rc_number', 'rc_city', 'activity', 'specialization_domain', 'head_office_address', 'city', 'region', 'representative_first_name', 'representative_last_name', 'representative_quality', 'phone', 'email', 'website', 'bank_name', 'rib'];
    const labels: Record<string, string> = { legal_name: 'Raison sociale', legal_form: 'Forme juridique', ice: 'ICE', if_number: 'IF', rc_number: 'Registre de commerce', rc_city: 'Ville du RC', activity: 'Activité', specialization_domain: 'Spécialités', head_office_address: 'Adresse du siège', city: 'Ville', region: 'Région', representative_first_name: 'Prénom du représentant', representative_last_name: 'Nom du représentant', representative_quality: 'Qualité du représentant', phone: 'Téléphone entreprise', email: 'E-mail entreprise', website: 'Site web', bank_name: 'Banque', rib: 'RIB' };
    return <Screen><Heading title="Profil entreprise" subtitle="Données de l’entreprise enregistrées dans le backend." />{query.isPending ? <Busy /> : query.isError ? <Notice tone="error">{errorMessage(query.error)}</Notice> : !company?.id ? <Notice>Le compte n’a pas encore de fiche entreprise. Sa création doit être faite via le parcours backend/web autorisé.</Notice> : <Card>
      <Notice>Statut de vérification : {company.verification_status || (company.is_verified ? 'Vérifié' : 'En attente')}. Un téléversement ou une saisie ne rend pas les justificatifs authentiques.</Notice>
      {fields.map((field) => <Field key={field} label={labels[field]} value={String((profile || company)[field] ?? '')} onChangeText={(value) => setProfile((old: any) => ({ ...(old || company), [field]: value }))} />)}
      <Button title="Enregistrer le profil entreprise" onPress={async () => { try { await http.patch(`/companies/${company.id}/`, profile || company); setMessage('Profil entreprise mis à jour.'); void qc.invalidateQueries({ queryKey: ['feature', 'company'] }); } catch (e) { setMessage(errorMessage(e)); } }} />{message ? <Text style={{ color: palette.muted }}>{message}</Text> : null}
    </Card>}</Screen>;
  }
  if (key === 'assistant') return <Screen><Heading title={feature.title} subtitle={feature.description} /><Notice>Aucune réponse générative n’est appelée par cet assistant. Les citations sont des extraits littéraux à vérifier dans la pièce d’origine.</Notice>
    {marketsQuery.isPending ? <Busy label="Chargement des consultations…" /> : marketsQuery.isError ? <Notice tone="error">{errorMessage(marketsQuery.error)}</Notice> : <Card>
      {asList<any>(marketsQuery.data).map((row) => <Row key={row.id} title={row.reference || row.objet || `Marché ${row.id}`} subtitle={row.objet || ''} right={String(row.id) === marketId ? 'Sélectionné' : 'Choisir'} onPress={() => { setMarketId(String(row.id)); setAssistantResult(null); }} />)}
      <Field label="Identifiant de consultation sélectionnée" keyboardType="number-pad" value={marketId} onChangeText={setMarketId} />
      <Field label="Question documentaire" placeholder="Ex. Quelle est la date limite de remise ?" value={question} onChangeText={setQuestion} maxLength={1000} />
      <Button title="Rechercher dans les documents" disabled={!marketId || question.trim().length < 3 || busy} loading={busy} onPress={async () => { setBusy(true); setOperationError(''); setAssistantResult(null); try { const result = (await http.post('/client/document-assistant/', { market_id: Number(marketId), question: question.trim() })).data; if (String(result.market_id) !== marketId || (result.citations || []).some((c: any) => String(c.market_id) !== marketId)) throw new Error('Les références retournées ne correspondent pas au marché sélectionné.'); setAssistantResult(result); } catch (e) { setOperationError(errorMessage(e)); } finally { setBusy(false); } }} />
    </Card>}
    {operationError ? <ErrorText>{operationError}</ErrorText> : null}{assistantResult ? <Card><Text style={{ color: palette.ink, fontWeight: '800' }}>{assistantResult.answer}</Text><Notice>{assistantResult.notice}</Notice>{(assistantResult.citations || []).map((c: any, i: number) => <Card key={`${c.sha256}-${i}`}><Text style={{ color: palette.ink }}>{c.quote}</Text><Text style={{ color: palette.muted }}>{c.document_name} · {c.location} · SHA-256 {c.sha256}</Text></Card>)}{(assistantResult.warnings || []).map((w: string, i: number) => <Notice key={i}>{w}</Notice>)}</Card> : null}</Screen>;
  if (key === 'comparison' || key === 'recommendedPrice') return <Screen><Heading title={feature.title} subtitle={feature.description} />
    <Card>{asList<any>(marketsQuery.data).map((row) => <Row key={row.id} title={row.reference || row.objet || `Marché ${row.id}`} subtitle={row.objet || ''} right={String(row.id) === marketId ? 'Sélectionné' : 'Choisir'} onPress={() => setMarketId(String(row.id))} />)}
      <Field label="Identifiant du marché" value={marketId} onChangeText={setMarketId} keyboardType="number-pad" />
      <Button title={key === 'comparison' ? 'Comparer aux références disponibles' : 'Charger la recommandation'} onPress={async () => { setBusy(true); setOperationError(''); try { const path = `/client/price-estimation/markets/${marketId}/${key === 'comparison' ? 'comparison/' : 'recommendation/'}`; const response = key === 'comparison' ? await http.post(path, {}) : await http.get(path); setAssistantResult(response.data); } catch (e) { setOperationError(errorMessage(e)); setAssistantResult(null); } finally { setBusy(false); } }} loading={busy} disabled={!marketId} />
    </Card>{operationError ? <Notice tone="error">{operationError}</Notice> : null}{assistantResult ? <Card><Text style={{ color: palette.ink, fontWeight: '800' }}>Résultat du backend</Text><Text selectable style={{ color: palette.muted, lineHeight: 20 }}>{JSON.stringify(assistantResult, null, 2)}</Text><Notice>Cette comparaison est indicative, dépend des références accessibles et ne prédit pas l’offre gagnante.</Notice></Card> : null}</Screen>;
  if (key === 'converter') return <Screen><Heading title={feature.title} subtitle={feature.description} /><Notice>La conversion envoie le fichier au backend authentifié. Ne sélectionnez qu’un document que vous êtes autorisé à traiter.</Notice>
    <Card><Field label="Mode (ex. pdf-word, word-pdf, pdf-excel, excel-pdf)" value={convertMode} onChangeText={setConvertMode} autoCapitalize="none" /><Button title="Choisir un fichier et convertir" loading={busy} onPress={async () => { const pick = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true }); if (pick.canceled || !pick.assets?.[0]) return; setBusy(true); setOperationError(''); try { const file = pick.assets[0]; const payload = new FormData(); payload.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as any); payload.append('mode', convertMode); const response = await http.post('/file-converter/convert/', payload, { responseType: 'arraybuffer', headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }); const name = `${file.name.replace(/\.[^.]+$/, '')}-converti.${convertMode.endsWith('word') || convertMode === 'pdf-word' || convertMode === 'excel-word' ? 'docx' : convertMode.endsWith('excel') || convertMode === 'pdf-excel' || convertMode === 'word-excel' ? 'xlsx' : 'pdf'}`; const uri = `${FileSystem.cacheDirectory}${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`; await FileSystem.writeAsStringAsync(uri, encode(response.data), { encoding: FileSystem.EncodingType.Base64 }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { dialogTitle: name }); void qc.invalidateQueries({ queryKey: ['feature', 'converter'] }); } catch (e) { setOperationError(errorMessage(e)); } finally { setBusy(false); } }} />{operationError ? <ErrorText>{operationError}</ErrorText> : null}</Card>
    <Card><Text style={{ color: palette.ink, fontWeight: '800' }}>Conversions récentes</Text>{query.isPending ? <Busy /> : query.isError ? <Notice tone="error">{errorMessage(query.error)}</Notice> : asList<any>(query.data).map((row, i) => <Row key={row.id || i} title={row.input_filename || row.output_filename || 'Conversion'} subtitle={row.mode_label || row.created_at} />)}</Card></Screen>;
  return <Screen><Heading title={feature.title} subtitle={feature.description} />
    {key === 'notifications' && <Button title="Tout marquer comme lu" secondary onPress={() => markAll.mutate()} loading={markAll.isPending} />}
    {query.isPending ? <Busy /> : query.isError ? <Notice tone="error">{errorMessage(query.error)}{(query.error as any)?.response?.status === 403 ? ' Accès refusé par les permissions de votre compte.' : ''}</Notice> : key === 'priceWorkflow' ? <Card>
      <Text style={{ color: palette.ink, fontWeight: '800' }}>Synthèse du marché</Text><Text style={{ color: palette.muted }}>{data?.market?.reference || `Marché ${market}`}</Text><Notice>Les coûts, sources et hypothèses restent privés. Utilisez l’écran Estimation pour consulter les données et lancer les traitements disponibles.</Notice>
    </Card> : rows.length ? <Card>{rows.map((row: any, index: number) => <Row key={row.id ?? index} title={titleOf(row)} subtitle={subtitleOf(row)} right={key === 'notifications' && !row.read_at ? 'Marquer lu' : key === 'marketplace' ? (row.is_favorite ? 'Retirer favori' : 'Ajouter favori') : 'Ouvrir'} onPress={() => {
      if (key === 'notifications' && row.id) { markRead.mutate(row.id); return; }
      if (key === 'marketplace' && row.id) { toggleMarketplaceFavorite.mutate({ id: row.id, favorite: Boolean(row.is_favorite) }); return; }
      if (key === 'favorites' && (row.marche || row.market || row.marche_id)) { router.push((`/market/${row.marche || row.market || row.marche_id}`) as any); return; }
      if (row.id && ['analyses', 'documents', 'invoices', 'templates', 'generatedDocuments', 'users', 'companies', 'paymentRequests'].includes(key)) router.push(`/features/${key}?id=${row.id}` as any);
    }} />)}</Card> : <Notice>Aucun élément n’est renvoyé par le backend pour cette section.</Notice>}
    {key === 'marketplace' ? <Notice>Le backend fournit des annonces et favoris. Le parcours B2B complet (demande, devis, comparaison de devis) n’est pas disponible via les API vérifiées.</Notice> : null}
    {['documents', 'generatedDocuments'].includes(key) ? <Notice>Les fichiers privés doivent être téléchargés par une route authentifiée. Les URL publiques ou les médias bruts ne sont pas utilisés comme accès.</Notice> : null}
  </Screen>;
}

function MarketPdfImport() {
  const [busy, setBusy] = useState(false); const [result, setResult] = useState<any>(null); const [error, setError] = useState(''); const qc = useQueryClient();
  return <Screen><Heading title="Importer un avis PDF" subtitle="Le fichier est envoyé au backend afin de créer ou compléter une fiche de marché selon ses règles d’import." />
    <Notice>Ne fournissez pas de faux résultat de scraping. Ce parcours utilise uniquement l’import PDF serveur et ne certifie pas l’origine d’un fichier importé.</Notice>
    <Card><Button title="Sélectionner un ou plusieurs PDF" loading={busy} onPress={async () => {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true, copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.length) return;
      setBusy(true); setError(''); setResult(null);
      try {
        const form = new FormData();
        for (const file of picked.assets) form.append('files', { uri: file.uri, name: file.name, type: file.mimeType || 'application/pdf' } as any);
        const response = await http.post('/marches/import-pdf/', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
        setResult(response.data); void qc.invalidateQueries({ queryKey: ['markets'] });
      } catch (e) { setError(errorMessage(e)); }
      finally { setBusy(false); }
    }} />{error ? <ErrorText>{error}</ErrorText> : null}{result ? <Notice tone="success">Import transmis au backend. Résultat : {JSON.stringify(result)}</Notice> : null}</Card>
  </Screen>;
}
