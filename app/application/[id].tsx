import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { endpoints, http, errorMessage } from '@/src/api/client';
import { Button, Busy, Card, Heading, Notice, Row, Screen, palette } from '@/src/components/ui';
import { downloadPrivateFile } from '@/src/api/files';

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const qc = useQueryClient();
  const query = useQuery({ queryKey: ['dossier', id], queryFn: async () => (await http.get(`${endpoints.dossiers}${id}/`)).data, refetchInterval: (q) => ['QUEUED', 'RUNNING', 'PROCESSING'].includes(String(q.state.data?.job_status || '').toUpperCase()) ? 2500 : false });
  const [uploadError, setUploadError] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['dossier', id] });
  const analyze = useMutation({ mutationFn: async () => (await http.post(`${endpoints.dossiers}${id}/analyze/`, { consent: true })).data, onSuccess: refresh });
  const generate = useMutation({ mutationFn: async () => (await http.post(`${endpoints.dossiers}${id}/generate/`, {})).data, onSuccess: refresh });
  const dossier = query.data || {};
  async function upload() {
    setUploadError('');
    const pick = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'], copyToCacheDirectory: true });
    if (pick.canceled || !pick.assets?.[0]) return;
    const file = pick.assets[0];
    const payload = new FormData();
    payload.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as any);
    payload.append('document_kind', 'OTHER'); payload.append('revision', String(dossier.revision || 1));
    try { await http.post(`${endpoints.dossiers}${id}/documents/`, payload, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }); await refresh(); }
    catch (err) { setUploadError(errorMessage(err)); }
  }
  if (query.isPending) return <Screen><Busy label="Chargement du dossier…" /></Screen>;
  if (query.isError) return <Screen><Notice tone="error">{errorMessage(query.error)}</Notice></Screen>;
  const requirements = dossier.submission_requirements || [];
  const documents = dossier.documents || [];
  return <Screen><Heading title={dossier.title || `Dossier ${id}`} subtitle={`${dossier.reference || 'Consultation'} · ${dossier.job_status || dossier.status || 'À examiner'}`} />
    {dossier.is_demo || dossier.is_test_session ? <Notice tone="error">Dossier de démonstration / test : ne pas utiliser pour déposer une offre réelle.</Notice> : null}
    <Card><Row title="État du traitement" subtitle={dossier.job_message || 'Vérifiez les pièces et informations manquantes.'} right={dossier.job_progress != null ? `${dossier.job_progress}%` : ''} /><Row title="Pièces manquantes" right={String(dossier.missing_required_documents?.length ?? 0)} />
      {requirements.map((req: any) => <Row key={req.id} title={req.description || req.label || req.id} subtitle={[req.category, req.moment, req.status].filter(Boolean).join(' · ')} right={req.source?.page ? `p. ${req.source.page}` : req.status || 'À examiner'} />)}</Card>
    <Card><Text style={{ color: palette.ink, fontWeight: '800' }}>Pièces du dossier</Text>{documents.map((doc: any) => <Card key={doc.id}>
      <Row title={doc.original_name || doc.kind_label || doc.kind} subtitle={`${doc.status || ''}${doc.reviewed_at ? ' · vérifié' : ' · à vérifier'}`} right={doc.kind_label || doc.kind} />
      <Button title="Partager / télécharger l’original" secondary onPress={() => void downloadPrivateFile(`${endpoints.dossiers}${id}/documents/${doc.id}/download/?variant=original`, doc.original_name || `document-${doc.id}`).catch((e) => Alert.alert('Téléchargement impossible', errorMessage(e)))} />
      {doc.current_version ? <Button title="Partager / télécharger la copie préparée" secondary onPress={() => void downloadPrivateFile(`${endpoints.dossiers}${id}/documents/${doc.id}/download/?variant=prepared`, `brouillon-${doc.original_name || doc.id}.pdf`).catch((e) => Alert.alert('Téléchargement impossible', errorMessage(e)))} /> : null}
    </Card>)}
      <Button title="Ajouter un document réel" secondary onPress={() => void upload()} />{uploadError ? <Notice tone="error">{uploadError}</Notice> : null}</Card>
    <Notice>Les fichiers importés ne sont pas réputés authentiques ou valides. Vérifiez les sources et les versions. Le dossier n’est ni signé ni déposé automatiquement.</Notice>
    <Button title="Analyser les pièces avec Gemini" secondary onPress={() => Alert.alert('Consentement requis', 'Les documents de ce dossier peuvent être transmis à Google Gemini par le backend. Le résultat reste un brouillon à vérifier. Confirmez-vous cet envoi ?', [{ text: 'Annuler', style: 'cancel' }, { text: 'Continuer', onPress: () => analyze.mutate() }])} loading={analyze.isPending} />
    {analyze.isError ? <Notice tone="error">{errorMessage(analyze.error)}</Notice> : null}
    <Button title="Préparer les brouillons disponibles" onPress={() => generate.mutate()} loading={generate.isPending} />
    {generate.isError ? <Notice tone="error">{errorMessage(generate.error)}</Notice> : null}
    {dossier.package_available ? <Notice tone="success">Un dossier exportable est indiqué comme disponible par le backend. Ouvrez-le dans le web si le téléchargement natif n’est pas configuré.</Notice> : null}
  </Screen>;
}
