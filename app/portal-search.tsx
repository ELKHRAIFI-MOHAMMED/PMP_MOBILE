import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { errorMessage, http } from '@/src/api/client';
import { Banner, Button, Card, DeadlineStamp, Fact, Field, Screen, Section, T } from '@/src/components/ui';
import { sentenceCase, shortBuyer } from '@/src/components/market';
import { formatMoney } from '@/src/lib/format';
import { space, useTheme } from '@/src/theme/tokens';
import type { PortalRecord, TenderMarket } from '@/src/types/api';

const isUrl = (s: string) => /^https?:\/\//i.test(s);

const MONTHS: Record<string, number> = { JAN: 0, FEV: 1, 'FÉV': 1, MAR: 2, AVR: 3, MAI: 4, JUN: 5, JUIN: 5, JUL: 6, JUIL: 6, AOU: 7, 'AOÛ': 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11, 'DÉC': 11 };

/** Portal dates arrive as "06/01/2027 09:00" or "MER 06 JAN 2027 09:00"; convert to ISO for the stamp. */
function portalDate(s?: string | null) {
  if (!s) return null;
  const numeric = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(s.trim());
  if (numeric) return new Date(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]), Number(numeric[4] || 0), Number(numeric[5] || 0)).toISOString();
  const words = /(\d{1,2})\s+([A-ZÉÛ]{3,4})\.?\s+(\d{4})(?:\s+(\d{2}):(\d{2}))?/i.exec(s.trim());
  const month = words ? MONTHS[words[2].toUpperCase()] : undefined;
  if (words && month !== undefined) return new Date(Number(words[3]), month, Number(words[1]), Number(words[4] || 0), Number(words[5] || 0)).toISOString();
  return Number.isNaN(new Date(s).getTime()) ? null : s;
}

export default function PortalSearchScreen() {
  const { c } = useTheme();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(params.q || '');

  const search = useMutation({
    mutationFn: async (value: string) => {
      const data = (await http.post('/marches/search-portal/', isUrl(value) ? { url: value } : { reference: value }, { timeout: 190_000 })).data;
      return (data?.requires_selection ? data.results : [data]) as PortalRecord[];
    },
  });
  const importer = useMutation({
    mutationFn: async (record: PortalRecord) => (await http.post('/marches/import-portal-result/', { provenance: record.provenance })).data as TenderMarket,
    onSuccess: (market) => {
      void qc.invalidateQueries({ queryKey: ['markets'] });
      router.replace(`/market/${market.id}` as any);
    },
  });

  const submit = () => { const v = q.trim(); if (v.length >= 2) search.mutate(v); };

  return <Screen back keyboard title="Portail officiel" subtitle="Retrouvez une consultation publiée sur marchespublics.gov.ma et ajoutez-la à votre espace.">
    <View style={{ gap: space.md }}>
      <Field label="Référence ou lien de la consultation" icon="search" value={q} onChangeText={setQ} autoCapitalize="characters" autoCorrect={false}
        placeholder="Ex. SM4130746 ou https://www.marchespublics.gov.ma/…" returnKeyType="search" onSubmitEditing={submit}
        hint="La recherche interroge le portail en direct : elle peut prendre jusqu’à une minute." />
      <Button title={search.isPending ? 'Recherche sur le portail…' : 'Rechercher'} icon="globe-outline" onPress={submit} loading={search.isPending} disabled={q.trim().length < 2} />
    </View>

    {search.isError ? <Banner tone="error" title="Recherche impossible">{errorMessage(search.error)}</Banner> : null}
    {importer.isError ? <Banner tone="error" title="Ajout impossible">{errorMessage(importer.error)}</Banner> : null}

    {search.data ? <Section title={search.data.length > 1 ? `${search.data.length} consultations trouvées` : 'Consultation trouvée'}
      footnote="Les informations proviennent du portail au moment de la recherche. Vérifiez-les sur l’avis officiel avant toute décision.">
      {search.data.map((r) => <View key={r.provenance} style={{ padding: space.lg, gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <DeadlineStamp date={portalDate(r.date_limite)} />
          <View style={{ flex: 1, gap: 4 }}>
            <T v="bodyStrong">{sentenceCase(r.objet || r.reference)}</T>
            {r.acheteur_public ? <T v="footnote" color={c.inkSoft}>{shortBuyer(sentenceCase(r.acheteur_public))}</T> : null}
          </View>
        </View>
        <Card style={{ padding: 0, gap: 0 }}>
          <Fact label="Référence" value={r.reference} />
          <Fact label="Procédure" value={r.procedure_complete} />
          <Fact label="Catégorie" value={r.categorie} />
          <Fact label="Lieu d’exécution" value={r.lieu_execution} />
          <Fact label="Estimation du maître d’ouvrage" value={formatMoney(r.estimation)} />
        </Card>
        <Button title="Ajouter à mes marchés" icon="add-circle-outline" onPress={() => importer.mutate(r)} loading={importer.isPending && importer.variables?.provenance === r.provenance} />
      </View>)}
    </Section> : null}
  </Screen>;
}
