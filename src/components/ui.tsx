import React, { Children, isValidElement, useEffect, useState } from 'react';
import {
  ActivityIndicator, AccessibilityInfo, Animated, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { font, icon as iconSize, radius, space, touch, type, useTheme } from '@/src/theme/tokens';
import { deadlineInfo, statusInfo, urgencyColors } from '@/src/lib/format';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tap() { if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined); }

/* ───────────────────────── Text ───────────────────────── */

export function T({ v = 'body', color, style, ...rest }: React.ComponentProps<typeof Text> & { v?: keyof typeof type; color?: string }) {
  const { c } = useTheme();
  return <Text {...rest} style={[type[v], { color: color || c.ink }, style]} />;
}

/* ───────────────────────── Screen ───────────────────────── */

type ScreenProps = React.PropsWithChildren<{
  title?: string;
  subtitle?: string;
  back?: boolean;
  headerRight?: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: React.ReactNode;
  keyboard?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}>;

/** Page shell: safe areas, large title, pull-to-refresh, optional sticky footer action. */
export function Screen({ title, subtitle, back, headerRight, scroll = true, refreshing = false, onRefresh, footer, keyboard, contentStyle, children }: ScreenProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const header = (title || back || headerRight) ? <View style={{ gap: space.xs, marginBottom: space.sm }}>
    {(back || headerRight) ? <View style={styles.navRow}>
      {back ? <IconButton name="chevron-back" label="Retour" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} /> : <View />}
      <View style={{ flexDirection: 'row', gap: space.xs }}>{headerRight}</View>
    </View> : null}
    {title ? <T v="largeTitle" accessibilityRole="header" numberOfLines={3}>{title}</T> : null}
    {subtitle ? <T v="subhead" color={c.inkSoft}>{subtitle}</T> : null}
  </View> : null;
  const body = <>
    {header}
    {children}
  </>;
  const padding = { paddingTop: insets.top + (back || headerRight ? space.xs : space.lg), paddingBottom: (footer ? 96 : space.xxl) + insets.bottom };
  const content = scroll
    ? <ScrollView
        contentContainerStyle={[styles.content, padding, contentStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} progressViewOffset={insets.top} /> : undefined}
      >{body}</ScrollView>
    : <View style={[styles.content, padding, { flex: 1 }, contentStyle]}>{body}</View>;
  const wrapped = keyboard ? <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{content}</KeyboardAvoidingView> : content;
  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    {wrapped}
    {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + space.md, backgroundColor: c.bg, borderTopColor: c.line }]}>{footer}</View> : null}
  </View>;
}

/** Legacy heading used by a few generic screens. */
export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  const { c } = useTheme();
  return <View style={{ gap: space.xs, marginBottom: space.xs }}><T v="title" accessibilityRole="header">{title}</T>{subtitle ? <T v="subhead" color={c.inkSoft}>{subtitle}</T> : null}</View>;
}

/* ───────────────────────── Grouped lists ───────────────────────── */

/** Inset grouped section (iOS Settings / Material list). Children rows get hairline separators. */
export function Section({ title, footnote, action, children, style }: React.PropsWithChildren<{ title?: string; footnote?: string; action?: { label: string; onPress: () => void }; style?: StyleProp<ViewStyle> }>) {
  const { c } = useTheme();
  // Skip empty Facts so they don't leave orphan separators.
  const items = Children.toArray(children).filter((ch) => Boolean(ch) && !(isValidElement<{ value?: unknown }>(ch) && ch.type === Fact && (ch.props.value == null || ch.props.value === '')));
  return <View style={[{ gap: space.sm }, style]}>
    {title || action ? <View style={styles.sectionHead}>
      {title ? <T v="headline" accessibilityRole="header">{title}</T> : <View />}
      {action ? <Pressable onPress={action.onPress} hitSlop={12} accessibilityRole="button"><T v="subhead" color={c.accent} style={{ fontFamily: font.semibold }}>{action.label}</T></Pressable> : null}
    </View> : null}
    {items.length ? <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }]}>
      {items.map((child, i) => <View key={isValidElement(child) && child.key != null ? child.key : i}>
        {i > 0 ? <View style={[styles.sep, { backgroundColor: c.line }]} /> : null}
        {child}
      </View>)}
    </View> : null}
    {footnote ? <T v="footnote" color={c.inkFaint} style={{ paddingHorizontal: space.xs }}>{footnote}</T> : null}
  </View>;
}

