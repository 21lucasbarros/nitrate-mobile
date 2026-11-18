import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Poster } from '@/components/poster';
import { EmptyText, ErrorState, Loading } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { confirmAction, showError } from '@/lib/dialogs';
import { timeAgo } from '@/lib/format';
import { useMe } from '@/lib/hooks';
import { deleteList, getList, removeMovieFromList } from '@/lib/services';
import { colors } from '@/lib/theme';

const COLUMNS = 3;

export default function ListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const me = useMe().data;
  const list = useQuery({ queryKey: ['list', listId], queryFn: () => getList(listId) });

  const removeMovie = useMutation({
    mutationFn: (movieId: number) => removeMovieFromList(listId, movieId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['list', listId], updated);
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
    onError: (err) => showError('Não foi possível remover', errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: () => deleteList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      router.back();
    },
    onError: (err) => showError('Não foi possível apagar', errorMessage(err)),
  });

  if (list.isPending) return <Loading />;
  if (list.isError) return <ErrorState message="Lista não encontrada." onRetry={() => list.refetch()} />;

  const l = list.data;
  const own = me?.username === l.owner.username;
  const posterWidth = Math.floor((Math.min(width, 700) - 40 - 12 * (COLUMNS - 1)) / COLUMNS);

  const confirmDelete = () =>
    confirmAction('Apagar lista?', `"${l.name}" será apagada. Os filmes continuam no seu diário.`, 'Apagar', () => remove.mutate());

  const confirmRemoveMovie = (movieId: number, title: string) =>
    confirmAction('Tirar da lista?', title, 'Tirar', () => removeMovie.mutate(movieId));

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: own
            ? () => (
                <Pressable onPress={confirmDelete} hitSlop={10} accessibilityLabel="Apagar lista">
                  <Ionicons name="trash-outline" size={21} color={colors.crimson} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <FlatList
        data={l.movies}
        keyExtractor={(m) => String(m.id)}
        numColumns={COLUMNS}
        contentInsetAdjustmentBehavior="automatic"
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 48 }}
        ListHeaderComponent={
          <View className="pb-4 pt-2">
            <View className="flex-row items-center gap-2">
              <Text className="flex-1 font-serif text-[28px] leading-8 text-foreground">{l.name}</Text>
              {!l.isPublic && <Ionicons name="lock-closed" size={16} color={colors.slate} />}
            </View>
            <Link href={`/u/${l.owner.username}`} asChild>
              <Pressable className="mt-3 flex-row items-center gap-2">
                <Avatar name={l.owner.name} username={l.owner.username} size="xs" />
                <Text className="text-sm text-brand-slate">
                  <Text className="font-semibold text-foreground/90">{l.owner.name}</Text> · {l.filmsCount}{' '}
                  {l.filmsCount === 1 ? 'filme' : 'filmes'} · atualizada {timeAgo(l.updatedAt)}
                </Text>
              </Pressable>
            </Link>
            {l.description && <Text className="mt-4 text-[15px] leading-[22px] text-foreground/80">{l.description}</Text>}
            {own && l.movies.length > 0 && (
              <Text className="mt-4 text-xs text-brand-slate/60">Toque e segure um pôster para tirá-lo da lista.</Text>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <Pressable onLongPress={own ? () => confirmRemoveMovie(item.id, item.title) : undefined} style={{ width: posterWidth }}>
            <Poster title={item.title} posterPath={item.posterPath} width={posterWidth} size="w185" href={`/filme/${item.id}`} />
            <Text className="mt-1 text-[11px] text-brand-slate/60">{index + 1}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyText>Esta lista ainda não tem filmes.</EmptyText>}
      />
    </>
  );
}
