import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { asList, errorMessage, http } from '@/src/api/client';
import { Banner, Button, EmptyState, Row, Screen, Section, Skeleton } from '@/src/components/ui';
import { relativeTime } from '@/src/lib/format';
import { useTheme } from '@/src/theme/tokens';
import type { BackendNotification } from '@/src/types/api';

const ICON: Record<string, React.ComponentProps<typeof Row>['icon']> = {
  ANALYSIS: 'sparkles-outline', PAYMENT: 'card-outline', DEADLINE: 'alarm-outline', MARKET: 'briefcase-outline', DOCUMENT: 'document-text-outline', SYSTEM: 'information-circle-outline',
};

function groupLabel(iso?: string) {
  if (!iso) return 'Plus ancien';
  const d = new Date(iso); const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = (today.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000;
  return diff <= 0 ? 'Aujourd’hui' : diff <= 1 ? 'Hier' : diff <= 7 ? 'Cette semaine' : 'Plus ancien';
}

export default function NotificationsScreen() {
  const { c } = useTheme();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['notifications', 'list'], queryFn: async () => asList<BackendNotification>((await http.get('/notifications/')).data) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: (id: number) => http.post(`/notifications/${id}/read/`, {}), onSuccess: invalidate });
  const markAll = useMutation({ mutationFn: () => http.post('/notifications/read-all/', {}), onSuccess: invalidate });

  const rows = query.data || [];
  const unread = rows.filter((n) => !n.is_read && !n.read_at).length;
  const groups = rows.reduce<Record<string, BackendNotification[]>>((acc, n) => { (acc[groupLabel(n.created_at)] ||= []).push(n); return acc; }, {});

  return <Screen back title="Notifications" subtitle={unread ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est lu'}
    refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    {unread ? <Button title="Tout marquer comme lu" icon="checkmark-done-outline" variant="secondary" compact onPress={() => markAll.mutate()} loading={markAll.isPending} /> : null}
    {query.isError ? <Banner tone="error">{errorMessage(query.error)}</Banner> : null}
    {query.isPending ? <Skeleton rows={4} /> : rows.length ? Object.entries(groups).map(([label, items]) => <Section key={label} title={label}>
      {items.map((n) => {
        const isUnread = !n.is_read && !n.read_at;
        return <Row key={n.id} icon={ICON[String(n.notification_type || '').toUpperCase()] || 'notifications-outline'} iconTone={isUnread ? 'accent' : 'closed'}
          title={n.title || 'Notification'} subtitle={[n.message, relativeTime(n.created_at)].filter(Boolean).join('\n')} numberOfLines={3}
          trailing={isUnread ? <View accessibilityLabel="non lue" style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent }} /> : undefined}
          chevron={false} onPress={isUnread ? () => markRead.mutate(n.id) : undefined} accessibilityHint={isUnread ? 'Marque la notification comme lue' : undefined} />;
      })}
    </Section>) : <EmptyState icon="notifications-off-outline" title="Aucune notification" body="Vous serez averti ici des analyses terminées, des paiements et des échéances." />}
  </Screen>;
}