/** Plain surface block for free content inside a Section-like container. */
export function Card({ children, style }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { c } = useTheme();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>;
}

type RowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  /** Legacy alias for value. */
  right?: string;
  icon?: IconName;
  iconTone?: 'accent' | 'ready' | 'soon' | 'urgent' | 'closed';
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  badge?: number;
  numberOfLines?: number;
  accessibilityHint?: string;
};

export function Row({ title, subtitle, value, right, icon, iconTone = 'accent', leading, trailing, onPress, chevron, destructive, badge, numberOfLines = 2, accessibilityHint }: RowProps) {
  const { c } = useTheme();
  const tones = { accent: [c.accent, c.accentSoft], ready: [c.ready, c.readySoft], soon: [c.soon, c.soonSoft], urgent: [c.urgent, c.urgentSoft], closed: [c.closed, c.closedSoft] } as const;
  const [fg, bg] = tones[iconTone];
  const shownValue = value ?? right;
  const showChevron = chevron ?? Boolean(onPress);
  const content = <View style={styles.row}>
    {leading ?? (icon ? <View style={[styles.rowIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={iconSize.md} color={fg} /></View> : null)}
    <View style={{ flex: 1, gap: 2 }}>
      <T v="bodyStrong" color={destructive ? c.urgent : c.ink} numberOfLines={numberOfLines}>{title || 'Sans titre'}</T>
      {subtitle ? <T v="footnote" color={c.inkSoft} numberOfLines={3}>{subtitle}</T> : null}
    </View>
    {badge ? <View style={[styles.badge, { backgroundColor: c.urgent }]}><Text style={[styles.badgeText, { color: '#fff' }]}>{badge > 99 ? '99+' : badge}</Text></View> : null}
    {shownValue ? <T v="subhead" color={c.inkSoft} style={{ maxWidth: '42%', textAlign: 'right' }} numberOfLines={2}>{shownValue}</T> : null}
    {trailing}
    {showChevron ? <Ionicons name="chevron-forward" size={iconSize.sm} color={c.inkFaint} /> : null}
  </View>;
  if (!onPress) return <View accessible accessibilityLabel={[title, subtitle, shownValue].filter(Boolean).join(', ')}>{content}</View>;
  return <Pressable
    onPress={() => { tap(); onPress(); }}
    accessibilityRole="button"
    accessibilityLabel={[title, subtitle, shownValue].filter(Boolean).join(', ')}
    accessibilityHint={accessibilityHint}
    android_ripple={{ color: c.line }}
    style={({ pressed }) => [pressed && Platform.OS === 'ios' ? { backgroundColor: c.surfaceAlt } : null]}
  >{content}</Pressable>;
}

/** Label / value pair for fact sheets. */
export function Fact({ label, value, icon }: { label: string; value?: React.ReactNode; icon?: IconName }) {
  const { c } = useTheme();
  if (value == null || value === '') return null;
  return <View style={styles.fact} accessible accessibilityLabel={`${label} : ${typeof value === 'string' ? value : ''}`}>
    {icon ? <Ionicons name={icon} size={iconSize.md} color={c.inkFaint} style={{ marginTop: 1 }} /> : null}
    <View style={{ flex: 1, gap: 2 }}>
      <T v="footnote" color={c.inkSoft}>{label}</T>
      {typeof value === 'string' ? <T v="callout" selectable>{value}</T> : value}
    </View>
  </View>;
}

/* ───────────────────────── Controls ───────────────────────── */

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'plain' | 'destructive';
  /** Legacy alias for variant="secondary". */
  secondary?: boolean;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  accessibilityHint?: string;
};

export function Button({ title, onPress, variant, secondary, icon, loading, disabled, compact, accessibilityHint }: ButtonProps) {
  const { c } = useTheme();
  const kind = variant || (secondary ? 'secondary' : 'primary');
  const bg = kind === 'primary' ? c.accent : kind === 'destructive' ? c.urgentSoft : kind === 'secondary' ? c.accentSoft : 'transparent';
  const fg = kind === 'primary' ? c.onAccent : kind === 'destructive' ? c.urgent : c.accent;
  const inactive = disabled || loading;
  return <Pressable
    onPress={() => { tap(); onPress(); }}
    disabled={inactive}
    accessibilityRole="button"
    accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
    accessibilityLabel={title}
    accessibilityHint={accessibilityHint}
    android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
    style={({ pressed }) => [styles.button, compact && styles.buttonCompact, { backgroundColor: bg, opacity: inactive ? 0.5 : pressed ? 0.82 : 1 }]}
  >
    {loading ? <ActivityIndicator color={fg} /> : <>
      {icon ? <Ionicons name={icon} size={iconSize.md} color={fg} /> : null}
      <Text style={[type.bodyStrong, { color: fg }]} numberOfLines={1}>{title}</Text>
    </>}
  </Pressable>;
}

export function IconButton({ name, label, onPress, badge, color }: { name: IconName; label: string; onPress: () => void; badge?: number; color?: string }) {
  const { c } = useTheme();
  return <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={badge ? `${label}, ${badge} non lues` : label} hitSlop={6}
    style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? c.surfaceAlt : c.surface, borderColor: c.line }]}>
    <Ionicons name={name} size={iconSize.lg - 2} color={color || c.ink} />
    {badge ? <View style={[styles.dot, { backgroundColor: c.urgent, borderColor: c.surface }]} /> : null}
  </Pressable>;
}

