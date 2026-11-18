import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { MovieRow, type RowItem } from '@/components/movie-row';
import { ReviewCard } from '@/components/review-card';
import { TabScroll } from '@/components/tab-screen';
import { EmptyText, ErrorState, Loading, SectionHeading } from '@/components/ui';
import { greeting } from '@/lib/format';
import { useMe } from '@/lib/hooks';
import {
  getCatalog,
  getMyFeed,
  getMyRecommendations,
  getRecentReviews,
  getSimilarUsers,
  getTrendingMovies,
  getUnreadNotificationsCount,
  getUserWatchlist,
} from '@/lib/services';
import { colors } from '@/lib/theme';
import type { Movie, MovieReview } from '@/lib/types';

const FEED_LIMIT = 12;

const reviewToRow = (r: MovieReview): RowItem => ({
  key: `r-${r.id}`,
  title: r.movie.title,
  posterPath: r.movie.posterPath,
  href: `/filme/${r.movie.id}`,
  caption: r.user.name.split(' ')[0],
});

const movieToRow = (m: Movie): RowItem => ({
  key: `m-${m.id}`,
  title: m.title,
  posterPath: m.posterPath,
  href: `/filme/${m.id}`,
  caption: m.releaseYear ? String(m.releaseYear) : undefined,
});

