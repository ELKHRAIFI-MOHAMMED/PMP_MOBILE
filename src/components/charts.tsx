/**
 * Small, dependency-free chart kit (plain Views) following the dataviz method:
 * thin marks, 4px rounded data-ends square at the baseline, 2px surface gaps, recessive hairline axes,
 * selective labels, tap-to-read values (mobile "hover"), a table view, text in text tokens only.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { T, type IconName } from '@/src/components/ui';
import { font, radius, space, useTheme } from '@/src/theme/tokens';

/* ───────── number formatting ───────── */

/** 1 284 · 12,9 k · 4,2 M — compact past 10 000, full below. */
export function compact(n: number | null | undefined, unit = '') {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const fmt = (v: number, d: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: d });
  const s = abs >= 1e9 ? `${fmt(n / 1e9, 1)} Md` : abs >= 1e6 ? `${fmt(n / 1e6, 1)} M` : abs >= 1e4 ? `${fmt(n / 1e3, 1)} k` : fmt(n, abs < 10 && n % 1 ? 1 : 0);
  return unit ? `${s} ${unit}` : s;
}
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/* ───────── Stat tiles ───────── */

export type Stat = {
  label: string;
  value: number | null | undefined;
  unit?: string;
  /** Optional context line, e.g. "dont 2 terminées". */
  note?: string;
  /** Status — always rendered as icon + words, never colour alone. */
  status?: { tone: 'good' | 'warning' | 'critical'; label: string };
  /** Optional progress meter under the value: `value` done out of `of` (completion, not severity). */
  meter?: { value: number; of: number };
};