type FieldProps = TextInputProps & { label: string; hint?: string; error?: string; icon?: IconName; ref?: React.Ref<React.ComponentRef<typeof TextInput>> };

export function Field({ label, hint, error, icon, style, onFocus, onBlur, ...props }: FieldProps) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? c.urgent : focused ? c.accent : c.line;
  return <View style={{ gap: 6 }}>
    <T v="footnote" color={c.inkSoft} style={{ fontFamily: font.semibold }} nativeID={`lbl-${label}`}>{label}</T>
    <View style={[styles.input, { backgroundColor: c.surface, borderColor, borderWidth: focused || error ? 1.5 : 1 }]}>
      {icon ? <Ionicons name={icon} size={iconSize.md} color={c.inkFaint} /> : null}
      <TextInput
        placeholderTextColor={c.inkFaint}
        selectionColor={c.accent}
        accessibilityLabel={label}
        accessibilityLabelledBy={`lbl-${label}`}
        style={[type.body, { flex: 1, color: c.ink, paddingVertical: 0 }, style as StyleProp<TextStyle>]}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        {...props}
      />
    </View>
    {error ? <T v="footnote" color={c.urgent} accessibilityRole="alert">{error}</T> : hint ? <T v="footnote" color={c.inkFaint}>{hint}</T> : null}
  </View>;
}

export function SearchField({ value, onChangeText, onSubmit, placeholder, autoFocus }: { value: string; onChangeText: (v: string) => void; onSubmit?: () => void; placeholder?: string; autoFocus?: boolean }) {
  const { c } = useTheme();
  return <View style={[styles.search, { backgroundColor: c.surfaceAlt }]}>
    <Ionicons name="search" size={iconSize.md} color={c.inkFaint} />
    <TextInput value={value} onChangeText={onChangeText} onSubmitEditing={onSubmit} returnKeyType="search" placeholder={placeholder} autoFocus={autoFocus}
      placeholderTextColor={c.inkFaint} selectionColor={c.accent} accessibilityLabel={placeholder || 'Rechercher'} autoCorrect={false}
      style={[type.body, { flex: 1, color: c.ink, paddingVertical: 0 }]} clearButtonMode="while-editing" />
    {value && Platform.OS !== 'ios' ? <Pressable onPress={() => onChangeText('')} accessibilityRole="button" accessibilityLabel="Effacer" hitSlop={10}><Ionicons name="close-circle" size={iconSize.md} color={c.inkFaint} /></Pressable> : null}
  </View>;
}

