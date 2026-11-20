import { Link } from 'expo-router';
import { useAuth } from '@/src/auth/AuthProvider';
import { Card, Heading, Notice, Row, Screen } from '@/src/components/ui';

const clientFeatures = [
  ['Analyses IA', 'analyses'], ['Documents privés', 'documents'], ['Modèles et documents générés', 'templates'], ['Exports', 'exports'],
  ['Notifications', 'notifications'], ['Rapports', 'reports'], ['Factures', 'invoices'], ['Calendrier', 'calendar'],
  ['Plan d’action / tâches', 'tasks'], ['Garanties', 'guarantees'], ['Abonnement et quotas', 'subscriptions'],
  ['Fournisseurs / marketplace', 'marketplace'], ['Profil entreprise', 'company'], ['Finances', 'finance'],
  ['Conformité documentaire', 'compliance'], ['Historique des prix', 'priceHistory'], ['Comparaison de prix', 'comparison'],
  ['Prix recommandé', 'recommendedPrice'], ['Assistant documentaire', 'assistant'], ['Importer un avis PDF', 'marketImport'], ['Checklist des candidatures', 'checklist'],
  ['Favoris', 'favorites'], ['Paiements', 'payments'], ['Conversion de fichiers', 'converter'], ['Alertes', 'alerts'],
  ['Équipe', 'team'], ['Paramètres du compte', 'profile'],
] as const;

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const admin = ['ADMIN', 'STAFF', 'MANAGER', 'MODERATOR'].includes(String(user?.role || '').toUpperCase()) || user?.is_staff || user?.is_superuser;
  const adminFeatures = [['Gestion utilisateurs', 'users'], ['Gestion entreprises', 'companies'], ['Plans', 'plans'], ['Demandes de paiement', 'paymentRequests'], ['Moyens de paiement', 'paymentMethods'], ['Permissions', 'permissions'], ['Résultats IA', 'aiResults']] as const;
  return <Screen><Heading title="Plus" subtitle={user?.email || 'Votre compte'} />
    <Card>{clientFeatures.map(([label, key]) => <Link key={key} href={`/features/${key}` as any} asChild><Row title={label} right="Ouvrir" /></Link>)}</Card>
    {admin ? <Card><Heading title="Administration" subtitle="L’accès reste contrôlé par les permissions Django." />{adminFeatures.map(([label, key]) => <Link key={key} href={`/features/${key}` as any} asChild><Row title={label} right="Ouvrir" /></Link>)}</Card> : null}
    {user?.is_superuser ? <Notice>Les écrans de gouvernance système du web (santé, stockage, intégrations et coûts IA) n’ont pas d’API mobile correspondante vérifiée; ils ne sont pas simulés ici.</Notice> : null}
    <Row title="Déconnexion" subtitle="Révoquer le jeton DRF courant" right="Quitter" onPress={() => { void signOut().catch(() => undefined); }} />
  </Screen>;
}
