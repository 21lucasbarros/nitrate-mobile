import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { monthYear, shortDate, toRating } from '@/lib/format';
import { getFavoritePeople, getProfile, getUserLists, getUserReviews, getUserWatchlist } from '@/lib/services';
import { colors } from '@/lib/theme';
import type { FavoritePeople, Movie, MovieList, MovieReview, UserProfile } from '@/lib/types';

import { Avatar } from './avatar';
import { FAVORITE_PEOPLE_LABELS, FavoritePeopleRow } from './favorite-people';
import { FollowButton } from './people';
import { Poster } from './poster';
import { ReviewCard } from './review-card';
import { StarRating } from './stars';
import { EmptyText, ErrorState, Loading, SectionHeading, Segmented } from './ui';

type Tab = 'diario' | 'reviews' | 'watchlist' | 'listas' | 'favoritos';

type Row =
  | { kind: 'diary'; review: MovieReview }
  | { kind: 'review'; review: MovieReview }
  | { kind: 'posters'; key: string; movies: Movie[] }
  | { kind: 'list'; list: MovieList }
  | { kind: 'favorites'; people: FavoritePeople };

const PAGE_SIZE = 20;
const COLUMNS = 3;

interface ProfileViewProps {
  username: string;
  /** é o perfil de quem está logado */
  own: boolean;
  /** renderizado dentro de uma aba (sem cabeçalho da pilha) */
  inTab?: boolean;
}

export function ProfileView({ username, own, inTab }: ProfileViewProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('diario');

  const profile = useQuery({ queryKey: ['profile', username], queryFn: () => getProfile(username) });
  const diary = useInfiniteQuery({
    queryKey: ['user-reviews', username, tab === 'reviews'],
    queryFn: ({ pageParam }) => getUserReviews(username, pageParam, PAGE_SIZE, tab === 'reviews'),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    enabled: tab === 'diario' || tab === 'reviews',
  });
  const watchlist = useQuery({
    queryKey: ['watchlist', username],
    queryFn: () => getUserWatchlist(username),
    enabled: tab === 'watchlist',
  });
  const lists = useQuery({ queryKey: ['lists', username], queryFn: () => getUserLists(username), enabled: tab === 'listas' });
  const favoritePeople = useQuery({
    queryKey: ['favorite-people', username],
    queryFn: () => getFavoritePeople(username),
    enabled: tab === 'favoritos',
  });

  if (profile.isPending) return <Loading hint />;
  if (profile.isError) return <ErrorState message="Perfil não encontrado." onRetry={() => profile.refetch()} />;

  const user = profile.data;
  const posterWidth = Math.floor((Math.min(width, 700) - 40 - 12 * (COLUMNS - 1)) / COLUMNS);

  let rows: Row[] = [];
  let loading = false;
  if (tab === 'diario' || tab === 'reviews') {
    const reviews = diary.data?.pages.flatMap((p) => p.items) ?? [];
    rows = reviews.map((review) => ({ kind: tab === 'diario' ? 'diary' : 'review', review }));
    loading = diary.isPending;
  } else if (tab === 'watchlist') {
    const movies = watchlist.data?.map((item) => item.movie) ?? [];
    for (let i = 0; i < movies.length; i += COLUMNS) {
      rows.push({ kind: 'posters', key: `w-${i}`, movies: movies.slice(i, i + COLUMNS) });
    }
    loading = watchlist.isPending;
  } else if (tab === 'listas') {
    rows = (lists.data ?? []).map((list) => ({ kind: 'list', list }));
    loading = lists.isPending;
  } else {
    rows = favoritePeople.data ? [{ kind: 'favorites', people: favoritePeople.data }] : [];
    loading = favoritePeople.isPending;
  }

  const emptyText = {
    diario: own ? 'Seu diário está vazio. Abra um filme e registre o que assistiu.' : 'Nenhum filme registrado ainda.',
    reviews: 'Nenhuma review escrita ainda.',
    watchlist: 'A watchlist está vazia.',
    listas: 'Nenhuma lista criada ainda.',
    favoritos: 'Não foi possível carregar os favoritos.',
  }[tab];

  const refresh = () => {
    profile.refetch();
    if (tab === 'diario' || tab === 'reviews') diary.refetch();
    if (tab === 'watchlist') watchlist.refetch();
    if (tab === 'listas') lists.refetch();
    if (tab === 'favoritos') favoritePeople.refetch();
  };

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) =>
        row.kind === 'posters'
          ? row.key
          : row.kind === 'list'
            ? `l-${row.list.id}`
            : row.kind === 'favorites'
              ? 'favorites'
              : `${row.kind}-${row.review.id}`
      }
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: inTab && Platform.OS !== 'ios' ? insets.top : 0, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={profile.isRefetching} onRefresh={refresh} tintColor={colors.slate} />}
      ListHeaderComponent={
        <View>
          <ProfileHeader user={user} own={own} inTab={inTab} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="pb-2 pt-8"
            contentContainerStyle={{ paddingHorizontal: 20 }}>
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'diario', label: 'Diário' },
                { value: 'reviews', label: 'Reviews' },
                { value: 'watchlist', label: 'Watchlist' },
                { value: 'listas', label: 'Listas' },
                { value: 'favoritos', label: 'Favoritos' },
              ]}
            />
          </ScrollView>
        </View>
      }
      renderItem={({ item: row }) => {
        switch (row.kind) {
          case 'diary':
            return <DiaryRow review={row.review} />;
          case 'review':
            return (
              <View className="border-b border-foreground/5 px-5">
                <ReviewCard review={row.review} hideUser />
              </View>
            );
          case 'posters':
            return (
              <View className="flex-row gap-3 px-5 pt-3">
                {row.movies.map((m) => (
                  <Poster key={m.id} title={m.title} posterPath={m.posterPath} width={posterWidth} size="w185" href={`/filme/${m.id}`} />
                ))}
              </View>
            );
          case 'list':
            return <ListRow list={row.list} />;
          case 'favorites':
            return <FavoritesTab user={user} people={row.people} own={own} />;
        }
      }}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if ((tab === 'diario' || tab === 'reviews') && diary.hasNextPage && !diary.isFetchingNextPage) diary.fetchNextPage();
      }}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator className="py-10" color={colors.slate} />
        ) : (
          <View className="px-5 py-6">
            <EmptyText>{emptyText}</EmptyText>
          </View>
        )
      }
      ListFooterComponent={diary.isFetchingNextPage ? <ActivityIndicator className="py-6" color={colors.slate} /> : undefined}
    />
  );
}