export function Chips<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const { c } = useTheme();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }} style={{ marginHorizontal: -2, flexGrow: 0 }}>
    {options.map((o) => {
      const on = o.key === value;
      return <Pressable key={o.key} onPress={() => { tap(); onChange(o.key); }} accessibilityRole="tab" accessibilityState={{ selected: on }}
        style={[styles.chip, { backgroundColor: on ? c.ink : c.surface, borderColor: on ? c.ink : c.line }]}>
        <Text style={[type.subhead, { fontFamily: font.semibold, color: on ? c.bg : c.ink }]}>{o.label}</Text>
      </Pressable>;
    })}
  </ScrollView>;
}

/* ───────────────────────── Feedback ───────────────────────── */

export function Banner({ tone = 'info', title, children, icon, action }: React.PropsWithChildren<{ tone?: 'info' | 'error' | 'success' | 'warning'; title?: string; icon?: IconName; action?: { label: string; onPress: () => void } }>) {
  const { c } = useTheme();
  const map = { info: [c.accent, c.accentSoft, 'information-circle'], error: [c.urgent, c.urgentSoft, 'alert-circle'], success: [c.ready, c.readySoft, 'checkmark-circle'], warning: [c.soon, c.soonSoft, 'warning'] } as const;
  const [fg, bg, ic] = map[tone];
  return <View style={[styles.banner, { backgroundColor: bg }]} accessibilityRole={tone === 'error' ? 'alert' : undefined}>
    <Ionicons name={icon || ic} size={iconSize.md} color={fg} style={{ marginTop: 1 }} />
    <View style={{ flex: 1, gap: 2 }}>
      {title ? <T v="bodyStrong">{title}</T> : null}
      {typeof children === 'string' || typeof children === 'number' ? <T v="subhead" color={c.ink}>{children}</T> : children}
      {action ? <Pressable onPress={action.onPress} accessibilityRole="button" hitSlop={8} style={{ marginTop: 4 }}><T v="subhead" color={fg} style={{ fontFamily: font.semibold }}>{action.label}</T></Pressable> : null}
    </View>
  </View>;
}

/** Legacy alias. */
export function Notice({ children, tone = 'info' }: React.PropsWithChildren<{ tone?: 'info' | 'error' | 'success' }>) {
  return <Banner tone={tone}>{children}</Banner>;
}

export function ErrorText({ children }: React.PropsWithChildren) {
  const { c } = useTheme();
  return <T v="subhead" color={c.urgent} accessibilityRole="alert">{children}</T>;
}

export function EmptyState({ icon = 'file-tray-outline', title, body, action }: { icon?: IconName; title: string; body?: string; action?: { label: string; onPress: () => void } }) {
  const { c } = useTheme();
  return <View style={styles.empty}>
    <View style={[styles.emptyIcon, { backgroundColor: c.surfaceAlt }]}><Ionicons name={icon} size={28} color={c.inkSoft} /></View>
    <T v="headline" style={{ textAlign: 'center' }}>{title}</T>
    {body ? <T v="subhead" color={c.inkSoft} style={{ textAlign: 'center', maxWidth: 320 }}>{body}</T> : null}
    {action ? <View style={{ marginTop: space.sm }}><Button title={action.label} onPress={action.onPress} variant="secondary" compact /></View> : null}
  </View>;
}

export function Busy({ label = 'Chargement…' }: { label?: string }) {
  const { c } = useTheme();
  return <View style={styles.busy} accessibilityLiveRegion="polite"><ActivityIndicator color={c.accent} /><T v="subhead" color={c.inkSoft}>{label}</T></View>;
}

/** Shimmer-free skeleton (respects reduced motion by default: static blocks, gentle pulse otherwise). */
export function Skeleton({ rows = 4 }: { rows?: number }) {
  const { c } = useTheme();
  const [pulse] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]));
      loop.start();
    });
    return () => loop?.stop();
  }, [pulse]);
  return <Animated.View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line, opacity: pulse }]} accessibilityLabel="Chargement" accessible>
    {Array.from({ length: rows }).map((_, i) => <View key={i} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
      <View style={[styles.stampSkeleton, { backgroundColor: c.surfaceAlt }]} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ height: 14, width: '82%', borderRadius: 4, backgroundColor: c.surfaceAlt }} />
        <View style={{ height: 11, width: '55%', borderRadius: 4, backgroundColor: c.surfaceAlt }} />
      </View>
    </View>)}
  </Animated.View>;
}

