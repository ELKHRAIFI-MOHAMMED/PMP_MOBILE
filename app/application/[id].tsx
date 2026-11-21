import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, View } from 'react-native';
import { endpoints, errorMessage, http } from '@/src/api/client';
import { downloadPrivateFile } from '@/src/api/files';
import { Banner, Button, Busy, Card, EmptyState, Progress, Row, Screen, Section, StatusPill, T } from '@/src/components/ui';
import { formatBytes, statusInfo } from '@/src/lib/format';
import { space, useTheme } from '@/src/theme/tokens';
import type { ApplicationDossier, PreparationDocument, SubmissionRequirement } from '@/src/types/api';

const RUNNING = ['QUEUED', 'RUNNING', 'PROCESSING', 'PENDING', 'STARTED'];
const MIME = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

function reqTone(r: SubmissionRequirement): 'ready' | 'soon' | 'urgent' | 'closed' {
  if (r.expired) return 'urgent';
  if (r.ready || statusInfo(r.status).tone === 'ready') return 'ready';
  if (['MISSING', 'REQUIRED'].includes(String(r.status || '').toUpperCase())) return 'soon';
  return 'closed';
}
const reqIcon = { ready: 'checkmark-circle', soon: 'ellipse-outline', urgent: 'alert-circle', closed: 'help-circle-outline' } as const;

