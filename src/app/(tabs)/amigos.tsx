import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityItem } from '@/components/activity-item';
import { FollowButton, UserRow } from '@/components/people';
import { EmptyText, ErrorState, Loading, Segmented } from '@/components/ui';
import { useMe } from '@/lib/hooks';
import { getFriendsFeed, getSimilarUsers } from '@/lib/services';
import { colors } from '@/lib/theme';

type Tab = 'atividade' | 'sugestoes';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('atividade');

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 8 }}>
      <View className="gap-4 px-5 pb-3">
        <Text className="text-[26px] font-semibold tracking-tight text-foreground">Amigos</Text>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'atividade', label: 'Atividade' },
            { value: 'sugestoes', label: 'Gostos parecidos' },
          ]}
        />
      </View>
      {tab === 'atividade' ? <Feed /> : <Suggestions />}
    </View>
  );
}

function Feed() {
  const me = useMe().data;
  const feed = useInfiniteQuery({
    queryKey: ['feed', 'friends'],
    queryFn: ({ pageParam }) => getFriendsFeed(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
  });

  if (feed.isPending) return <Loading hint />;
  if (feed.isError) return <ErrorState message="Não foi possível carregar a atividade." onRetry={() => feed.refetch()} />;

  const items = feed.data.pages.flatMap((p) => p.items);

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ActivityItem item={item} myUsername={me?.username} />}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={() => void feed.refetch()} tintColor={colors.slate} />}
      onEndReachedThreshold={0.5}
      onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
      ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator className="py-6" color={colors.slate} /> : undefined}
      ListEmptyComponent={
        <View className="px-5 py-10">
          <EmptyText>Nada por aqui ainda. Quando quem você segue registrar, listar ou curtir algo, aparece aqui.</EmptyText>
        </View>
      }
    />
  );
}

/** quem avaliou os mesmos filmes com notas parecidas (sem quem você já segue) */
function Suggestions() {
  const similar = useQuery({ queryKey: ['similar', 'all'], queryFn: getSimilarUsers });

  if (similar.isPending) return <Loading />;
  if (similar.isError) return <ErrorState onRetry={() => similar.refetch()} />;

  return (
    <FlatList
      data={similar.data}
      keyExtractor={(u) => u.username}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
      renderItem={({ item }) => (
        <View className="flex-row items-center gap-3 border-b border-foreground/5">
          <View className="flex-1">
            <UserRow user={item} detail={`${item.compatibility}% · ${item.sharedFilms} em comum`} chevron={false} />
          </View>
          <FollowButton username={item.username} following={false} />
        </View>
      )}
      ListEmptyComponent={
        <EmptyText>Avalie mais filmes para encontrarmos cinéfilos com notas parecidas com as suas.</EmptyText>
      }
    />
  );
}
