import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useAuth } from '@/src/auth/AuthProvider';
import { Banner, Button, DeadlineStamp, Field, Screen, T } from '@/src/components/ui';
import { errorMessage } from '@/src/api/client';
import { font, space, useTheme } from '@/src/theme/tokens';

type InputRef = React.ComponentRef<typeof TextInput>;

/** A deadline 9 days out — the login hero shows the product's core promise with its own signature element. */
const SAMPLE_DEADLINE = new Date(Date.now() + 9 * 86_400_000 + 3_600_000).toISOString();

export default function LoginScreen() {
  const { c } = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<InputRef>(null);

  async function submit() {
    if (!email || !password) return;
    setBusy(true); setError('');
    try { await signIn(email, password); router.replace('/(tabs)' as any); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  return <Screen keyboard contentStyle={{ justifyContent: 'center' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
      <DeadlineStamp date={SAMPLE_DEADLINE} size="lg" />
      <View style={{ flex: 1, gap: space.xs }}>
        <T v="footnote" color={c.inkSoft} style={{ fontFamily: font.semibold }}>TrueAi Marchés</T>
        <T v="title">Ne manquez plus une date de dépôt.</T>
      </View>
    </View>
    <T v="callout" color={c.inkSoft}>Suivez les appels d’offres publics, préparez vos dossiers de candidature et estimez vos prix, depuis votre téléphone.</T>

    <View style={{ gap: space.lg }}>
      <Field label="Adresse e-mail" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
        autoComplete="email" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} placeholder="vous@entreprise.ma" />
      <View>
        <Field ref={passwordRef}label="Mot de passe" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry={!show}
          autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
        <Pressable onPress={() => setShow((s) => !s)} accessibilityRole="button" accessibilityLabel={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} hitSlop={10} style={{ alignSelf: 'flex-end', paddingTop: space.sm }}>
          <T v="footnote" color={c.accent} style={{ fontFamily: font.semibold }}>{show ? 'Masquer' : 'Afficher'} le mot de passe</T>
        </Pressable>
      </View>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Button title="Se connecter" onPress={submit} loading={busy} disabled={!email || !password} />
    </View>

    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xs, flexWrap: 'wrap' }}>
      <T v="subhead" color={c.inkSoft}>Pas encore de compte ?</T>
      <Pressable onPress={() => router.push('/(auth)/register' as any)} accessibilityRole="link" hitSlop={10}>
        <T v="subhead" color={c.accent} style={{ fontFamily: font.semibold }}>Créer un compte entreprise</T>
      </Pressable>
    </View>
  </Screen>;
}
