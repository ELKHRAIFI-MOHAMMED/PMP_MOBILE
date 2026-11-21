import type { Colors } from '@/src/theme/tokens';

const DAY = 86_400_000;

export function parseDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value?: string | null, withTime = false) {
  const d = parseDate(value);
  if (!d) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) });
}

export function relativeTime(value?: string | null) {
  const d = parseDate(value);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.round(h / 24);
  if (days < 7) return `il y a ${days} j`;
  return formatDate(value);
}

export type Urgency = 'closed' | 'urgent' | 'soon' | 'open' | 'unknown';

/** Days remaining until a deadline, counted in calendar days (local time). */
export function deadlineInfo(value?: string | null): { days: number | null; urgency: Urgency; label: string; long: string } {
  const d = parseDate(value);
  if (!d) return { days: null, urgency: 'unknown', label: '—', long: 'Date limite non renseignée' };
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - start.getTime()) / DAY);
  if (d.getTime() < Date.now()) return { days, urgency: 'closed', label: 'Clos', long: `Clôturé le ${formatDate(value, true)}` };
  if (days === 0) return { days, urgency: 'urgent', label: 'Auj.', long: `Dépôt aujourd’hui, ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` };
  const urgency: Urgency = days <= 3 ? 'urgent' : days <= 10 ? 'soon' : 'open';
  return { days, urgency, label: `J-${days}`, long: `Dépôt dans ${days} jour${days > 1 ? 's' : ''}, le ${formatDate(value, true)}` };
}

export function urgencyColors(u: Urgency, c: Colors) {
  switch (u) {
    case 'urgent': return { fg: c.urgent, bg: c.urgentSoft };
    case 'soon': return { fg: c.soon, bg: c.soonSoft };
    case 'open': return { fg: c.accent, bg: c.accentSoft };
    case 'closed': return { fg: c.closed, bg: c.closedSoft };
    default: return { fg: c.inkFaint, bg: c.surfaceAlt };
  }
}

export function formatMoney(value: unknown, currency = 'MAD') {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n)) return '';
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${currency}`;
}

export function formatBytes(n?: number) {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

/** Normalised status vocabulary across analyses, dossiers, documents and estimates. */
export function statusInfo(raw?: string | null): { label: string; tone: 'ready' | 'soon' | 'urgent' | 'accent' | 'closed' } {
  const s = String(raw || '').toUpperCase();
  if (!s) return { label: 'À examiner', tone: 'closed' };
  if (['COMPLETED', 'DONE', 'SUCCESS', 'READY', 'APPROVED', 'VALIDATED', 'PAID', 'ACTIVE', 'VERIFIED'].includes(s)) return { label: { COMPLETED: 'Terminée', DONE: 'Terminé', SUCCESS: 'Réussi', READY: 'Prêt', APPROVED: 'Approuvé', VALIDATED: 'Validé', PAID: 'Payée', ACTIVE: 'Actif', VERIFIED: 'Vérifié' }[s] || s, tone: 'ready' };
  if (['QUEUED', 'PENDING', 'RUNNING', 'PROCESSING', 'EXTRACTING', 'IN_PROGRESS', 'STARTED'].includes(s)) return { label: 'En cours', tone: 'accent' };
  if (['PARTIAL', 'DRAFT', 'SENT', 'WAITING', 'TO_REVIEW', 'REVIEW', 'MISSING', 'EXPIRING'].includes(s)) return { label: { PARTIAL: 'Partielle', DRAFT: 'Brouillon', SENT: 'Envoyée', WAITING: 'En attente', TO_REVIEW: 'À vérifier', REVIEW: 'À vérifier', MISSING: 'Manquant', EXPIRING: 'Expire bientôt' }[s] || s, tone: 'soon' };
  if (['FAILED', 'ERROR', 'REJECTED', 'EXPIRED', 'OVERDUE', 'CANCELLED', 'CANCELED'].includes(s)) return { label: { FAILED: 'Échec', ERROR: 'Erreur', REJECTED: 'Refusé', EXPIRED: 'Expiré', OVERDUE: 'En retard', CANCELLED: 'Annulée', CANCELED: 'Annulée' }[s] || s, tone: 'urgent' };
  return { label: raw ? String(raw).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (m) => m.toUpperCase()) : 'À examiner', tone: 'closed' };
}

export function humanizeKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\b(mo|ht|ttc|tva|ice|rc|if|dce|ao|bpu|dqe)\b/gi, (m) => m.toUpperCase()).replace(/^\w/, (m) => m.toUpperCase());
}
