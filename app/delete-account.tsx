import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { isAxiosError } from 'axios';
import { errorMessage, http } from '@/src/api/client';
import { useAuth } from '@/src/auth/AuthProvider';
import { Banner, Button, Field, Row, Screen, Section, T } from '@/src/components/ui';
import { space, useTheme } from '@/src/theme/tokens';
import { confirmAction, notify } from '@/src/lib/confirm';

const DELETED = [
  'Votre compte et vos accès',
  'Le profil de l’entreprise (ICE, RC, RIB, représentant)',
  'Vos dossiers de candidature et leurs pièces',
  'Vos attestations, garanties, documents et devis',
  'Vos favoris, estimations, tâches et notifications',
] as const;

export default function DeleteAccountScreen() {
  const { c } = useTheme();
  const qc = useQueryClient();
  const { user, clearSession } = useAuth();
  const [password, setPassword] = useState('');

  const remove = useMutation({
    mutationFn: () => http.delete('/auth/me/', { data: { password } }),
    onSuccess: async () => {
      qc.clear();
      await clearSession();
      router.replace('/(auth)/login' as any);
      notify('Compte supprimé', 'Votre compte et les données de votre entreprise ont été supprimés.');
    },
  });
  const code = isAxiosError(remove.error) ? (remove.error.response?.data as any)?.code : undefined;

  const confirm = async () => {
    if (await confirmAction('Supprimer définitivement ?', `Le compte ${user?.email} et toutes ses données seront effacés. Cette action est irréversible.`, 'Supprimer', true)) remove.mutate();
  };

  return <Screen back keyboard title="Supprimer mon compte" subtitle="La suppression est immédiate et définitive. Nous ne pouvons pas récupérer vos données ensuite."
    footer={<Button title="Supprimer mon compte" icon="trash-outline" variant="destructive" onPress={() => void confirm()} loading={remove.isPending} disabled={password.length < 1} />}>
    <Section title="Ce qui sera effacé">
      {DELETED.map((label) => <Row key={label} icon="close-circle-outline" iconTone="urgent" title={label} />)}
    </Section>
    <T v="footnote" color={c.inkSoft}>Les avis de marchés publics restent consultables par les autres utilisateurs : ils proviennent du portail officiel et n’appartiennent à aucun compte.</T>
    <View style={{ gap: space.md }}>
      <Field label="Mot de passe actuel" secureTextEntry value={password} onChangeText={setPassword} autoComplete="current-password" textContentType="password"
        hint="Pour confirmer qu’il s’agit bien de vous." error={code === 'INVALID_PASSWORD' ? 'Mot de passe incorrect.' : undefined} />
    </View>
    {remove.isError && code !== 'INVALID_PASSWORD' ? <Banner tone={code === 'TEAM_MEMBERS_EXIST' ? 'warning' : 'error'} title="Suppression impossible">
      {errorMessage(remove.error)}
    </Banner> : null}
  </Screen>;
}
