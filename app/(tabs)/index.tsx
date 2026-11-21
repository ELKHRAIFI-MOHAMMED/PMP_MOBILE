import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';
import { asList, endpoints, errorMessage, http } from '@/src/api/client';
import { useUnreadNotifications } from '@/src/api/hooks';
import { useAuth } from '@/src/auth/AuthProvider';
import { Banner, EmptyState, IconButton, Progress, Row, Screen, Section, Skeleton, T } from '@/src/components/ui';
import { MarketRow } from '@/src/components/market';
import { ChartCard, ColumnChart, RankedBars, StatGrid, type Stat } from '@/src/components/charts';
import { font, space, useTheme } from '@/src/theme/tokens';
import { parseDate } from '@/src/lib/format';
import type { ApplicationDossier, TenderMarket } from '@/src/types/api';

export default function TodayScreen() {
  const { c } = useTheme();
  const { user } = useAuth();
  const unread = useUnreadNotifications();
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: async () => (await http.get(endpoints.dashboard)).data });
  const upcoming = useQuery({
    queryKey: ['markets', 'upcoming'],
    queryFn: async () => {
      const rows = asList<TenderMarket>((await http.get(endpoints.markets, { params: { ordering: '-date_limite' } })).data);
      const now = Date.now();
      return rows.filter((m) => (parseDate(m.date_limite)?.getTime() ?? 0) > now)
        .sort((a, b) => (parseDate(a.date_limite)!.getTime()) - (parseDate(b.date_limite)!.getTime())).slice(0, 5);
    },
  });
  const dossiers = useQuery({ queryKey: ['dossiers'], queryFn: async () => asList<ApplicationDossier>((await http.get(endpoints.dossiers)).data) });

  const refreshing = dashboard.isRefetching || upcoming.isRefetching || dossiers.isRefetching;
  const refresh = () => { void dashboard.refetch(); void upcoming.refetch(); void dossiers.refetch(); void unread.refetch(); };
  const k = dashboard.data?.kpis || {};
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const active = (dossiers.data || []).filter((d) => !['SUBMITTED', 'ARCHIVED', 'CLOSED'].includes(String(d.status || '').toUpperCase())).slice(0, 3);

  return <Screen
    title={`Bonjour${user?.first_name ? `, ${user.first_name}` : ''}`}
    subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
    headerRight={<IconButton name="notifications-outline" label="Notifications" badge={unread.data || 0} onPress={() => router.push('/notifications' as any)} />}
    refreshing={refreshing} onRefresh={refresh}
  >
    {user && !user.profile_completed ? <Banner tone="warning" title="Profil entreprise incomplet" action={{ label: 'Compléter le profil', onPress: () => router.push('/features/company' as any) }}>
      Le téléchargement des DCE et la préparation des dossiers utilisent ces informations.
    </Banner> : null}

    <Section title="Échéances à venir" action={{ label: 'Tous les marchés', onPress: () => router.push('/(tabs)/markets' as any) }}>
      {upcoming.isPending ? <Skeleton rows={3} /> : upcoming.isError ? <View style={{ padding: space.lg }}><Banner tone="error">{errorMessage(upcoming.error)}</Banner></View>
        : upcoming.data?.length ? upcoming.data.map((m) => <MarketRow key={m.id} market={m} />)
        : <EmptyState icon="calendar-clear-outline" title="Aucune échéance ouverte" body="Recherchez un appel d’offres sur le portail officiel pour commencer à le suivre." action={{ label: 'Chercher un marché', onPress: () => router.push('/portal-search' as any) }} />}
    </Section>

    <Section title="Dossiers en préparation" action={active.length ? { label: 'Voir tout', onPress: () => router.push('/(tabs)/applications' as any) } : undefined}>
      {dossiers.isPending ? <Skeleton rows={2} /> : active.length ? active.map((d) => {
        const missing = d.missing_required_documents?.length ?? 0;
        return <View key={d.id} style={{ padding: space.lg, gap: space.sm }}>
          <Row title={d.title || d.market_summary?.objet || `Dossier ${d.id}`} subtitle={missing ? `${missing} pièce${missing > 1 ? 's' : ''} manquante${missing > 1 ? 's' : ''}` : d.reference || 'Aucune pièce manquante signalée'} onPress={() => router.push(`/application/${d.id}` as any)} />
          {typeof d.job_progress === 'number' ? <Progress value={d.job_progress} tone={missing ? 'soon' : 'ready'} /> : null}
        </View>;
      }) : <Row icon="folder-open-outline" title="Aucun dossier en cours" subtitle="Ouvrez un marché puis « Préparer ma candidature »." />}
    </Section>

    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: space.xs }}>
        <T v="headline" accessibilityRole="header">Vos 30 derniers jours</T>
        <Pressable onPress={() => router.push('/features/reports' as any)} hitSlop={12} accessibilityRole="button"><T v="subhead" color={c.accent} style={{ fontFamily: font.semibold }}>Rapport complet</T></Pressable>
      </View>
      {dashboard.isPending ? <Skeleton rows={2} /> : <StatGrid stats={[
        { label: 'Marchés suivis', value: k.markets },
        { label: 'Analyses IA', value: k.analyses, note: k.analyses ? `${k.completed_analyses ?? 0} terminée${(k.completed_analyses ?? 0) > 1 ? 's' : ''}` : undefined, meter: k.analyses ? { value: Number(k.completed_analyses) || 0, of: Number(k.analyses) } : undefined },
        { label: 'Documents', value: k.documents },
        { label: 'Échéances urgentes', value: k.urgent, status: Number(k.urgent) > 0 ? { tone: 'critical', label: 'À traiter cette semaine' } : { tone: 'good', label: 'Rien d’urgent' } },
      ].map((s) => ({ ...s, value: s.value ?? 0 })) as Stat[]} />}
    </View>

    {dashboard.data?.evolution?.length ? <ChartCard title="Activité" subtitle="Actions réalisées dans votre espace, par période de 3 jours">
      <ColumnChart data={dashboard.data.evolution.map((e: { label: string; actions?: number }) => ({ label: e.label, value: Number(e.actions) || 0 }))} />
    </ChartCard> : null}

    {dashboard.data?.sectors?.length ? <ChartCard title="Marchés suivis par catégorie">
      <RankedBars rows={dashboard.data.sectors.map((x: { name: string; value: number }) => ({ name: x.name, value: Number(x.value) || 0 }))} />
    </ChartCard> : null}

    <Section title="Raccourcis">
      <Row icon="globe-outline" title="Chercher sur le portail officiel" subtitle="Par référence ou lien marchespublics.gov.ma" onPress={() => router.push('/portal-search' as any)} />
      <Row icon="document-attach-outline" title="Importer un avis PDF" onPress={() => router.push('/features/marketImport' as any)} />
      <Row icon="chatbubbles-outline" title="Questionner les documents d’un marché" onPress={() => router.push('/features/assistant' as any)} />
      <Row icon="calendar-outline" title="Calendrier et tâches" onPress={() => router.push('/features/calendar' as any)} />
    </Section>
  </Screen>;
}

