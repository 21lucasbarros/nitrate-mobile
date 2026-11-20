import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { PersonPhoto } from '@/components/people';
import { Poster } from '@/components/poster';
import { ReviewCard } from '@/components/review-card';
import { StarInput, StarRating } from '@/components/stars';
import { ActionRow, Button, EmptyText, ErrorState, Loading, SectionHeading } from '@/components/ui';
import { ApiError, errorMessage } from '@/lib/api';
import { showError } from '@/lib/dialogs';
import { WEB_URL } from '@/lib/config';
import { formatScore, plural, shortDate, todayIso, toRating } from '@/lib/format';
import { useInvalidateMovie } from '@/lib/hooks';
import { backdropUrl, logoUrl } from '@/lib/images';
import { canShareStories } from '@/lib/story-share';
import {
  addToWatchlist,
  createReview,
  getMovie,
  getMovieCredits,
  getMovieReviews,
  getMovieState,
  getMovieStats,
  getWatchProviders,
  removeFromWatchlist,
  updateReview,
} from '@/lib/services';
import { colors } from '@/lib/theme';
import type { CreditPerson, Movie, MovieStats, MovieUserState, ReviewRequest, WatchProviders } from '@/lib/types';

export default function FilmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const movieId = Number(id);
  const movie = useQuery({ queryKey: ['movie', movieId], queryFn: () => getMovie(movieId) });

  if (movie.isPending) return <Loading hint />;
  if (movie.isError) {
    const notFound = movie.error instanceof ApiError && movie.error.status === 404;
    return (
      <ErrorState
        message={notFound ? 'Filme não encontrado.' : 'Não foi possível carregar o filme.'}
        onRetry={notFound ? undefined : () => movie.refetch()}
      />
    );
  }
  return <FilmView film={movie.data} />;
}

