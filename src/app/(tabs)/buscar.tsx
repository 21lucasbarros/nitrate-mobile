import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PersonPhoto, UserRow } from '@/components/people';
import { Poster } from '@/components/poster';
import { EmptyText, ErrorState, Segmented } from '@/components/ui';
import { useDebouncedValue } from '@/lib/hooks';
import { getCatalog, searchMovies, searchPeople, searchUsers } from '@/lib/services';
import { colors } from '@/lib/theme';
import { departmentLabel } from '@/lib/types';

type Kind = 'filmes' | 'pessoas' | 'perfis';

const COLUMNS = 3;
const GAP = 12;
const PADDING = 20;
const CATALOG_PAGE = 30;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind>('filmes');
  const term = useDebouncedValue(query.trim(), 400);
  const searching = term.length >= 2;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 8 }}>
      <View className="gap-4 px-5 pb-3">
        <Text className="text-[26px] font-semibold tracking-tight text-foreground">Buscar</Text>
        <View className="flex-row items-center gap-2 rounded-xl bg-surface px-3.5">
          <Ionicons name="search" size={18} color={colors.slate} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Filmes, pessoas e perfis"
            placeholderTextColor="rgba(154,158,165,0.6)"
            selectionColor={colors.orange}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            className="flex-1 py-3 text-base text-foreground"
          />
        </View>
        {searching && (
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: 'filmes', label: 'Filmes' },
              { value: 'pessoas', label: 'Pessoas' },
              { value: 'perfis', label: 'Perfis' },
            ]}
          />
        )}
      </View>

      {!searching ? (
        <Catalog />
      ) : kind === 'filmes' ? (
        <MovieResults term={term} />
      ) : kind === 'pessoas' ? (
        <PeopleResults term={term} />
      ) : (
        <ProfileResults term={term} />
      )}
    </View>
  );
}

function usePosterWidth() {
  const { width } = useWindowDimensions();
  return Math.floor((Math.min(width, 700) - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
}

/** o catálogo inteiro, em páginas, na ordem em que os filmes entraram no Nitrate */
function Catalog() {
  const posterWidth = usePosterWidth();
  const catalog = useInfiniteQuery({
    queryKey: ['catalog-infinite'],
    queryFn: ({ pageParam }) => getCatalog(pageParam, CATALOG_PAGE),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  });

  if (catalog.isError) return <ErrorState onRetry={() => catalog.refetch()} />;

  const movies = catalog.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <FlatList
      data={movies}
      keyExtractor={(m) => String(m.id)}
      numColumns={COLUMNS}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={{ paddingHorizontal: PADDING, gap: GAP, paddingBottom: 48 }}
      ListHeaderComponent={
        <Text className="mb-1 mt-2 text-[11px] font-semibold uppercase tracking-[2px] text-brand-slate">
          Catálogo{catalog.data ? `  ${catalog.data.pages[0].totalItems.toLocaleString('pt-BR')}` : ''}
        </Text>
      }
      renderItem={({ item }) => (
        <Poster title={item.title} posterPath={item.posterPath} width={posterWidth} size="w185" href={`/filme/${item.id}`} />
      )}
      onEndReachedThreshold={0.6}
      onEndReached={() => catalog.hasNextPage && !catalog.isFetchingNextPage && catalog.fetchNextPage()}
      ListFooterComponent={catalog.isFetching ? <ActivityIndicator className="py-6" color={colors.slate} /> : undefined}
    />
  );
}

function MovieResults({ term }: { term: string }) {
  const results = useQuery({ queryKey: ['search', 'movies', term], queryFn: () => searchMovies(term) });
  return (
    <ResultList
      query={results}
      empty="Nenhum filme encontrado."
      keyOf={(m) => String(m.tmdbId)}
      render={(m) => (
        // filmes que ainda não estão no Nitrate passam pela rota que importa do TMDB
        <Link href={m.id !== null ? `/filme/${m.id}` : `/filme/tmdb/${m.tmdbId}`} asChild>
          <Pressable className="flex-row items-center gap-3.5 py-2.5 active:opacity-70">
            <Poster title={m.title} posterPath={m.posterPath} width={46} size="w185" />
            <View className="min-w-0 flex-1">
              <Text className="font-serif text-[17px] text-foreground" numberOfLines={2}>
                {m.title}
              </Text>
              {m.releaseYear && <Text className="mt-0.5 text-sm text-brand-slate">{m.releaseYear}</Text>}
            </View>
          </Pressable>
        </Link>
      )}
    />
  );
}

function PeopleResults({ term }: { term: string }) {
  const results = useQuery({ queryKey: ['search', 'people', term], queryFn: () => searchPeople(term) });
  return (
    <ResultList
      query={results}
      empty="Ninguém encontrado."
      keyOf={(p) => String(p.tmdbId)}
      render={(p) => (
        <Link href={`/pessoa/${p.tmdbId}`} asChild>
          <Pressable className="flex-row items-center gap-3.5 py-2.5 active:opacity-70">
            <PersonPhoto name={p.name} profilePath={p.profilePath} size={46} />
            <View className="min-w-0 flex-1">
              <Text className="text-[15px] font-semibold text-foreground">{p.name}</Text>
              <Text className="text-sm text-brand-slate" numberOfLines={1}>
                {[departmentLabel(p.department), p.knownFor.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </Pressable>
        </Link>
      )}
    />
  );
}

function ProfileResults({ term }: { term: string }) {
  const results = useQuery({ queryKey: ['search', 'users', term], queryFn: () => searchUsers(term) });
  return (
    <ResultList query={results} empty="Nenhum perfil encontrado." keyOf={(u) => u.username} render={(u) => <UserRow user={u} />} />
  );
}

function ResultList<T>({
  query,
  empty,
  keyOf,
  render,
}: {
  query: { data?: T[]; isPending: boolean; isError: boolean; refetch: () => unknown };
  empty: string;
  keyOf: (item: T) => string;
  render: (item: T) => React.ReactElement;
}) {
  if (query.isPending) return <ActivityIndicator className="py-10" color={colors.slate} />;
  if (query.isError) return <ErrorState onRetry={query.refetch} />;
  return (
    <FlatList
      data={query.data}
      keyExtractor={keyOf}
      renderItem={({ item }) => render(item)}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: PADDING, paddingBottom: 48 }}
      ListEmptyComponent={<EmptyText>{empty}</EmptyText>}
    />
  );
}
