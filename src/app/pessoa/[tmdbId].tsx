import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { PersonPhoto } from '@/components/people';
import { Poster } from '@/components/poster';
import { ErrorState, Loading, Segmented } from '@/components/ui';
import { shortDate } from '@/lib/format';
import { getPerson } from '@/lib/services';
import { departmentLabel, type PersonCredit } from '@/lib/types';

const COLUMNS = 3;

export default function PersonScreen() {
  const { tmdbId } = useLocalSearchParams<{ tmdbId: string }>();
  const person = useQuery({ queryKey: ['person', tmdbId], queryFn: () => getPerson(Number(tmdbId)) });
  const { width } = useWindowDimensions();
  const [bioOpen, setBioOpen] = useState(false);
  const [tab, setTab] = useState<'acted' | 'directed' | null>(null);

  if (person.isPending) return <Loading hint />;
  if (person.isError) return <ErrorState message="Não foi possível carregar." onRetry={() => person.refetch()} />;

  const p = person.data;
  // abre na filmografia principal da pessoa
  const current = tab ?? (p.department === 'Directing' && p.directed.length > 0 ? 'directed' : p.acted.length > 0 ? 'acted' : 'directed');
  const credits = current === 'acted' ? p.acted : p.directed;
  const posterWidth = Math.floor((Math.min(width, 700) - 40 - 12 * (COLUMNS - 1)) / COLUMNS);

  const life = [p.birthday && shortDate(p.birthday), p.deathday && `† ${shortDate(p.deathday)}`].filter(Boolean).join(' · ');

  return (
    <>
      <Stack.Screen options={{ title: p.name }} />
      <ScrollView className="flex-1 bg-background" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="flex-row items-center gap-4 px-5 pt-4">
          <PersonPhoto name={p.name} profilePath={p.profilePath} size={92} />
          <View className="min-w-0 flex-1">
            <Text className="font-serif text-[26px] leading-8 text-foreground">{p.name}</Text>
            {p.department && <Text className="mt-1 text-sm text-brand-orange">{departmentLabel(p.department)}</Text>}
            {life ? <Text className="mt-0.5 text-sm text-brand-slate">{life}</Text> : null}
          </View>
        </View>

        {p.biography && (
          <Pressable onPress={() => setBioOpen(!bioOpen)} className="mt-5 px-5">
            <Text className="text-[15px] leading-[23px] text-foreground/80" numberOfLines={bioOpen ? undefined : 5}>
              {p.biography}
            </Text>
            {!bioOpen && <Text className="mt-1 text-sm text-brand-slate">Ler mais</Text>}
          </Pressable>
        )}

        {p.acted.length > 0 && p.directed.length > 0 && (
          <View className="mt-8 px-5">
            <Segmented
              value={current}
              onChange={setTab}
              options={[
                { value: 'acted', label: `Atuação  ${p.acted.length}` },
                { value: 'directed', label: `Direção  ${p.directed.length}` },
              ]}
            />
          </View>
        )}

        <View className="mt-5 flex-row flex-wrap gap-3 px-5">
          {credits.map((credit, i) => (
            <CreditPoster key={`${credit.tmdbId}-${i}`} credit={credit} width={posterWidth} />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

function CreditPoster({ credit, width }: { credit: PersonCredit; width: number }) {
  // filmes que ainda não estão no Nitrate passam pela rota que importa do TMDB
  const href = credit.id !== null ? (`/filme/${credit.id}` as const) : (`/filme/tmdb/${credit.tmdbId}` as const);
  return (
    <View style={{ width }}>
      <Poster title={credit.title} posterPath={credit.posterPath} width={width} size="w185" href={href} />
      <Text className="mt-1.5 text-xs text-brand-slate" numberOfLines={1}>
        {[credit.releaseYear, credit.role].filter(Boolean).join(' · ')}
      </Text>
    </View>
  );
}
