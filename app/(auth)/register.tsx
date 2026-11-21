import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { isAxiosError } from 'axios';
import { useAuth } from '@/src/auth/AuthProvider';
import { errorMessage } from '@/src/api/client';
import { Banner, Button, Field, Screen, T } from '@/src/components/ui';
import { space, useTheme } from '@/src/theme/tokens';

type Form = { first_name: string; last_name: string; email: string; phone: string; address: string; city: string; password: string; password_confirmation: string };

export default function RegisterScreen() {
  const { c } = useTheme();
  const { register } = useAuth();
  const [form, setForm] = useState<Form>({ first_name: '', last_name: '', email: '', phone: '', address: '', city: '', password: '', password_confirmation: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState(false);
  const set = (key: keyof Form) => (value: string) => { setForm((old) => ({ ...old, [key]: value })); setFieldErrors((e) => ({ ...e, [key]: undefined })); };
  const mismatch = form.password_confirmation.length > 0 && form.password !== form.password_confirmation;

  async function submit() {
    setBusy(true); setError(''); setFieldErrors({});
    try { await register(form); router.replace('/(tabs)' as any); }
    catch (err) {
      const data = isAxiosError(err) ? (err.response?.data as Record<string, unknown> | undefined) : undefined;
      if (data && typeof data === 'object' && !data.detail) {
        const errs: Partial<Record<keyof Form, string>> = {};
        for (const [k, v] of Object.entries(data)) if (k in form) errs[k as keyof Form] = Array.isArray(v) ? String(v[0]) : String(v);
        setFieldErrors(errs);
        setError(Object.keys(errs).length ? 'Corrigez les champs indiqués.' : errorMessage(err));
      } else setError(errorMessage(err));
    } finally { setBusy(false); }
  }

  const complete = Object.values(form).every(Boolean) && !mismatch && form.password.length >= 8;

  return <Screen back keyboard title="Créer un compte" subtitle="Ces informations identifient le responsable du compte. Le profil de l’entreprise se complète ensuite."
    footer={<Button title="Créer mon compte" onPress={submit} loading={busy} disabled={!complete} />}>
    <View style={{ gap: space.lg }}>
      <T v="headline">Vous</T>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}><Field label="Prénom" value={form.first_name} onChangeText={set('first_name')} autoComplete="given-name" textContentType="givenName" error={fieldErrors.first_name} /></View>
        <View style={{ flex: 1 }}><Field label="Nom" value={form.last_name} onChangeText={set('last_name')} autoComplete="family-name" textContentType="familyName" error={fieldErrors.last_name} /></View>
      </View>
      <Field label="Adresse e-mail" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" error={fieldErrors.email} />
      <Field label="Téléphone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="+212 6 00 00 00 00" error={fieldErrors.phone} />
      <Field label="Adresse" value={form.address} onChangeText={set('address')} autoComplete="street-address" textContentType="fullStreetAddress" error={fieldErrors.address} />
      <Field label="Ville" value={form.city} onChangeText={set('city')} textContentType="addressCity" error={fieldErrors.city} />
    </View>
    <View style={{ gap: space.lg }}>
      <T v="headline">Sécurité</T>
      <Field label="Mot de passe" value={form.password} onChangeText={set('password')} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="8 caractères minimum." error={fieldErrors.password} />
      <Field label="Confirmer le mot de passe" value={form.password_confirmation} onChangeText={set('password_confirmation')} secureTextEntry autoComplete="new-password" textContentType="newPassword" error={mismatch ? 'Les deux mots de passe ne correspondent pas.' : fieldErrors.password_confirmation} />
    </View>
    {error ? <Banner tone="error">{error}</Banner> : null}
    <T v="footnote" color={c.inkFaint}>En créant un compte, vous acceptez que vos données soient traitées pour fournir le service. Les documents restent privés à votre entreprise.</T>
  </Screen>;
}