export default function ApplicationDetailScreen() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const query = useQuery({
    queryKey: ['dossier', id],
    queryFn: async () => (await http.get(`${endpoints.dossiers}${id}/`)).data as ApplicationDossier,
    refetchInterval: (q) => RUNNING.includes(String(q.state.data?.job_status || '').toUpperCase()) ? 2500 : false,
  });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['dossier', id] }); void qc.invalidateQueries({ queryKey: ['dossiers'] }); };
  const d = query.data;
  const analyze = useMutation({ mutationFn: async () => (await http.post(`${endpoints.dossiers}${id}/analyze/`, { consent: true, revision: d?.revision })).data, onSuccess: refresh });
  const stop = useMutation({ mutationFn: async () => (await http.post(`${endpoints.dossiers}${id}/stop-analysis/`, { revision: d?.revision })).data, onSuccess: refresh });
  const generate = useMutation({ mutationFn: async () => (await http.post(`${endpoints.dossiers}${id}/generate/`, { revision: d?.revision })).data, onSuccess: refresh });

  async function upload() {
    setUploadError('');
    const pick = await DocumentPicker.getDocumentAsync({ type: MIME, copyToCacheDirectory: true });
    if (pick.canceled || !pick.assets?.[0]) return;
    const file = pick.assets[0];
    if (file.size && file.size > 10 * 1024 * 1024) { setUploadError('Ce fichier dépasse 10 Mo, la taille maximale acceptée.'); return; }
    const payload = new FormData();
    payload.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as any);
    payload.append('document_kind', 'OTHER');
    payload.append('revision', String(d?.revision || 1));
    setUploading(true);
    try { await http.post(`${endpoints.dossiers}${id}/documents/`, payload, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 }); refresh(); }
    catch (err) { setUploadError(errorMessage(err)); }
    finally { setUploading(false); }
  }

  function documentActions(doc: PreparationDocument) {
    const get = (variant: 'original' | 'prepared') => void downloadPrivateFile(`${endpoints.dossiers}${id}/documents/${doc.id}/download/?variant=${variant}`, variant === 'prepared' ? `brouillon-${doc.original_name}` : doc.original_name)
      .catch((e) => Alert.alert('Téléchargement impossible', errorMessage(e)));
    const options = ['Ouvrir l’original', ...(doc.current_version ? ['Ouvrir la version préparée'] : []), 'Annuler'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: options.length - 1, title: doc.original_name }, (i) => {
        if (i === 0) get('original'); else if (i === 1 && doc.current_version) get('prepared');
      });
    } else {
      Alert.alert(doc.original_name, undefined, [
        { text: 'Original', onPress: () => get('original') },
        ...(doc.current_version ? [{ text: 'Version préparée', onPress: () => get('prepared') }] : []),
        { text: 'Annuler', style: 'cancel' as const },
      ]);
    }
  }

  if (query.isPending) return <Screen back><Busy label="Chargement du dossier…" /></Screen>;
  if (query.isError || !d) return <Screen back><Banner tone="error" action={{ label: 'Réessayer', onPress: () => void query.refetch() }}>{errorMessage(query.error)}</Banner></Screen>;

  const requirements = d.submission_requirements || [];
  const documents = d.documents || [];
  const running = RUNNING.includes(String(d.job_status || '').toUpperCase());
  const ready = requirements.filter((r) => reqTone(r) === 'ready').length;

  return <Screen back title={d.title || `Dossier ${d.id}`} subtitle={d.reference}
    refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
    footer={d.package_available
      ? <Button title="Télécharger le dossier" icon="download-outline" onPress={() => void downloadPrivateFile(`${endpoints.dossiers}${id}/download/`, `dossier-${d.reference || id}.zip`).catch((e) => Alert.alert('Téléchargement impossible', errorMessage(e)))} />
      : <Button title="Préparer les brouillons" icon="create-outline" onPress={() => generate.mutate()} loading={generate.isPending} disabled={running || !documents.length} />}>

    {d.is_demo || d.is_test_session ? <Banner tone="warning" title="Session de test">Ce dossier contient des données de démonstration. Ne l’utilisez pas pour déposer une offre.</Banner> : null}

    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md }}>
        <T v="headline" style={{ flex: 1 }}>{running ? 'Traitement en cours' : 'Avancement'}</T>
        <StatusPill status={d.job_status || d.status} />
      </View>
      {requirements.length ? <Progress value={(ready / requirements.length) * 100} tone={ready === requirements.length ? 'ready' : 'soon'} label={`${ready} exigence${ready > 1 ? 's' : ''} satisfaite${ready > 1 ? 's' : ''} sur ${requirements.length}`} /> : null}
      {running && typeof d.job_progress === 'number' ? <Progress value={d.job_progress} label="Analyse" /> : null}
      {d.job_message ? <T v="subhead" color={c.inkSoft}>{d.job_message}</T> : null}
      {running ? <Button title="Arrêter l’analyse" variant="plain" compact onPress={() => stop.mutate()} loading={stop.isPending} /> : null}
    </Card>
    {[analyze, generate, stop].map((m, i) => m.isError ? <Banner key={i} tone="error">{errorMessage(m.error)}</Banner> : null)}

    <Section title="Pièces exigées" footnote={requirements.length ? 'Touchez une exigence pour voir sa source dans le DCE.' : undefined}>
      {requirements.length ? requirements.map((r) => {
        const tone = reqTone(r);
        const src = typeof r.source === 'object' && r.source ? [r.source.document, r.source.page ? `p. ${r.source.page}` : null].filter(Boolean).join(', ') : r.location || (typeof r.source === 'string' ? r.source : '');
        return <Row key={r.id} icon={reqIcon[tone]} iconTone={tone} title={r.label || r.name || r.description || r.id}
          subtitle={[r.category, r.moment].filter(Boolean).join(' – ') || undefined} value={src || undefined}
          onPress={r.quote || src ? () => Alert.alert(r.label || r.name || 'Exigence', [r.quote ? `« ${r.quote} »` : null, src ? `Source : ${src}` : null].filter(Boolean).join('\n\n')) : undefined} />;
      }) : <EmptyState icon="list-outline" title="Pas encore d’exigences" body="Ajoutez le DCE ou vos pièces puis lancez l’analyse pour établir la liste des pièces à fournir." />}
    </Section>

    <Section title={`Vos documents${documents.length ? ` (${documents.length})` : ''}`} action={{ label: uploading ? 'Envoi…' : 'Ajouter', onPress: () => void upload() }}
      footnote="PDF, Word ou Excel, 10 Mo maximum. Un fichier importé n’est pas réputé authentique.">
      {documents.length ? documents.map((doc) => <Row key={doc.id} icon="document-text-outline" iconTone={doc.reviewed_at ? 'ready' : 'accent'}
        title={doc.original_name} subtitle={[doc.kind_label || doc.kind, doc.reviewed_at ? 'vérifié' : 'à vérifier', formatBytes(doc.size)].filter(Boolean).join(', ')}
        onPress={() => documentActions(doc)} />)
        : <Row icon="cloud-upload-outline" title="Ajouter une première pièce" subtitle="Attestations, statuts, références, CV…" onPress={() => void upload()} />}
    </Section>
    {uploadError ? <Banner tone="error">{uploadError}</Banner> : null}

    <Section title="Assistant">
      {!running ? <Row icon="sparkles-outline" title="Vérifier mes pièces avec l’IA" subtitle="Compare vos documents aux exigences du DCE"
        onPress={() => Alert.alert('Vérifier avec l’IA', 'Les documents de ce dossier seront transmis à Google Gemini. Le résultat reste un brouillon à vérifier.', [{ text: 'Annuler', style: 'cancel' }, { text: 'Continuer', onPress: () => analyze.mutate() }])} /> : null}
      <Row icon="briefcase-outline" title="Voir le marché" onPress={() => router.push(`/market/${d.marche}` as any)} />
    </Section>
  </Screen>;
}
