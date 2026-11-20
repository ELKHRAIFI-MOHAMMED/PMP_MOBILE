import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/src/auth/AuthProvider';
import { errorMessage } from '@/src/api/client';
import { Button, Card, ErrorText, Field, Heading, Screen, palette } from '@/src/components/ui';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', address: '', city: '', password: '', password_confirmation: '' });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((old) => ({ ...old, [key]: value }));
  async function submit() {
    setBusy(true); setError('');
    try { await register(form); router.replace('/(tabs)'); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <Screen><Heading title="Créer un compte" subtitle="Les champs correspondent au formulaire d’inscription du backend." />
    <Card>
      <Field label="Prénom" value={form.first_name} onChangeText={set('first_name')} />
      <Field label="Nom" value={form.last_name} onChangeText={set('last_name')} />
      <Field label="E-mail" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Téléphone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Field label="Adresse" value={form.address} onChangeText={set('address')} />
      <Field label="Ville" value={form.city} onChangeText={set('city')} />
      <Field label="Mot de passe" value={form.password} onChangeText={set('password')} secureTextEntry />
      <Field label="Confirmer le mot de passe" value={form.password_confirmation} onChangeText={set('password_confirmation')} secureTextEntry />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button title="Créer mon compte" onPress={submit} loading={busy} disabled={Object.values(form).some((v) => !v)} />
    </Card>
    <Link href={'/(auth)/login' as any} style={{ textAlign: 'center', color: palette.blue, fontWeight: '700' }}>J’ai déjà un compte</Link>
  </Screen>;
}
