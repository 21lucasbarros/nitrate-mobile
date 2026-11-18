import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList } from 'react-native';

import { UserRow } from '@/components/people';
import { EmptyText, ErrorState, Loading } from '@/components/ui';
import { getFollowers, getFollowing } from '@/lib/services';

/** seguidores ou quem a pessoa segue */
export default function ConnectionsScreen() {
  const { username, tipo = 'seguidores' } = useLocalSearchParams<{ username: string; tipo?: 'seguidores' | 'seguindo' }>();
  const followers = tipo === 'seguidores';
  const people = useQuery({
    queryKey: ['connections', username, tipo],
    queryFn: () => (followers ? getFollowers(username) : getFollowing(username)),
  });

  return (
    <>
      <Stack.Screen options={{ title: followers ? 'Seguidores' : 'Seguindo' }} />
      {people.isPending ? (
        <Loading />
      ) : people.isError ? (
        <ErrorState onRetry={() => people.refetch()} />
      ) : (
        <FlatList
          data={people.data}
          keyExtractor={(u) => u.username}
          renderItem={({ item }) => <UserRow user={item} />}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
          ListEmptyComponent={<EmptyText>{followers ? 'Ninguém segue este perfil ainda.' : 'Este perfil não segue ninguém ainda.'}</EmptyText>}
        />
      )}
    </>
  );
}
