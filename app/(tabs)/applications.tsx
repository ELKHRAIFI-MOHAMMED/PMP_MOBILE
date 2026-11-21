import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { asList, endpoints, errorMessage, http } from '@/src/api/client';
import { Banner, EmptyState, Progress, Row, Screen, Section, Skeleton, StatusPill, T } from '@/src/components/ui';
import { relativeTime } from '@/src/lib/format';
import { space, useTheme } from '@/src/theme/tokens';
import type { ApplicationDossier } from '@/src/types/api';

export default function ApplicationsScreen() {
  const { c } = useTheme();
  const query = useQuery({ queryKey: ['dossiers'], queryFn: async () => asList<ApplicationDossier>((await http.get(endpoints.dossiers)).data) });
  const rows = query.data || [];

  return <Screen title="Dossiers" subtitle="Vos candidatures en préparation : pièces, exigences et brouillons."
    refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    {query.isError ? <Banner tone="error" action={{ label: 'Réessayer', onPress: () => void query.refetch() }}>{errorMessage(query.error)}</Banner> : null}
    {query.isPending ? <Skeleton rows={3} /> : rows.length ? <Section>
      {rows.map((d) => {
        const missing = d.missing_required_documents?.length ?? 0;
        return <View key={d.id} style={{ paddingBottom: typeof d.job_progress === 'number' ? space.md : 0 }}>
          <Row title={d.title || d.market_summary?.objet || `Dossier ${d.id}`}
            subtitle={[d.reference, missing ? `${missing} pièce${missing > 1 ? 's' : ''} manquante${missing > 1 ? 's' : ''}` : null, d.updated_at ? `modifié ${relativeTime(d.updated_at)}` : null].filter(Boolean).join('\n')}
            trailing={<StatusPill status={d.is_test_session ? 'DRAFT' : d.job_status || d.status} label={d.is_test_session ? 'Test' : undefined} />}
            onPress={() => router.push(`/application/${d.id}` as any)} />
          {typeof d.job_progress === 'number' ? <View style={{ paddingHorizontal: space.lg }}><Progress value={d.job_progress} tone={missing ? 'soon' : 'ready'} /></View> : null}
        </View>;
      })}
    </Section> : !query.isError ? <EmptyState icon="folder-open-outline" title="Aucun dossier pour l’instant"
      body="Ouvrez un marché puis touchez « Préparer ma candidature » : la liste des pièces exigées sera créée à partir du DCE."
      action={{ label: 'Parcourir les marchés', onPress: () => router.push('/(tabs)/markets' as any) }} /> : null}
    <T v="footnote" color={c.inkFaint}>Les documents générés sont des brouillons à vérifier. L’application ne signe pas et ne dépose pas votre offre.</T>
  </Screen>;
}