export function Progress({ value, tone = 'accent', label }: { value: number; tone?: 'accent' | 'ready' | 'soon' | 'urgent'; label?: string }) {
  const { c } = useTheme();
  const color = { accent: c.accent, ready: c.ready, soon: c.soon, urgent: c.urgent }[tone];
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return <View style={{ gap: 6 }} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }} accessibilityLabel={label}>
    {label ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T v="footnote" color={c.inkSoft}>{label}</T><T v="footnote" color={c.inkSoft} style={{ fontVariant: ['tabular-nums'] }}>{pct} %</T></View> : null}
    <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}><View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} /></View>
  </View>;
}

export function StatusPill({ status, label }: { status?: string | null; label?: string }) {
  const { c } = useTheme();
  const info = statusInfo(status);
  const tones = { ready: [c.ready, c.readySoft], soon: [c.soon, c.soonSoft], urgent: [c.urgent, c.urgentSoft], accent: [c.accent, c.accentSoft], closed: [c.inkSoft, c.surfaceAlt] } as const;
  const [fg, bg] = tones[info.tone];
  return <View style={[styles.pill, { backgroundColor: bg }]}><Text style={[type.caption, { color: fg }]} numberOfLines={1}>{label || info.label}</Text></View>;
}

/* ───────────────────────── Signature: deadline stamp ───────────────────────── */

/**
 * The deposit deadline as an administrative date stamp: J-n countdown above the calendar date.
 * Urgency colour + text label (never colour alone).
 */
export function DeadlineStamp({ date, size = 'md' }: { date?: string | null; size?: 'md' | 'lg' }) {
  const { c } = useTheme();
  const info = deadlineInfo(date);
  const { fg, bg } = urgencyColors(info.urgency, c);
  const d = date ? new Date(date) : null;
  const lg = size === 'lg';
  return <View style={[styles.stamp, lg && styles.stampLg, { borderColor: fg, backgroundColor: bg }]} accessible accessibilityLabel={info.long}>
    <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: font.heavy, fontSize: lg ? 26 : 17, lineHeight: lg ? 30 : 20, color: fg, fontVariant: ['tabular-nums'], letterSpacing: -0.3 }}>{info.label}</Text>
    {d && !Number.isNaN(d.getTime()) ? <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: font.semibold, fontSize: lg ? 13 : 11, lineHeight: lg ? 16 : 13, color: fg }}>
      {d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '')}
    </Text> : null}
  </View>;
}

/* ───────────────────────── Styles ───────────────────────── */

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: space.lg, gap: space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: touch },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, gap: space.sm },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: space.xs },
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: space.lg },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 56 },
  rowIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  fact: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: font.bold, fontSize: 12 },
  button: { minHeight: 52, borderRadius: radius.md, paddingHorizontal: space.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, overflow: 'hidden' },
  buttonCompact: { minHeight: touch, paddingHorizontal: space.lg },
  iconButton: { width: touch, height: touch, borderRadius: touch / 2, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  dot: { position: 'absolute', top: 9, right: 10, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  input: { minHeight: 50, borderRadius: radius.md, paddingHorizontal: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  search: { minHeight: 46, borderRadius: radius.md, paddingHorizontal: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
  banner: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.md },
  empty: { alignItems: 'center', paddingVertical: space.xxxl, paddingHorizontal: space.xl, gap: space.sm },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  busy: { padding: space.xxl, alignItems: 'center', gap: space.md },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  stamp: { width: 64, minHeight: 56, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, transform: [{ rotate: '-2deg' }] },
  stampLg: { width: 96, minHeight: 84, borderRadius: radius.md, borderWidth: 2 },
  stampSkeleton: { width: 64, height: 56, borderRadius: radius.sm },
});

/** @deprecated kept so older screens compile; read colours from useTheme(). */
export const palette = { ink: '#132A2E', muted: '#4A5D60', blue: '#4F46C8', pale: '#F4F5F2', line: '#D9DDD5', white: '#FFFFFF', red: '#B3261E', green: '#1F7A55' };
