import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const palette = { ink: '#10213D', muted: '#61718A', blue: '#246BFD', pale: '#F4F7FC', line: '#DCE5F1', white: '#FFFFFF', red: '#B42318', green: '#16794B' };

export function Screen({ children, scroll = true }: React.PropsWithChildren<{ scroll?: boolean }>) {
  return <SafeAreaView style={styles.safe}>{scroll ? <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={styles.content}>{children}</View>}</SafeAreaView>;
}

export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={styles.heading}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}

export function Card({ children, style }: React.PropsWithChildren<{ style?: object }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ title, onPress, disabled, secondary = false, loading = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; loading?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, (disabled || loading) && styles.disabled, pressed && styles.pressed]}>
    {loading ? <ActivityIndicator color={secondary ? palette.blue : palette.white} /> : <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text>}
  </Pressable>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor="#91A0B4" style={styles.input} {...props} /></View>;
}

export function Notice({ children, tone = 'info' }: React.PropsWithChildren<{ tone?: 'info' | 'error' | 'success' }>) {
  return <View style={[styles.notice, tone === 'error' && styles.noticeError, tone === 'success' && styles.noticeSuccess]}><Text style={styles.noticeText}>{children}</Text></View>;
}

export function Busy({ label = 'Chargement…' }: { label?: string }) {
  return <View style={styles.busy}><ActivityIndicator color={palette.blue} /><Text style={styles.muted}>{label}</Text></View>;
}

export function Row({ title, subtitle, onPress, right }: { title: string; subtitle?: string; onPress?: () => void; right?: string }) {
  const content = <View style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowTitle}>{title || 'Sans titre'}</Text>{subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}</View>{right ? <Text style={styles.rowRight}>{right}</Text> : null}</View>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => pressed ? styles.rowPressed : null}>{content}</Pressable> : content;
}

export function ErrorText({ children }: React.PropsWithChildren) {
  return <Text accessibilityRole="alert" style={styles.error}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.pale },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 32, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  heading: { gap: 5, marginBottom: 4 }, title: { color: palette.ink, fontSize: 27, fontWeight: '800' }, subtitle: { color: palette.muted, fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: palette.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: palette.line, gap: 10 },
  button: { minHeight: 48, paddingHorizontal: 16, borderRadius: 12, backgroundColor: palette.blue, justifyContent: 'center', alignItems: 'center' }, buttonText: { color: palette.white, fontSize: 15, fontWeight: '700' },
  buttonSecondary: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.blue }, buttonSecondaryText: { color: palette.blue }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.78 },
  field: { gap: 6 }, label: { color: palette.ink, fontSize: 13, fontWeight: '700' }, input: { minHeight: 48, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 11, paddingHorizontal: 13, color: palette.ink, fontSize: 15 },
  notice: { backgroundColor: '#EAF3FF', borderRadius: 12, padding: 13 }, noticeError: { backgroundColor: '#FEF0EF' }, noticeSuccess: { backgroundColor: '#EAF7F0' }, noticeText: { color: palette.ink, fontSize: 13, lineHeight: 19 },
  busy: { padding: 28, alignItems: 'center', gap: 10 }, muted: { color: palette.muted, fontSize: 14 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, rowCopy: { flex: 1, gap: 3 }, rowTitle: { color: palette.ink, fontSize: 15, fontWeight: '700' }, rowSubtitle: { color: palette.muted, fontSize: 12 }, rowRight: { color: palette.blue, fontSize: 12, fontWeight: '700' }, rowPressed: { opacity: 0.6 }, error: { color: palette.red, fontSize: 14, lineHeight: 20 },
});