function FilmView({ film }: { film: Movie }) {
  const credits = useQuery({ queryKey: ['movie-credits', film.id], queryFn: () => getMovieCredits(film.id) });
  const stats = useQuery({ queryKey: ['movie-stats', film.id], queryFn: () => getMovieStats(film.id) });
  const reviews = useQuery({ queryKey: ['movie-reviews', film.id], queryFn: () => getMovieReviews(film.id) });
  const providers = useQuery({ queryKey: ['movie-providers', film.id], queryFn: () => getWatchProviders(film.id) });
  const myState = useQuery({ queryKey: ['movie-state', film.id], queryFn: () => getMovieState(film.id) });
  const [overviewOpen, setOverviewOpen] = useState(false);
  const router = useRouter();

  const backdrop = backdropUrl(credits.data?.backdropPath);
  const directors = credits.data?.directors ?? [];
  const director = directors[0];
  const myReview = myState.data?.review ?? null;
  const otherReviews = (reviews.data ?? []).filter((r) => r.id !== myReview?.id);

  const share = () => {
    const url = WEB_URL && film.slug ? `${WEB_URL}/film/${film.slug}` : undefined;
    const message = `${film.title}${film.releaseYear ? ` (${film.releaseYear})` : ''} no Nitrate`;
    Share.share(url ? { message: `${message}\n${url}`, url } : { message }).catch(() => {});
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View className="flex-row items-center gap-5">
              {canShareStories && (
                <Pressable
                  onPress={() => router.push({ pathname: '/compartilhar-story', params: { movieId: String(film.id) } })}
                  hitSlop={10}
                  accessibilityLabel="Compartilhar nos Stories">
                  <Ionicons name="logo-instagram" size={21} color={colors.foreground} />
                </Pressable>
              )}
              <Pressable onPress={share} hitSlop={10} accessibilityLabel="Compartilhar">
                <Ionicons name="share-outline" size={22} color={colors.foreground} />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 64 }}>
        {/* a cena do filme no topo, desbotando para o fundo */}
        <View style={{ height: backdrop ? 360 : 140 }}>
          {backdrop && (
            <Image source={backdrop} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" transition={300} />
          )}
          <LinearGradient
            colors={['rgba(20,21,23,0.55)', 'rgba(20,21,23,0.1)', colors.background]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View className="-mt-28 flex-row items-end gap-4 px-5">
          <View className="min-w-0 flex-1 pb-1">
            <Text className="font-serif text-[30px] leading-[34px] text-foreground" selectable>
              {film.title}
            </Text>
            <Text className="mt-3 text-[11px] uppercase tracking-[2px] text-brand-slate">
              {[film.releaseYear, director || film.director ? 'Direção' : null].filter(Boolean).join(' · ')}
            </Text>
            {director ? (
              <Link href={`/pessoa/${director.tmdbId}`} asChild>
                <Pressable hitSlop={6}>
                  <Text className="mt-0.5 font-semibold text-foreground/90">{director.name}</Text>
                </Pressable>
              </Link>
            ) : (
              film.director && <Text className="mt-0.5 font-semibold text-foreground/90">{film.director}</Text>
            )}
            {film.genres.length > 0 && (
              <View className="mt-3 flex-row flex-wrap gap-1.5">
                {film.genres.slice(0, 3).map((genre) => (
                  <View key={genre} className="rounded-full bg-surface px-2.5 py-1">
                    <Text className="text-[11px] text-brand-slate">{genre}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={{ width: 116, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } }}>
            <Poster title={film.title} posterPath={film.posterPath} size="w342" width={116} />
          </View>
        </View>

        {(credits.data?.tagline || film.overview) && (
          <Pressable className="mt-7 px-5" onPress={() => setOverviewOpen(!overviewOpen)} disabled={!film.overview}>
            {credits.data?.tagline && (
              <Text className="text-xs uppercase tracking-[2px] text-brand-orange">{credits.data.tagline}</Text>
            )}
            {film.overview && (
              <Text className="mt-2 text-[15px] leading-[23px] text-foreground/80" numberOfLines={overviewOpen ? undefined : 4}>
                {film.overview}
              </Text>
            )}
          </Pressable>
        )}

        {stats.data && (
          <View className="mt-7 border-y border-foreground/10 px-5 py-6">
            <RatingsHistogram stats={stats.data} myRating={myReview?.rating ?? null} />
          </View>
        )}

        <View className="px-5 pt-6">
          {myState.data ? (
            <ActionPanel film={film} state={myState.data} />
          ) : myState.isError ? (
            <ErrorState message="Não foi possível carregar o seu registro." onRetry={() => myState.refetch()} />
          ) : (
            <View className="h-72 rounded-2xl bg-surface opacity-60" />
          )}
        </View>

        <CastList cast={credits.data?.cast} />
        <FactSheet film={film} directors={directors} />

        <View className="mt-10 px-5">
          <SectionHeading title="Onde assistir" />
          {providers.data ? (
            <WhereToWatch providers={providers.data} />
          ) : (
            <EmptyText>{providers.isError ? 'Não foi possível carregar.' : 'Carregando…'}</EmptyText>
          )}
        </View>

        <View className="mt-10 px-5">
          <SectionHeading title="Reviews" count={reviews.data?.length} />
          {myReview && (
            <View className="-mt-4 border-b border-foreground/10">
              <ReviewCard review={myReview} hideMovie />
            </View>
          )}
          {otherReviews.map((review) => (
            <View key={review.id} className="border-b border-foreground/5">
              <ReviewCard review={review} hideMovie />
            </View>
          ))}
          {reviews.data && reviews.data.length === 0 && <EmptyText>Ninguém registrou este filme ainda.</EmptyText>}
        </View>
      </ScrollView>
    </>
  );
}

/** nota rápida, o que você já fez com o filme e os atalhos para registrar (o painel lateral do web) */
function ActionPanel({ film, state }: { film: Movie; state: MovieUserState }) {
  const router = useRouter();
  const invalidate = useInvalidateMovie();
  const review = state.review;
  const watched = state.reviewsCount > 0;
  const liked = review?.liked ?? false;

  // salva direto da página, sem abrir o formulário: atualiza a última review ou cria um registro de hoje
  const quickSave = useMutation({
    mutationFn: (changes: Partial<ReviewRequest>) =>
      review
        ? updateReview(review.id, {
            rating: review.rating,
            text: review.text,
            liked: review.liked,
            rewatch: review.rewatch,
            spoiler: review.spoiler,
            watchedOn: review.watchedOn,
            ...changes,
          })
        : createReview({
            movieId: film.id,
            rating: null,
            text: null,
            liked: false,
            rewatch: false,
            spoiler: false,
            watchedOn: todayIso(),
            ...changes,
          }),
    onSuccess: () => invalidate(film.id),
    onError: (err) => showError('Não foi possível salvar', errorMessage(err)),
  });

  const watchlist = useMutation({
    mutationFn: async () => {
      if (state.inWatchlist) await removeFromWatchlist(film.id);
      else await addToWatchlist(film.id);
    },
    onMutate: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
    onSuccess: () => invalidate(film.id),
    onError: (err) => showError('Não foi possível atualizar a watchlist', errorMessage(err)),
  });

  const openForm = (mode: 'new' | 'edit') =>
    router.push({ pathname: '/registrar', params: { movieId: String(film.id), ...(mode === 'edit' && review ? { reviewId: String(review.id) } : {}) } });

  return (
    <View className="overflow-hidden rounded-2xl bg-surface">
      <View className="p-5">
        <Text className="text-[11px] uppercase tracking-[2px] text-brand-slate">Sua nota</Text>
        <View className="mt-3">
          <StarInput value={review?.rating ?? null} onChange={(rating) => quickSave.mutate({ rating })} disabled={quickSave.isPending} />
        </View>
        {review?.watchedOn && (
          <View className="mt-4 flex-row items-center gap-1.5">
            {state.reviewsCount > 1 && <Ionicons name="repeat" size={13} color={colors.emerald} />}
            <Text className="text-xs text-brand-slate">
              {state.reviewsCount > 1 ? `${state.reviewsCount} sessões · última em ` : 'Assistido em '}
              {shortDate(review.watchedOn)}
            </Text>
          </View>
        )}
      </View>

      <View className="border-t border-foreground/5 py-1">
        <ActionRow
          icon={watched ? 'eye' : 'eye-outline'}
          label={watched ? 'Já assisti' : 'Marcar como assistido'}
          active={watched}
          activeColor={colors.emerald}
          onPress={() => openForm('new')}
        />
        <ActionRow
          icon={liked ? 'heart' : 'heart-outline'}
          label={liked ? 'Curti' : 'Curtir'}
          active={liked}
          disabled={quickSave.isPending}
          onPress={() => (review ? quickSave.mutate({ liked: !liked }) : openForm('new'))}
        />
        <ActionRow
          icon={state.inWatchlist ? 'bookmark' : 'bookmark-outline'}
          label={state.inWatchlist ? 'Na watchlist' : 'Quero assistir'}
          active={state.inWatchlist}
          activeColor={colors.blue}
          disabled={watchlist.isPending}
          onPress={() => watchlist.mutate()}
        />
        <ActionRow
          icon="list-outline"
          label="Adicionar à lista"
          onPress={() => router.push({ pathname: '/adicionar-a-lista', params: { movieId: String(film.id) } })}
        />
      </View>

      <View className="flex-row gap-2 border-t border-foreground/5 p-3">
        <Button label={watched ? 'Nova sessão' : 'Escrever review'} size="sm" className="flex-1" onPress={() => openForm('new')} />
        {review && <Button label="Editar" variant="ghost" size="sm" onPress={() => openForm('edit')} />}
      </View>
    </View>
  );
}

const HISTOGRAM_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

/** histograma das notas em meias estrelas, com a média ao lado; a barra da sua nota fica laranja */
function RatingsHistogram({ stats, myRating }: { stats: MovieStats; myRating: number | null }) {
  const counts = HISTOGRAM_STEPS.map((step) => stats.ratingDistribution[step.toFixed(1)] ?? 0);
  const max = Math.max(1, ...counts);

  return (
    <View>
      <View className="flex-row items-baseline justify-between">
        <Text className="text-[11px] uppercase tracking-[2px] text-brand-slate">Notas no Nitrate</Text>
        <Text className="text-xs text-brand-slate/70">
          {plural(stats.ratingsCount, 'nota', 'notas')} · {plural(stats.watchedCount, 'assistiu', 'assistiram')}
        </Text>
      </View>
      {stats.averageRating === null ? (
        <Text className="mt-3 text-sm text-brand-slate/70">Ninguém avaliou ainda. Seja a primeira nota.</Text>
      ) : (
        <View className="mt-4 flex-row items-end gap-3">
          <Ionicons name="star" size={11} color={colors.orange} style={{ marginBottom: 2 }} />
          <View className="h-16 flex-1 flex-row items-end" style={{ gap: 3 }} accessibilityLabel="Distribuição das notas">
            {counts.map((count, i) => (
              <View
                key={HISTOGRAM_STEPS[i]}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${Math.max(4, (count / max) * 100)}%`,
                  backgroundColor: myRating === HISTOGRAM_STEPS[i] ? colors.orange : 'rgba(154,158,165,0.35)',
                }}
              />
            ))}
          </View>
          <View className="items-end">
            <Text className="text-3xl font-light text-foreground">{formatScore(stats.averageRating)}</Text>
            <View className="mt-1">
              <StarRating rating={toRating(stats.averageRating)} size={9} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function CastList({ cast }: { cast: CreditPerson[] | undefined }) {
  if (cast !== undefined && cast.length === 0) return null;
  return (
    <View className="mt-10">
      <View className="px-5">
        <SectionHeading title="Elenco" count={cast?.length || undefined} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
        {(cast ?? Array.from({ length: 6 }, () => null)).map((person, i) =>
          person ? (
            <Link key={`${person.tmdbId}-${i}`} href={`/pessoa/${person.tmdbId}`} asChild>
              <Pressable className="w-20 items-center active:opacity-70">
                <PersonPhoto name={person.name} profilePath={person.profilePath} size={68} />
                <Text className="mt-2 text-center text-xs text-foreground/90" numberOfLines={2}>
                  {person.name}
                </Text>
                {person.role && (
                  <Text className="mt-0.5 text-center text-[11px] text-brand-slate" numberOfLines={2}>
                    {person.role}
                  </Text>
                )}
              </Pressable>
            </Link>
          ) : (
            <View key={i} className="h-[68px] w-[68px] rounded-full bg-surface" />
          ),
        )}
      </ScrollView>
    </View>
  );
}

/** ficha técnica: os dados do filme em blocos, cada um com o rótulo em cima */
function FactSheet({ film, directors }: { film: Movie; directors: CreditPerson[] }) {
  const facts: { label: string; value: string }[] = [];
  const directorNames = directors.length > 0 ? directors.map((d) => d.name).join(', ') : film.director;
  if (directorNames) facts.push({ label: 'Direção', value: directorNames });
  if (film.releaseYear) facts.push({ label: 'Lançamento', value: String(film.releaseYear) });
  if (film.genres.length > 0) facts.push({ label: 'Gêneros', value: film.genres.join(', ') });
  if (film.franchise) facts.push({ label: 'Franquia', value: film.franchise });
  if (film.rating !== null) facts.push({ label: 'Nota TMDB', value: `${film.rating.toFixed(1)} /10` });
  if (facts.length === 0) return null;

  return (
    <View className="mt-10 px-5">
      <SectionHeading title="Ficha técnica" />
      <View className="flex-row flex-wrap" style={{ rowGap: 20 }}>
        {facts.map((fact) => (
          <View key={fact.label} className="w-1/2 border-l-2 border-brand-orange/50 pl-3 pr-2">
            <Text className="text-[11px] uppercase tracking-[1.5px] text-brand-slate">{fact.label}</Text>
            <Text className="mt-1.5 text-sm text-foreground/90">{fact.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** onde assistir no Brasil (JustWatch, via TMDB) */
function WhereToWatch({ providers }: { providers: WatchProviders }) {
  const groups = [
    { label: 'Streaming', items: providers.streaming },
    { label: 'Grátis', items: providers.free },
    { label: 'Alugar', items: providers.rent },
    { label: 'Comprar', items: providers.buy },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) return <EmptyText>Não está disponível em nenhum serviço no Brasil agora.</EmptyText>;

  return (
    <View className="gap-4">
      {groups.map((group) => (
        <View key={group.label}>
          <Text className="mb-2 text-xs text-brand-slate">{group.label}</Text>
          <View className="flex-row flex-wrap gap-2">
            {group.items.map((p) => {
              const logo = logoUrl(p.logoPath);
              return logo ? (
                <Image key={p.id} source={logo} accessibilityLabel={p.name} style={{ width: 40, height: 40, borderRadius: 10 }} />
              ) : (
                <View key={p.id} className="rounded-lg bg-surface px-3 py-2">
                  <Text className="text-xs text-foreground">{p.name}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
      {providers.link && (
        <Pressable onPress={() => WebBrowser.openBrowserAsync(providers.link!)} hitSlop={6}>
          <Text className="text-xs text-brand-slate/70 underline">Dados da JustWatch</Text>
        </Pressable>
      )}
    </View>
  );
}
