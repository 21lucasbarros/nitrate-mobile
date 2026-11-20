import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { StarRating } from '@/components/stars';
import { Button, ErrorState, Loading } from '@/components/ui';
import { showError } from '@/lib/dialogs';
import { WEB_URL } from '@/lib/config';
import { shortDate, toRating } from '@/lib/format';
import { useMe } from '@/lib/hooks';
import { posterUrl } from '@/lib/images';
import { getMovie, getMovieState, getReview } from '@/lib/services';
import { shareImageFile, shareStickerToStories } from '@/lib/story-share';
import { colors } from '@/lib/theme';
import type { Movie, MovieReview } from '@/lib/types';

// o fundo do story fica com o Instagram (dá para trocar lá); estes são só o ponto de partida
const BACKGROUNDS = [
  { label: 'Noite', top: '#2B2E33', bottom: '#0D0E10' },
  { label: 'Laranja', top: '#FF8A4C', bottom: '#5C1F06' },
  { label: 'Azul', top: '#8FB3FF', bottom: '#18234A' },
] as const;

const STICKER_WIDTH = 200;

/** figurinha sem fundo do filme (pôster, sua nota e o seu @) para colar nos Stories do Instagram */
export default function ShareStoryScreen() {
  // com reviewId, a figurinha é daquela sessão; sem ele, da sua última sessão do filme
  const { movieId, reviewId } = useLocalSearchParams<{ movieId: string; reviewId?: string }>();
  const id = Number(movieId);
  const movie = useQuery({ queryKey: ['movie', id], queryFn: () => getMovie(id) });
  const state = useQuery({ queryKey: ['movie-state', id], queryFn: () => getMovieState(id), enabled: !reviewId });
  const chosen = useQuery({
    queryKey: ['review', Number(reviewId)],
    queryFn: () => getReview(Number(reviewId)),
    enabled: !!reviewId,
  });
  const me = useMe();

  const review = reviewId ? chosen : state;
  if (movie.isError || review.isError) return <ErrorState onRetry={() => (movie.isError ? movie.refetch() : review.refetch())} />;
  if (!movie.data || review.isPending || me.isPending) return <Loading />;
  const shown = reviewId ? (chosen.data ?? null) : (state.data?.review ?? null);
  return <ShareView movie={movie.data} review={shown} username={me.data?.username ?? null} />;
}