export default function HomeScreen() {
  const router = useRouter();
  const me = useMe();
  const user = me.data;
  const followsSomeone = (user?.followingCount ?? 0) > 0;

  // quem segue alguém vê os amigos; quem ainda não segue ninguém vê a comunidade
  const feed = useQuery({
    queryKey: ['feed', 'home', followsSomeone],
    queryFn: () => (followsSomeone ? getMyFeed(FEED_LIMIT) : getRecentReviews(FEED_LIMIT)),
    enabled: !!user,
  });
  const watchlist = useQuery({
    queryKey: ['watchlist', user?.username],
    queryFn: () => getUserWatchlist(user!.username),
    enabled: !!user,
  });
  // a contagem de filmes entra na chave: registrar um filme novo refaz as recomendações
  const recommendations = useQuery({
    queryKey: ['recommendations', user?.filmsCount],
    queryFn: getMyRecommendations,
    enabled: !!user,
  });
  const similar = useQuery({
    queryKey: ['similar', user?.followingCount, user?.filmsCount],
    queryFn: getSimilarUsers,
    enabled: !!user,
  });
  const trending = useQuery({ queryKey: ['trending'], queryFn: getTrendingMovies, staleTime: 5 * 60_000 });
  const catalog = useQuery({ queryKey: ['catalog', 0, 30], queryFn: () => getCatalog(0, 30) });
  const unread = useQuery({ queryKey: ['notifications', 'unread'], queryFn: getUnreadNotificationsCount });

  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([me.refetch(), feed.refetch(), watchlist.refetch(), recommendations.refetch(), trending.refetch(), unread.refetch()]);
    setRefreshing(false);
  };

  if (me.isPending) return <Loading hint />;
  if (!user) return <ErrorState message="Não foi possível carregar sua conta." onRetry={() => me.refetch()} />;

  const watchlistIds = new Set(watchlist.data?.map((item) => item.movie.id));
  const discover = (catalog.data?.items ?? []).filter((m) => !watchlistIds.has(m.id)).slice(0, 15);
  const writtenReviews = (feed.data ?? []).filter((r) => r.text && !r.spoiler).slice(0, 3);
  const unreadCount = unread.data?.count ?? 0;

  // "O que assistir hoje?": sorteia um filme da watchlist
  const pickFromWatchlist = () => {
    const items = watchlist.data ?? [];
    if (items.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const pick = items[Math.floor(Math.random() * items.length)];
    router.push(`/filme/${pick.movie.id}`);
  };

  return (
    <TabScroll refreshing={refreshing} onRefresh={refresh}>
      <View className="flex-row items-center justify-between px-5 pb-2">
        <View className="flex-row items-center gap-1">
          <Text className="text-xl font-bold uppercase tracking-tighter text-foreground">Nitrate</Text>
          <View className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-orange" />
        </View>
        <Link href="/notificacoes" asChild>
          <Pressable hitSlop={10} accessibilityLabel={`Notificações${unreadCount ? `, ${unreadCount} novas` : ''}`} className="p-1">
            <Ionicons name="notifications-outline" size={23} color={colors.foreground} />
            {unreadCount > 0 && (
              <View className="absolute right-0 top-0 min-w-4 items-center rounded-full bg-brand-orange px-1">
                <Text className="text-[10px] font-bold text-brand-btn-text">{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </Link>
      </View>

      <View className="px-5 pt-4">
        <Text className="text-[26px] font-semibold tracking-tight text-foreground">
          {greeting()}, {user.name.split(' ')[0]}.
        </Text>
        <Text className="mt-1 text-[15px] text-brand-slate">
          {followsSomeone ? 'Veja o que seus amigos andam assistindo.' : 'Veja o que a comunidade anda assistindo.'}
        </Text>
      </View>

      <Section title={followsSomeone ? 'Seus amigos assistiram' : 'Na comunidade'} href={followsSomeone ? '/amigos' : undefined}>
        {!followsSomeone && (
          <View className="-mt-1 mb-4 flex-row items-center gap-2 px-5">
            <Ionicons name="people-outline" size={15} color={colors.slate} />
            <Text className="flex-1 text-sm text-brand-slate">Siga pessoas para ver aqui o que elas assistem.</Text>
          </View>
        )}
        {feed.data && feed.data.length === 0 ? (
          <View className="px-5">
            <EmptyText>Ninguém registrou nenhum filme ainda.</EmptyText>
          </View>
        ) : (
          <MovieRow items={feed.data?.map(reviewToRow)} />
        )}
      </Section>

      {similar.data && similar.data.length > 0 && (
        <Section title="Cinéfilos com gosto parecido">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
            {similar.data.slice(0, 8).map((u) => (
              <Link key={u.username} href={`/u/${u.username}`} asChild>
                <Pressable className="w-36 items-center gap-2 rounded-xl bg-surface px-3 py-4 active:opacity-80">
                  <Avatar name={u.name} username={u.username} size="md" />
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                    {u.name}
                  </Text>
                  <Text className="text-xs text-brand-orange">{u.compatibility}% compatível</Text>
                  <Text className="text-[11px] text-brand-slate">{u.sharedFilms} filmes em comum</Text>
                </Pressable>
              </Link>
            ))}
          </ScrollView>
        </Section>
      )}

      <Section title="Recomendado para você">
        {recommendations.data && recommendations.data.length === 0 ? (
          <View className="px-5">
            <EmptyText>Registre e avalie alguns filmes para receber recomendações.</EmptyText>
          </View>
        ) : (
          <MovieRow
            items={recommendations.data?.map((r) => ({
              key: `rec-${r.movieId}`,
              title: r.title,
              posterPath: r.posterPath,
              href: `/filme/${r.movieId}`,
              caption: r.reasons[0] ?? (r.releaseYear ? String(r.releaseYear) : undefined),
            }))}
          />
        )}
      </Section>

      <Section
        title="Sua watchlist"
        count={user.watchlistCount}
        right={
          watchlist.data && watchlist.data.length > 1 ? (
            <Pressable onPress={pickFromWatchlist} hitSlop={10} className="flex-row items-center gap-1.5">
              <Ionicons name="shuffle" size={15} color={colors.orange} />
              <Text className="text-sm text-brand-orange">O que assistir?</Text>
            </Pressable>
          ) : undefined
        }>
        {watchlist.data && watchlist.data.length === 0 ? (
          <View className="px-5">
            <EmptyText>
              Sua watchlist está vazia. Abra um filme e toque em <Text className="font-semibold text-foreground">Quero assistir</Text>.
            </EmptyText>
          </View>
        ) : (
          <MovieRow items={watchlist.data?.map((item) => movieToRow(item.movie))} />
        )}
      </Section>

      {writtenReviews.length > 0 && (
        <Section title={followsSomeone ? 'Reviews dos amigos' : 'Reviews recentes'}>
          <View className="-mt-4 px-5">
            {writtenReviews.map((review) => (
              <View key={review.id} className="border-b border-foreground/5">
                <ReviewCard review={review} />
              </View>
            ))}
          </View>
        </Section>
      )}

      {trending.data && trending.data.length > 0 && (
        <Section title="Em alta no Nitrate">
          <MovieRow items={trending.data.map(movieToRow)} />
        </Section>
      )}

      <Section title="Descubra algo novo" href="/buscar" linkLabel="Mais">
        <MovieRow items={catalog.data ? discover.map(movieToRow) : undefined} />
      </Section>
    </TabScroll>
  );
}

function Section({
  title,
  count,
  href,
  linkLabel,
  right,
  children,
}: {
  title: string;
  count?: number;
  href?: '/amigos' | '/buscar';
  linkLabel?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-10">
      <View className="px-5">
        <SectionHeading title={title} count={count} href={href} linkLabel={linkLabel} right={right} />
      </View>
      {children}
    </View>
  );
}
