import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { Poster } from '@/components/poster';
import { EmptyText, ErrorState, Loading } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { getMyNotifications, markNotificationsRead } from '@/lib/services';
import type { AppNotification } from '@/lib/types';

/** Radar de estreias: filmes da watchlist que chegaram aos cinemas ou ao streaming */
export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: ['notifications', 'all'], queryFn: getMyNotifications });

  // abrir a tela marca tudo como lido
  useEffect(() => {
    if (!notifications.data?.some((n) => !n.read)) return;
    markNotificationsRead()
      .then(() => queryClient.setQueryData(['notifications', 'unread'], { count: 0 }))
      .catch(() => {});
  }, [notifications.data, queryClient]);

  if (notifications.isPending) return <Loading />;
  if (notifications.isError) return <ErrorState onRetry={() => notifications.refetch()} />;

  return (
    <FlatList
      data={notifications.data}
      keyExtractor={(n) => String(n.id)}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 48 }}
      renderItem={({ item }) => <NotificationRow notification={item} />}
      ListEmptyComponent={
        <View className="px-5 py-8">
          <EmptyText>
            Nada por enquanto. Quando um filme da sua watchlist estrear nos cinemas ou chegar ao streaming, avisamos aqui.
          </EmptyText>
        </View>
      }
    />
  );
}

function NotificationRow({ notification: n }: { notification: AppNotification }) {
  const cinema = n.type === 'CINEMA';
  return (
    <Link href={`/filme/${n.movie.id}`} asChild>
      <Pressable className={`flex-row items-center gap-4 border-b border-foreground/5 px-5 py-4 active:bg-surface ${n.read ? '' : 'bg-brand-orange/5'}`}>
        <Poster title={n.movie.title} posterPath={n.movie.posterPath} width={48} size="w185" />
        <View className="min-w-0 flex-1">
          <Text className="font-serif text-[17px] text-foreground" numberOfLines={1}>
            {n.movie.title}
          </Text>
          <Text className="mt-0.5 text-sm text-foreground/80">{cinema ? 'Chegou aos cinemas.' : 'Chegou ao streaming.'}</Text>
          {n.detail && <Text className="mt-0.5 text-xs text-brand-slate">{n.detail}</Text>}
          <Text className="mt-1 text-xs text-brand-slate/60">{timeAgo(n.createdAt)}</Text>
        </View>
        {!n.read && <View className="h-2 w-2 rounded-full bg-brand-orange" />}
      </Pressable>
    </Link>
  );
}
