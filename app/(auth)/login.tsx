import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text } from 'react-native';
import { useAuth } from '@/src/auth/AuthProvider';
import { Button, Card, ErrorText, Field, Heading, Notice, Screen, palette } from '@/src/components/ui';
import { errorMessage } from '@/src/api/client';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setError('');
    try { await signIn(email, password); router.replace('/(tabs)'); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <Screen><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: 18, paddingTop: 42 }}>
    <Text style={{ color: palette.blue, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}>TRUEAI · MARCHÉS PUBLICS</Text>
    <Heading title="Content de vous revoir" subtitle="Connectez-vous à votre espace entreprise." />
    <Card><Field label="Adresse e-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button title="Se connecter" onPress={submit} loading={busy} disabled={!email || !password} />
    </Card>
    <Notice>La session mobile utilise le jeton DRF existant. Le jeton est conservé dans SecureStore sur Android/iOS; sur le Web, il reste uniquement en mémoire.</Notice>
    <Link href={'/(auth)/register' as any} style={{ textAlign: 'center', color: palette.blue, fontWeight: '700' }}>Créer un compte entreprise</Link>
  </KeyboardAvoidingView></Screen>;
}