function ShareView({ movie, review, username }: { movie: Movie; review: MovieReview | null; username: string | null }) {
  const { width } = useWindowDimensions();
  const sticker = useRef<ComponentRef<typeof View>>(null);
  const [background, setBackground] = useState<(typeof BACKGROUNDS)[number]>(BACKGROUNDS[0]);
  const poster = posterUrl(movie.posterPath, 'w500');
  // o pôster precisa ter carregado antes da captura, senão a figurinha sai sem ele
  const [posterReady, setPosterReady] = useState(!poster);
  const [busy, setBusy] = useState<'stories' | 'image' | null>(null);

  const frameWidth = Math.min(width - 64, 320);

  const capture = () => captureRef(sticker, { format: 'png', quality: 1, result: 'tmpfile' });

  const shareStories = async () => {
    setBusy('stories');
    try {
      const uri = await capture();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await shareStickerToStories(uri, {
        topColor: background.top,
        bottomColor: background.bottom,
        link: WEB_URL && movie.slug ? `${WEB_URL}/film/${movie.slug}` : undefined,
      });
    } catch {
      showError('Não foi possível gerar a figurinha', 'Tente novamente em instantes.');
    } finally {
      setBusy(null);
    }
  };

  const shareImage = async () => {
    setBusy('image');
    try {
      await shareImageFile(await capture());
    } catch {
      showError('Não foi possível gerar a figurinha', 'Tente novamente em instantes.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24, paddingBottom: 48, alignItems: 'center' }}>
      {/* prévia: a figurinha por cima do fundo que vai para o Instagram */}
      <View className="items-center justify-center overflow-hidden rounded-3xl" style={{ width: frameWidth, aspectRatio: 9 / 16 }}>
        <LinearGradient colors={[background.top, background.bottom]} style={StyleSheet.absoluteFill} />
        <View ref={sticker} collapsable={false} style={{ width: STICKER_WIDTH }}>
          <Sticker movie={movie} review={review} username={username} poster={poster} onPosterLoad={() => setPosterReady(true)} />
        </View>
      </View>

      <View className="mt-5 flex-row gap-3" accessibilityRole="radiogroup" accessibilityLabel="Fundo do story">
        {BACKGROUNDS.map((bg) => {
          const selected = bg.label === background.label;
          return (
            <Pressable
              key={bg.label}
              onPress={() => setBackground(bg)}
              accessibilityRole="radio"
              accessibilityLabel={bg.label}
              accessibilityState={{ checked: selected }}
              hitSlop={6}
              className="rounded-full p-0.5"
              style={{ borderWidth: 2, borderColor: selected ? colors.foreground : 'transparent' }}>
              <LinearGradient colors={[bg.top, bg.bottom]} style={{ width: 28, height: 28, borderRadius: 14 }} />
            </Pressable>
          );
        })}
      </View>

      <View className="mt-8 w-full max-w-[360px]">
        <Text className="text-center text-xs font-bold uppercase tracking-[2.5px] text-brand-orange">Sua figurinha</Text>
        <Text className="mt-2 text-center text-2xl font-semibold tracking-tight text-foreground">Mostre o que você assistiu.</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-brand-slate">
          A figurinha vai sem fundo para os Stories: dá para mover, aumentar e trocar o fundo direto no Instagram.
        </Text>
        <Button
          label="Compartilhar nos Stories"
          icon="logo-instagram"
          className="mt-6"
          loading={busy === 'stories'}
          disabled={!posterReady || busy !== null}
          onPress={shareStories}
        />
        <Button
          label="Salvar ou enviar a imagem"
          variant="ghost"
          icon="download-outline"
          className="mt-2"
          loading={busy === 'image'}
          disabled={!posterReady || busy !== null}
          onPress={shareImage}
        />
      </View>
    </ScrollView>
  );
}

/** o que vira PNG: tudo fora do pôster e do cartão fica transparente */
function Sticker({
  movie,
  review,
  username,
  poster,
  onPosterLoad,
}: {
  movie: Movie;
  review: MovieReview | null;
  username: string | null;
  poster: string | null;
  onPosterLoad: () => void;
}) {
  const subtitle = [movie.releaseYear, movie.director].filter(Boolean).join(' · ');

  return (
    <View>
      <View style={styles.poster}>
        {poster ? (
          // Image do react-native (e não expo-image): no Android a captura não enxerga os bitmaps de hardware
          <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode="cover" onLoad={onPosterLoad} onError={onPosterLoad} />
        ) : (
          <View className="flex-1 items-center justify-center p-4">
            <Ionicons name="film-outline" size={32} color="rgba(236,237,238,0.3)" />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text className="font-serif text-[19px] leading-[23px] text-foreground" numberOfLines={3}>
          {movie.title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-[11px] text-brand-slate" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}

        {review && (
          <View className="mt-2.5 flex-row items-center gap-2">
            {review.rating !== null ? (
              <StarRating rating={toRating(review.rating)} size={15} />
            ) : (
              <Text className="text-[11px] text-brand-slate">Assisti em {shortDate(review.watchedOn)}</Text>
            )}
            {review.liked && <Ionicons name="heart" size={14} color={colors.orange} />}
            {review.rewatch && <Ionicons name="repeat" size={15} color={colors.emerald} />}
          </View>
        )}

        <View className="mt-3 flex-row items-center justify-between border-t border-foreground/10 pt-2.5">
          <Text className="flex-1 text-[11px] text-foreground/70" numberOfLines={1}>
            {username ? `@${username}` : ''}
          </Text>
          <Text className="text-[10px] font-bold tracking-[2.5px] text-brand-orange">NITRATE</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  poster: {
    width: STICKER_WIDTH,
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  // sobe um pouco por cima do pôster, como uma etiqueta
  card: {
    marginTop: -22,
    marginHorizontal: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderRadius: 16,
    backgroundColor: colors.charcoal,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});