function ProfileHeader({ user, own, inTab }: { user: UserProfile; own: boolean; inTab?: boolean }) {
  return (
    <View className="px-5 pt-4">
      {inTab && (
        <View className="mb-2 flex-row justify-end">
          <Link href="/configuracoes" asChild>
            <Pressable hitSlop={10} accessibilityLabel="Configurações">
              <Ionicons name="settings-outline" size={23} color={colors.foreground} />
            </Pressable>
          </Link>
        </View>
      )}

      <View className="flex-row items-center gap-4">
        <Avatar name={user.name} username={user.username} size="lg" />
        <View className="min-w-0 flex-1">
          <Text className="text-2xl font-semibold tracking-tight text-foreground" numberOfLines={2}>
            {user.name}
          </Text>
          <Text className="mt-0.5 text-sm text-brand-slate">
            @{user.username} · desde {monthYear(user.createdAt)}
          </Text>
        </View>
      </View>

      {user.bio && <Text className="mt-4 text-[15px] leading-[22px] text-foreground/80">{user.bio}</Text>}

      {(user.twitter || user.instagram) && (
        <View className="mt-3 flex-row gap-4">
          {user.twitter && (
            <SocialLink icon="logo-twitter" label={`@${user.twitter}`} url={`https://x.com/${user.twitter}`} />
          )}
          {user.instagram && (
            <SocialLink icon="logo-instagram" label={`@${user.instagram}`} url={`https://instagram.com/${user.instagram}`} />
          )}
        </View>
      )}

      <View className="mt-6 flex-row items-center justify-between">
        <View className="flex-row gap-6">
          <Stat value={user.filmsCount} label="filmes" />
          <Link href={{ pathname: '/u/[username]/conexoes', params: { username: user.username, tipo: 'seguidores' } }} asChild>
            <Pressable>
              <Stat value={user.followersCount} label="seguidores" />
            </Pressable>
          </Link>
          <Link href={{ pathname: '/u/[username]/conexoes', params: { username: user.username, tipo: 'seguindo' } }} asChild>
            <Pressable>
              <Stat value={user.followingCount} label="seguindo" />
            </Pressable>
          </Link>
        </View>
        {!own && user.followedByMe !== null && (
          // key: o estado otimista do botão recomeça se o perfil recarregar com outro valor
          <FollowButton key={String(user.followedByMe)} username={user.username} following={user.followedByMe} />
        )}
      </View>

      {user.favorites.length > 0 && (
        <View className="mt-8">
          <Text className="mb-3 text-[11px] font-semibold uppercase tracking-[2px] text-brand-slate">Favoritos</Text>
          <View className="flex-row gap-2">
            {user.favorites.map((m) => (
              <View key={m.id} className="flex-1">
                <Poster title={m.title} posterPath={m.posterPath} size="w185" href={`/filme/${m.id}`} />
              </View>
            ))}
            {/* mantém o tamanho dos pôsteres com menos de 5 favoritos */}
            {Array.from({ length: 5 - user.favorites.length }, (_, i) => (
              <View key={`empty-${i}`} className="flex-1" />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

/** filmes, atores e diretores favoritos; no próprio perfil, cada bloco abre o editor */
function FavoritesTab({ user, people, own }: { user: UserProfile; people: FavoritePeople; own: boolean }) {
  const router = useRouter();
  const edit = (tipo: keyof FavoritePeople) => router.push({ pathname: '/favoritos-pessoas', params: { tipo } });

  return (
    <View className="gap-10 px-5 pt-6">
      <View>
        <SectionHeading title="Filmes favoritos" />
        {user.favorites.length > 0 ? (
          <View className="flex-row gap-2">
            {user.favorites.map((m) => (
              <View key={m.id} className="flex-1">
                <Poster title={m.title} posterPath={m.posterPath} size="w185" href={`/filme/${m.id}`} />
              </View>
            ))}
            {Array.from({ length: 5 - user.favorites.length }, (_, i) => (
              <View key={`empty-${i}`} className="flex-1" />
            ))}
          </View>
        ) : (
          <EmptyText>{own ? 'Você ainda não escolheu filmes favoritos.' : `${user.name} ainda não escolheu filmes favoritos.`}</EmptyText>
        )}
      </View>
      {(['actors', 'directors'] as const).map((kind) => (
        <View key={kind}>
          <SectionHeading
            title={FAVORITE_PEOPLE_LABELS[kind].title}
            right={
              own && people[kind].length > 0 ? (
                <Pressable onPress={() => edit(kind)} hitSlop={10}>
                  <Text className="text-sm text-brand-slate">Editar</Text>
                </Pressable>
              ) : undefined
            }
          />
          {people[kind].length > 0 || own ? (
            <FavoritePeopleRow kind={kind} people={people[kind]} own={own} onEdit={() => edit(kind)} />
          ) : (
            <EmptyText>
              {user.name} ainda não escolheu {FAVORITE_PEOPLE_LABELS[kind].plural} favoritos.
            </EmptyText>
          )}
        </View>
      ))}
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View>
      <Text className="text-lg font-semibold text-foreground">{value.toLocaleString('pt-BR')}</Text>
      <Text className="text-xs text-brand-slate">{label}</Text>
    </View>
  );
}

function SocialLink({ icon, label, url }: { icon: 'logo-twitter' | 'logo-instagram'; label: string; url: string }) {
  return (
    <Pressable onPress={() => WebBrowser.openBrowserAsync(url)} className="flex-row items-center gap-1.5" accessibilityRole="link">
      <Ionicons name={icon} size={15} color={colors.slate} />
      <Text className="text-sm text-brand-slate">{label}</Text>
    </Pressable>
  );
}

/** uma sessão do diário: data, pôster, título e nota */
function DiaryRow({ review }: { review: MovieReview }) {
  const [day, month] = shortDate(review.watchedOn).split(' ');
  return (
    <Link href={`/review/${review.id}`} asChild>
      <Pressable className="flex-row items-center gap-4 border-b border-foreground/5 px-5 py-3 active:bg-surface">
        <View className="w-9 items-center">
          <Text className="text-lg font-semibold text-foreground">{day}</Text>
          <Text className="text-[10px] uppercase text-brand-slate">{month?.replace('.', '')}</Text>
        </View>
        <Poster title={review.movie.title} posterPath={review.movie.posterPath} width={40} size="w185" />
        <View className="min-w-0 flex-1">
          <Text className="font-serif text-[16px] text-foreground" numberOfLines={1}>
            {review.movie.title}
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            {review.rating !== null && <StarRating rating={toRating(review.rating)} size={11} />}
            {review.liked && <Ionicons name="heart" size={11} color={colors.orange} />}
            {review.rewatch && <Ionicons name="repeat" size={12} color={colors.emerald} />}
            {review.text && <Ionicons name="reorder-three" size={14} color={colors.slate} />}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function ListRow({ list }: { list: MovieList }) {
  return (
    <Link href={`/lista/${list.id}`} asChild>
      <Pressable className="border-b border-foreground/5 px-5 py-4 active:bg-surface">
        <View className="flex-row">
          {list.movies.slice(0, 5).map((m, i) => (
            <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -18, zIndex: 5 - i }}>
              <Poster title={m.title} posterPath={m.posterPath} width={56} size="w185" />
            </View>
          ))}
        </View>
        <View className="mt-3 flex-row items-center gap-2">
          <Text className="flex-1 font-serif text-lg text-foreground" numberOfLines={1}>
            {list.name}
          </Text>
          {!list.isPublic && <Ionicons name="lock-closed" size={13} color={colors.slate} />}
        </View>
        <Text className="text-sm text-brand-slate">
          {list.filmsCount} {list.filmsCount === 1 ? 'filme' : 'filmes'}
        </Text>
      </Pressable>
    </Link>
  );
}
