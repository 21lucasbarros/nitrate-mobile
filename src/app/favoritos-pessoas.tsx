import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { FAVORITE_PEOPLE_LABELS } from '@/components/favorite-people';
import { PersonPhoto } from '@/components/people';
import { EmptyText, ErrorState, Loading } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { showError } from '@/lib/dialogs';
import { useDebouncedValue, useMe } from '@/lib/hooks';
import { getFavoritePeople, MAX_FAVORITE_PEOPLE, searchPeople, setMyFavoritePeople } from '@/lib/services';
import { colors } from '@/lib/theme';
import { departmentLabel, type FavoritePeople, type FavoritePeopleKind, type FavoritePerson, type PersonSummary } from '@/lib/types';

const MIN_QUERY = 2;

/** escolher e ordenar os atores ou diretores favoritos; salva a lista inteira de uma vez */
export default function FavoritePeopleScreen() {
  const { tipo } = useLocalSearchParams<{ tipo: string }>();
  const kind: FavoritePeopleKind = tipo === 'directors' ? 'directors' : 'actors';
  const me = useMe();
  const username = me.data?.username;
  const favorites = useQuery({
    queryKey: ['favorite-people', username],
    queryFn: () => getFavoritePeople(username!),
    enabled: !!username,
  });

  if (me.isError || favorites.isError) {
    return <ErrorState onRetry={() => (me.isError ? me.refetch() : favorites.refetch())} />;
  }
  if (!favorites.data || !username) return <Loading />;
  return <Editor kind={kind} username={username} initial={favorites.data[kind]} />;
}

function Editor({ kind, username, initial }: { kind: FavoritePeopleKind; username: string; initial: FavoritePerson[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [picks, setPicks] = useState(initial);
  const [query, setQuery] = useState('');

  const labels = FAVORITE_PEOPLE_LABELS[kind];
  const term = useDebouncedValue(query.trim(), 350);
  const results = useQuery({
    queryKey: ['search', 'people', term],
    queryFn: () => searchPeople(term),
    enabled: term.length >= MIN_QUERY,
  });
  const full = picks.length >= MAX_FAVORITE_PEOPLE;

  // quem é do departamento da lista aparece primeiro (a busca do TMDB mistura atores e equipe)
  const sorted = results.data
    ? [...results.data].sort((a, b) => Number(b.department === labels.department) - Number(a.department === labels.department))
    : undefined;

  const save = useMutation({
    mutationFn: () => setMyFavoritePeople(kind, picks.map((p) => p.tmdbId)),
    onSuccess: (people) => {
      queryClient.setQueryData<FavoritePeople>(['favorite-people', username], (old) => (old ? { ...old, [kind]: people } : old));
      queryClient.invalidateQueries({ queryKey: ['favorite-people', username] });
      router.back();
    },
    onError: (err) => showError('Não foi possível salvar', errorMessage(err)),
  });

  const add = (person: PersonSummary) => {
    if (full || picks.some((p) => p.tmdbId === person.tmdbId)) return;
    Haptics.selectionAsync().catch(() => {});
    setPicks([...picks, { tmdbId: person.tmdbId, name: person.name, profilePath: person.profilePath }]);
    setQuery('');
  };

  const move = (index: number, delta: number) => {
    const next = [...picks];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setPicks(next);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: labels.title,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text className="text-base text-brand-slate">Cancelar</Text>
            </Pressable>
          ),
          headerRight: () =>
            save.isPending ? (
              <ActivityIndicator color={colors.orange} />
            ) : (
              <Pressable onPress={() => save.mutate()} hitSlop={10}>
                <Text className="text-base font-semibold text-brand-orange">Salvar</Text>
              </Pressable>
            ),
        }}
      />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Text className="text-sm text-brand-slate">Até {MAX_FAVORITE_PEOPLE}, na ordem em que aparecem no perfil.</Text>

        <View className="mt-4 overflow-hidden rounded-2xl bg-surface">
          {picks.map((person, i) => (
            <View key={person.tmdbId} className={`flex-row items-center gap-3 py-2 pl-3 pr-2 ${i > 0 ? 'border-t border-foreground/5' : ''}`}>
              <Text className="w-4 text-center text-sm text-brand-slate">{i + 1}</Text>
              <PersonPhoto name={person.name} profilePath={person.profilePath} size={40} />
              <Text className="min-w-0 flex-1 text-[15px] text-foreground" numberOfLines={1}>
                {person.name}
              </Text>
              <IconButton icon="chevron-up" label="Subir" disabled={i === 0} onPress={() => move(i, -1)} />
              <IconButton icon="chevron-down" label="Descer" disabled={i === picks.length - 1} onPress={() => move(i, 1)} />
              <IconButton icon="close" label="Remover" onPress={() => setPicks(picks.filter((p) => p.tmdbId !== person.tmdbId))} />
            </View>
          ))}
          {Array.from({ length: MAX_FAVORITE_PEOPLE - picks.length }, (_, i) => (
            <View
              key={`vazio-${i}`}
              className={`flex-row items-center gap-3 py-2 pl-3 ${picks.length + i > 0 ? 'border-t border-foreground/5' : ''}`}>
              <Text className="w-4 text-center text-sm text-brand-slate/50">{picks.length + i + 1}</Text>
              <View className="h-10 w-10 rounded-full border border-dashed border-foreground/15" />
              <Text className="text-sm text-brand-slate/50">vazio</Text>
            </View>
          ))}
        </View>

        {!full && (
          <View className="mt-6">
            <View className="flex-row items-center gap-2 rounded-xl bg-surface px-3.5">
              <Ionicons name="search" size={18} color={colors.slate} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={labels.search}
                placeholderTextColor="rgba(154,158,165,0.6)"
                selectionColor={colors.orange}
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
                className="flex-1 py-3 text-base text-foreground"
              />
            </View>
            {term.length >= MIN_QUERY && (
              <View className="mt-2">
                {results.isPending && <ActivityIndicator className="py-4" color={colors.slate} />}
                {results.isError && <EmptyText>Não foi possível buscar.</EmptyText>}
                {sorted?.length === 0 && <EmptyText>Ninguém encontrado.</EmptyText>}
                {sorted?.slice(0, 8).map((person) => {
                  const already = picks.some((p) => p.tmdbId === person.tmdbId);
                  const detail = [departmentLabel(person.department), ...person.knownFor.slice(0, 2)].filter(Boolean).join(' · ');
                  return (
                    <Pressable
                      key={person.tmdbId}
                      onPress={() => add(person)}
                      disabled={already}
                      className={`flex-row items-center gap-3 py-2.5 active:opacity-70 ${already ? 'opacity-50' : ''}`}>
                      <PersonPhoto name={person.name} profilePath={person.profilePath} size={40} />
                      <View className="min-w-0 flex-1">
                        <Text className="text-[15px] text-foreground" numberOfLines={1}>
                          {person.name}
                        </Text>
                        {detail ? (
                          <Text className="text-xs text-brand-slate" numberOfLines={1}>
                            {detail}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name={already ? 'checkmark' : 'add-circle-outline'} size={22} color={already ? colors.slate : colors.orange} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'chevron-up' | 'chevron-down' | 'close';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      className={`h-8 w-8 items-center justify-center rounded-full active:bg-surface-strong ${disabled ? 'opacity-25' : ''}`}>
      <Ionicons name={icon} size={18} color={colors.foreground} />
    </Pressable>
  );
}
