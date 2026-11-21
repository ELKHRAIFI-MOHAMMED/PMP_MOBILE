import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DeadlineStamp, T } from '@/src/components/ui';
import { space, useTheme } from '@/src/theme/tokens';
import { formatMoney } from '@/src/lib/format';
import type { TenderMarket } from '@/src/types/api';

export const marketTitle = (m: Partial<TenderMarket>) => m.objet || m.title || m.reference || `Marché ${m.id ?? ''}`.trim();
export const marketBuyer = (m: Partial<TenderMarket>) => m.acheteur_public || m.administration || '';
export const marketEstimate = (m: Partial<TenderMarket>) => formatMoney(m.raw_data?.estimation ?? m.estimation);

/** "MEMEE / ONEEBELEC - OFFICE NATIONAL DE L'ELECTRICITE ... - BRANCHE ELECTRICITE": keep the most descriptive segment. */
export function shortBuyer(name: string) {
  if (!name) return '';
  const parts = name.split(/\s[-/]\s/).map((p) => p.trim()).filter(Boolean);
  const pick = parts.length > 1 ? parts.reduce((a, b) => (b.length > a.length ? b : a)) : name;
  return pick.length > 70 ? `${pick.slice(0, 68)}…` : pick;
}

function sentence(s: string) {
  // Portal data is often ALL CAPS; render it in sentence case for legibility.
  if (s && s === s.toUpperCase() && /[A-Z]{4}/.test(s)) return s.charAt(0) + s.slice(1).toLowerCase();
  return s;
}

/** List row for a tender: deadline stamp, object, buyer, reference and category. */
export function MarketRow({ market, onPress }: { market: Partial<TenderMarket>; onPress?: () => void }) {
  const { c } = useTheme();
  const buyer = shortBuyer(sentence(marketBuyer(market)));
  const meta = [market.reference, market.categorie].filter(Boolean);
  return <Pressable
    onPress={onPress || (() => router.push(`/market/${market.id}` as any))}
    accessibilityRole="button"
    accessibilityLabel={`${sentence(marketTitle(market))}. ${buyer}. Référence ${market.reference || 'inconnue'}`}
    android_ripple={{ color: c.line }}
    style={({ pressed }) => [styles.row, pressed ? { backgroundColor: c.surfaceAlt } : null]}
  >
    <DeadlineStamp date={market.date_limite} />
    <View style={{ flex: 1, gap: 4 }}>
      <T v="bodyStrong" numberOfLines={3}>{sentence(marketTitle(market))}</T>
      {buyer ? <T v="footnote" color={c.inkSoft} numberOfLines={1}>{buyer}</T> : null}
      {meta.length ? <View style={styles.meta}>
        {meta.map((m, i) => <View key={i} style={[styles.tag, { backgroundColor: c.surfaceAlt }]}><T v="caption" color={c.inkSoft}>{m}</T></View>)}
      </View> : null}
    </View>
    <Ionicons name="chevron-forward" size={16} color={c.inkFaint} style={{ alignSelf: 'center' }} />
  </Pressable>;
}

export { sentence as sentenceCase };

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, alignItems: 'flex-start' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
});
