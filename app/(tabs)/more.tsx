import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Linking, StyleSheet, View } from 'react-native';
import { useAuth } from '@/src/auth/AuthProvider';
import { useUnreadNotifications } from '@/src/api/hooks';
import { confirmAction, notify } from '@/src/lib/confirm';
import { Row, Screen, Section, T, type IconName } from '@/src/components/ui';
import { font, space, useTheme } from '@/src/theme/tokens';

type Item = [label: string, key: string, icon: IconName, subtitle?: string];
const go = (key: string) => router.push(`/features/${key}` as any);

const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Entreprise', items: [
    ['Profil de l’entreprise', 'company', 'business-outline', 'ICE, RC, représentant, RIB'],
    ['Conformité documentaire', 'compliance', 'shield-checkmark-outline', 'Attestations et dates d’expiration'],
    ['Garanties et cautions', 'guarantees', 'lock-closed-outline'],
    ['Équipe', 'team', 'people-outline'],
  ] },
  { title: 'Préparer', items: [
    ['Mes documents', 'documents', 'documents-outline'],
    ['Modèles de documents', 'templates', 'copy-outline'],
    ['Documents générés', 'generatedDocuments', 'create-outline'],
    ['Assistant documentaire', 'assistant', 'chatbubbles-outline'],
    ['Conversion de fichiers', 'converter', 'swap-horizontal-outline'],
    ['Importer un avis PDF', 'marketImport', 'document-attach-outline'],
  ] },
  { title: 'Suivre', items: [
    ['Calendrier', 'calendar', 'calendar-outline'],
    ['Plan d’action', 'tasks', 'checkbox-outline'],
    ['Analyses IA', 'analyses', 'sparkles-outline'],
    ['Rapports', 'reports', 'bar-chart-outline'],
    ['Exports', 'exports', 'share-outline'],
  ] },
  { title: 'Finances', items: [
    ['Tableau financier', 'finance', 'wallet-outline'],
    ['Devis et factures', 'invoices', 'receipt-outline'],
    ['Abonnement et quotas', 'subscriptions', 'ribbon-outline'],
    ['Paiements', 'payments', 'card-outline'],
    ['Fournisseurs', 'marketplace', 'storefront-outline'],
  ] },
];

const ADMIN: Item[] = [
  ['Utilisateurs', 'users', 'person-outline'], ['Entreprises', 'companies', 'business-outline'], ['Offres', 'plans', 'pricetags-outline'],
  ['Demandes de paiement', 'paymentRequests', 'cash-outline'], ['Moyens de paiement', 'paymentMethods', 'card-outline'],
  ['Permissions', 'permissions', 'key-outline'], ['Résultats IA', 'aiResults', 'analytics-outline'],
];

const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL;
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

export default function AccountScreen() {
  const { c } = useTheme();
  const { user, signOut } = useAuth();
  const unread = useUnreadNotifications();
  const admin = ['ADMIN', 'STAFF', 'MANAGER', 'MODERATOR'].includes(String(user?.role || '').toUpperCase()) || user?.is_staff || user?.is_superuser;
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Votre compte';
  const initials = (name.match(/\b\p{L}/gu) || ['?']).slice(0, 2).join('').toUpperCase();

  const confirmSignOut = async () => {
    if (await confirmAction('Se déconnecter ?', 'Vous devrez saisir à nouveau votre mot de passe.', 'Se déconnecter', true)) await signOut().catch(() => undefined);
  };
  const contactSupport = () => {
    if (SUPPORT_EMAIL) void Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
    else notify('Support', 'Contactez votre interlocuteur TrueAi.');
  };

  return <Screen title="Compte">
    <View style={styles.profile}>
      <View style={[styles.avatar, { backgroundColor: c.accentSoft }]}><T v="title" color={c.accent} style={{ fontFamily: font.bold }}>{initials}</T></View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="headline" numberOfLines={1}>{name}</T>
        <T v="footnote" color={c.inkSoft} numberOfLines={1}>{user?.email}</T>
      </View>
    </View>

    <Section>
      <Row icon="notifications-outline" title="Notifications" badge={unread.data || 0} onPress={() => router.push('/notifications' as any)} />
      <Row icon="heart-outline" title="Marchés favoris" onPress={() => router.push('/(tabs)/markets' as any)} />
    </Section>

    {GROUPS.map((g) => <Section key={g.title} title={g.title}>
      {g.items.map(([label, key, icon, sub]) => <Row key={key} icon={icon} title={label} subtitle={sub} onPress={() => go(key)} />)}
    </Section>)}

    {admin ? <Section title="Administration" footnote="Les droits sont vérifiés par le serveur à chaque action.">
      {ADMIN.map(([label, key, icon]) => <Row key={key} icon={icon} iconTone="closed" title={label} onPress={() => go(key)} />)}
    </Section> : null}

    <Section title="Compte">
      <Row icon="person-circle-outline" title="Informations personnelles" subtitle="Nom, téléphone, mot de passe" onPress={() => go('profile')} />
      {PRIVACY_URL ? <Row icon="document-lock-outline" title="Politique de confidentialité" onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)} /> : null}
      <Row icon="help-buoy-outline" title="Contacter le support" onPress={contactSupport} />
      <Row icon="log-out-outline" title="Se déconnecter" chevron={false} onPress={() => void confirmSignOut()} />
      <Row icon="trash-outline" iconTone="urgent" title="Supprimer mon compte" destructive onPress={() => router.push('/delete-account' as any)} />
    </Section>

    <T v="caption" color={c.inkFaint} style={{ textAlign: 'center' }}>TrueAi Marchés {Constants.expoConfig?.version ?? ''}</T>
  </Screen>;
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