/** KPI grid: tiles share one surface separated by hairlines (not a stack of cards). */
export function StatGrid({ stats, columns = 2 }: { stats: Stat[]; columns?: 2 | 3 }) {
  const { c } = useTheme();
  return <View style={[styles.grid, { backgroundColor: c.surface, borderColor: c.line }]}>
    {stats.map((s, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      return <View key={s.label} style={[styles.tile, { width: `${100 / columns}%` },
        col > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.line },
        row > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
        <StatTile stat={s} />
      </View>;
    })}
  </View>;
}

export function StatTile({ stat }: { stat: Stat }) {
  const { c } = useTheme();
  const statusColor = stat.status ? { good: c.chartGood, warning: c.soon, critical: c.chartBad }[stat.status.tone] : undefined;
  const statusIcon: IconName | undefined = stat.status ? ({ good: 'checkmark-circle', warning: 'warning', critical: 'alert-circle' } as const)[stat.status.tone] : undefined;
  return <View style={{ gap: 4 }} accessible accessibilityLabel={`${stat.label} : ${compact(stat.value, stat.unit)}${stat.note ? `, ${stat.note}` : ''}${stat.status ? `, ${stat.status.label}` : ''}`}>
    <T v="footnote" color={c.inkSoft} numberOfLines={2}>{stat.label}</T>
    <T v="title" style={{ fontFamily: font.semibold, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>{compact(stat.value, stat.unit)}</T>
    {stat.meter && stat.meter.of > 0 ? <MeterBar value={stat.meter.value} max={stat.meter.of} color={c.chartGood} /> : null}
    {stat.note ? <T v="caption" color={c.inkSoft}>{stat.note}</T> : null}
    {stat.status ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={statusIcon!} size={14} color={statusColor} />
      <T v="caption" color={c.inkSoft}>{stat.status.label}</T>
    </View> : null}
  </View>;
}

/* ───────── Meters ───────── */

function severity(ratio: number, c: ReturnType<typeof useTheme>['c']) {
  return ratio >= 0.9 ? c.chartBad : ratio >= 0.7 ? c.soon : c.chartAccent;
}

/** Fill carries severity; the track is a lighter step of the same ramp. */
export function MeterBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const { c } = useTheme();
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return <View style={[styles.meterTrack, { backgroundColor: c.chartTrack }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {ratio > 0 ? <View style={{ width: `${Math.max(ratio * 100, 3)}%`, height: '100%', borderRadius: 4, backgroundColor: color || severity(ratio, c) }} /> : null}
  </View>;
}

/** Meter list: name, bar and figure per row (quotas, compliance…). */
export function MeterList({ rows }: { rows: { label: string; value: number; max: number | null; unit?: string }[] }) {
  const { c } = useTheme();
  return <View style={{ gap: space.lg }}>
    {rows.map((r) => {
      const unlimited = r.max == null || r.max <= 0;
      const ratio = unlimited ? 0 : r.value / (r.max as number);
      return <View key={r.label} style={{ gap: 6 }} accessible accessibilityLabel={`${r.label} : ${r.value} ${unlimited ? '(illimité)' : `sur ${r.max}`}`}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
          <T v="subhead" style={{ flex: 1 }}>{r.label}</T>
          <T v="subhead" color={c.inkSoft} style={{ fontVariant: ['tabular-nums'] }}>{unlimited ? `${r.value} · illimité` : `${r.value} / ${r.max}`}</T>
        </View>
        {!unlimited ? <MeterBar value={r.value} max={r.max as number} /> : null}
        {!unlimited && ratio >= 0.9 ? <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <Ionicons name="alert-circle" size={14} color={c.chartBad} /><T v="caption" color={c.inkSoft}>{ratio >= 1 ? 'Quota atteint' : 'Quota presque atteint'}</T>
        </View> : null}
      </View>;
    })}
  </View>;
}

/* ───────── Column chart (single series) ───────── */

export type Point = { label: string; value: number };

/**
 * One series over time. No legend (the title names it). Tap a column to read it; values also in a table view.
 * Max and 0 ticks only; first / last x labels only.
 */
export function ColumnChart({ data, unit = '', height = 120, emptyLabel = 'Aucune activité sur la période.' }: { data: Point[]; unit?: string; height?: number; emptyLabel?: string }) {
  const { c } = useTheme();
  const max = Math.max(0, ...data.map((d) => d.value));
  const lastNonZero = [...data].reverse().findIndex((d) => d.value > 0);
  const [selected, setSelected] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const active = selected ?? (lastNonZero >= 0 ? data.length - 1 - lastNonZero : null);
  if (!data.length || max === 0) return <View style={[styles.emptyChart, { borderColor: c.line }]}><T v="subhead" color={c.inkSoft}>{emptyLabel}</T></View>;
  const niceMax = niceCeil(max);
  return <View style={{ gap: space.sm }}>
    <View style={{ minHeight: 22 }}>
      {active != null ? <T v="subhead" accessibilityLiveRegion="polite"><T v="subhead" style={{ fontFamily: font.semibold }}>{compact(data[active].value, unit)}</T>{`  ${data[active].label}`}</T> : null}
    </View>
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <View style={{ height, justifyContent: 'space-between' }}>
        <T v="caption" color={c.inkFaint} style={{ fontVariant: ['tabular-nums'] }}>{compact(niceMax)}</T>
        <T v="caption" color={c.inkFaint}>0</T>
      </View>
      <View style={{ flex: 1 }}>
        <View style={[styles.gridline, { top: 7, backgroundColor: c.line }]} />
        <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.inkFaint }}>
          {data.map((d, i) => {
            const h = d.value > 0 ? Math.max(3, ((height - 8) * d.value) / niceMax) : 0;
            const on = i === active;
            return <Pressable key={`${d.label}-${i}`} onPress={() => setSelected(i)} style={styles.colSlot}
              accessibilityRole="button" accessibilityLabel={`${d.label} : ${compact(d.value, unit)}`} accessibilityState={{ selected: on }} hitSlop={{ top: 12, bottom: 12 }}>
              <View style={{ width: '100%', maxWidth: 24, height: h, backgroundColor: c.chartAccent, opacity: active == null || on ? 1 : 0.45, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
            </Pressable>;
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <T v="caption" color={c.inkFaint}>{data[0].label}</T>
          <T v="caption" color={c.inkFaint}>{data[data.length - 1].label}</T>
        </View>
      </View>
    </View>
    <Pressable onPress={() => setTable((t) => !t)} accessibilityRole="button" hitSlop={10} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
      <T v="footnote" color={c.accent} style={{ fontFamily: font.semibold }}>{table ? 'Masquer les valeurs' : 'Voir les valeurs'}</T>
    </Pressable>
    {table ? <View style={{ gap: 2 }}>{data.map((d, i) => <View key={i} style={styles.tableRow}>
      <T v="footnote" color={c.inkSoft}>{d.label}</T><T v="footnote" style={{ fontVariant: ['tabular-nums'] }}>{compact(d.value, unit)}</T>
    </View>)}</View> : null}
  </View>;
}

function niceCeil(v: number) {
  if (v <= 5) return Math.max(1, Math.ceil(v));
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/* ───────── Ranked horizontal bars (part-to-whole, compare parts) ───────── */

export function RankedBars({ rows, unit = '', max = 6 }: { rows: { name: string; value: number }[]; unit?: string; max?: number }) {
  const { c } = useTheme();
  const sorted = [...rows].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, max);
  const tail = sorted.slice(max);
  if (tail.length) head.push({ name: `Autres (${tail.length})`, value: tail.reduce((s, r) => s + r.value, 0) });
  const total = sorted.reduce((s, r) => s + r.value, 0);
  const top = head[0]?.value || 1;
  if (!head.length) return null;
  return <View style={{ gap: space.md }}>
    {head.map((r) => <View key={r.name} style={{ gap: 6 }} accessible accessibilityLabel={`${r.name} : ${compact(r.value, unit)}, ${pct(r.value, total)} %`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
        <T v="subhead" numberOfLines={2} style={{ flex: 1 }}>{r.name}</T>
        <T v="subhead" color={c.inkSoft} style={{ fontVariant: ['tabular-nums'] }}>{compact(r.value, unit)} · {pct(r.value, total)} %</T>
      </View>
      <View style={{ height: 10 }}>
        <View style={{ width: `${(r.value / top) * 100}%`, height: '100%', backgroundColor: c.chartAccent, borderTopRightRadius: 4, borderBottomRightRadius: 4 }} />
      </View>
    </View>)}
  </View>;
}

/* ───────── Thin segmented bar + legend with figures ───────── */

export function SegmentedBar({ parts }: { parts: { label: string; value: number; tone: 'good' | 'bad' | 'neutral'; icon: IconName }[] }) {
  const { c } = useTheme();
  const total = parts.reduce((s, p) => s + p.value, 0);
  const color = (t: 'good' | 'bad' | 'neutral') => ({ good: c.chartGood, bad: c.chartBad, neutral: c.chartNeutral }[t]);
  return <View style={{ gap: space.md }}>
    {total > 0 ? <View style={[styles.segment, { backgroundColor: c.surface }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {parts.filter((p) => p.value > 0).map((p) => <View key={p.label} style={{ flex: p.value, backgroundColor: color(p.tone), borderRadius: 4 }} />)}
    </View> : <View style={[styles.segment, { backgroundColor: c.chartTrack }]} />}
    <View style={{ gap: space.sm }}>
      {parts.map((p) => <View key={p.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }} accessible accessibilityLabel={`${p.label} : ${p.value}${total ? `, ${pct(p.value, total)} %` : ''}`}>
        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color(p.tone) }} />
        <Ionicons name={p.icon} size={15} color={c.inkSoft} />
        <T v="subhead" style={{ flex: 1 }}>{p.label}</T>
        <T v="subhead" style={{ fontFamily: font.semibold, fontVariant: ['tabular-nums'] }}>{p.value}</T>
        <T v="footnote" color={c.inkSoft} style={{ width: 44, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{total ? `${pct(p.value, total)} %` : '—'}</T>
      </View>)}
    </View>
  </View>;
}

/** A surface block titled by what it plots. */
export function ChartCard({ title, subtitle, children }: React.PropsWithChildren<{ title: string; subtitle?: string }>) {
  const { c } = useTheme();
  return <View style={[styles.chartCard, { backgroundColor: c.surface, borderColor: c.line }]}>
    <View style={{ gap: 2 }}>
      <T v="headline" accessibilityRole="header">{title}</T>
      {subtitle ? <T v="footnote" color={c.inkSoft}>{subtitle}</T> : null}
    </View>
    {children}
  </View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  tile: { padding: space.lg },
  meterTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 2 },
  emptyChart: { height: 96, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  gridline: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  colSlot: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  segment: { height: 8, flexDirection: 'row', gap: 2, borderRadius: 4, overflow: 'hidden' },
  chartCard: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.lg },
});
