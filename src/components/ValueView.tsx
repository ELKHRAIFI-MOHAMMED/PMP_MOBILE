import { View } from 'react-native';
import { T } from '@/src/components/ui';
import { space, useTheme } from '@/src/theme/tokens';
import { formatDate, humanizeKey } from '@/src/lib/format';

const HIDDEN = new Set(['id', 'pk', 'user', 'raw_data', 'provenance', 'fingerprint', 'checksum', 'sha256', 'gemini_file_name', 'gemini_name', 'request_id', 'interaction_id', 'dossier_fingerprint', 'documents_manifest', 'extraction_metadata']);
const isDateKey = (k: string) => /(_at|date|_le)$/.test(k) || k.startsWith('date_');

/**
 * Readable rendering of arbitrary backend JSON (AI analysis results, comparisons, recommendations):
 * headings for objects, bullet lists for arrays, label/value for scalars. Never shows raw JSON.
 */
export function ValueView({ value, depth = 0, label }: { value: unknown; depth?: number; label?: string }) {
  const { c } = useTheme();
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null;

  if (typeof value !== 'object') {
    const text = typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : label && isDateKey(label) ? formatDate(String(value), true) || String(value) : String(value);
    if (!label) return <T v="callout" selectable>{text}</T>;
    return <View style={{ gap: 2 }}>
      <T v="footnote" color={c.inkSoft}>{humanizeKey(label)}</T>
      <T v="callout" selectable>{text}</T>
    </View>;
  }

  if (Array.isArray(value)) {
    const scalars = value.every((v) => typeof v !== 'object' || v == null);
    return <View style={{ gap: space.sm }}>
      {label ? <T v={depth === 0 ? 'headline' : 'bodyStrong'}>{humanizeKey(label)}</T> : null}
      {scalars
        ? value.map((v, i) => <View key={i} style={{ flexDirection: 'row', gap: space.sm }}><T v="callout" color={c.accent}>•</T><T v="callout" style={{ flex: 1 }} selectable>{String(v)}</T></View>)
        : value.map((v, i) => <View key={i} style={{ paddingLeft: space.md, borderLeftWidth: 2, borderLeftColor: c.line, gap: space.sm }}><ValueView value={v} depth={depth + 1} /></View>)}
    </View>;
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(([k, v]) => !HIDDEN.has(k) && v != null && v !== '' && !(Array.isArray(v) && !v.length) && !(typeof v === 'object' && !Array.isArray(v) && !Object.keys(v as object).length));
  if (!entries.length) return null;
  return <View style={{ gap: depth === 0 ? space.lg : space.md }}>
    {label ? <T v={depth === 0 ? 'headline' : 'bodyStrong'}>{humanizeKey(label)}</T> : null}
    {entries.map(([k, v]) => <ValueView key={k} label={k} value={v} depth={depth + 1} />)}
  </View>;
}
