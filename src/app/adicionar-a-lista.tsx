import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { Button, EmptyText, ErrorState } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { showError } from '@/lib/dialogs';
import { addMovieToList, createList, getMyLists, removeMovieFromList } from '@/lib/services';
import { colors } from '@/lib/theme';
import type { MovieList } from '@/lib/types';

/** marcar/desmarcar o filme nas suas listas, ou criar uma lista nova já com ele */
export default function AddToListScreen() {
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const id = Number(movieId);
  const queryClient = useQueryClient();
  const key = ['my-lists', id];
  const lists = useQuery({ queryKey: key, queryFn: () => getMyLists(id) });

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const afterChange = (updated: MovieList) => {
    queryClient.setQueryData<MovieList[]>(key, (old) =>
      old?.map((l) => (l.id === updated.id ? { ...updated, containsMovie: !l.containsMovie } : l)),
    );
    queryClient.invalidateQueries({ queryKey: ['lists'] });
    queryClient.invalidateQueries({ queryKey: ['list', updated.id] });
  };

  const toggle = useMutation({
    mutationFn: (list: MovieList) => (list.containsMovie ? removeMovieFromList(list.id, id) : addMovieToList(list.id, id)),
    onMutate: () => Haptics.selectionAsync().catch(() => {}),
    onSuccess: afterChange,
    onError: (err) => showError('Não foi possível atualizar a lista', errorMessage(err)),
  });

  const create = useMutation({
    mutationFn: () => createList({ name: name.trim(), description: '', isPublic, movieIds: [id] }),
    onSuccess: () => {
      setCreating(false);
      setName('');
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
    onError: (err) => showError('Não foi possível criar a lista', errorMessage(err)),
  });

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      {lists.isPending ? (
        <ActivityIndicator className="py-8" color={colors.slate} />
      ) : lists.isError ? (
        <ErrorState onRetry={() => lists.refetch()} />
      ) : (
        <View className="overflow-hidden rounded-2xl bg-surface">
          {lists.data.length === 0 && (
            <View className="px-4 py-3">
              <EmptyText>Você ainda não tem listas.</EmptyText>
            </View>
          )}
          {lists.data.map((list, i) => (
            <Pressable
              key={list.id}
              onPress={() => toggle.mutate(list)}
              disabled={toggle.isPending}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!list.containsMovie }}
              className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-surface-strong ${i > 0 ? 'border-t border-foreground/5' : ''}`}>
              <Ionicons
                name={list.containsMovie ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={list.containsMovie ? colors.orange : colors.slate}
              />
              <View className="min-w-0 flex-1">
                <Text className="text-[15px] text-foreground" numberOfLines={1}>
                  {list.name}
                </Text>
                <Text className="text-xs text-brand-slate">
                  {list.filmsCount} {list.filmsCount === 1 ? 'filme' : 'filmes'}
                  {list.isPublic ? '' : ' · privada'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View className="mt-6">
        {creating ? (
          <View className="gap-4 rounded-2xl bg-surface p-4">
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              placeholder="Nome da lista"
              placeholderTextColor="rgba(154,158,165,0.5)"
              selectionColor={colors.orange}
              maxLength={100}
              className="rounded-xl bg-surface-strong px-4 py-3 text-base text-foreground"
            />
            <View className="flex-row items-center justify-between">
              <Text className="text-[15px] text-foreground/85">Pública</Text>
              <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: colors.orange, false: colors.surfaceStrong }} thumbColor="#fff" />
            </View>
            <View className="flex-row gap-2">
              <Button label="Cancelar" variant="ghost" size="sm" onPress={() => setCreating(false)} />
              <Button label="Criar com este filme" size="sm" className="flex-1" disabled={!name.trim()} loading={create.isPending} onPress={() => create.mutate()} />
            </View>
          </View>
        ) : (
          <Button label="Nova lista" variant="secondary" icon="add" onPress={() => setCreating(true)} />
        )}
      </View>
    </ScrollView>
  );
}
