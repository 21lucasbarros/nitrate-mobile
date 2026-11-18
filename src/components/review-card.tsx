import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { shortDate, toRating } from '@/lib/format';
import { useMe } from '@/lib/hooks';
import { colors } from '@/lib/theme';
import type { MovieReview } from '@/lib/types';

import { Avatar } from './avatar';
import { Poster } from './poster';
import { ReviewText } from './review-text';
import { StarRating } from './stars';

interface ReviewCardProps {
  review: MovieReview;
  /** esconde o pôster/título (ex.: na página do próprio filme) */
  hideMovie?: boolean;
  /** esconde o autor (ex.: no perfil) */
  hideUser?: boolean;
}

/** a review em lista: toca para abrir a review completa, com curtidas e comentários */
export function ReviewCard({ review, hideMovie = false, hideUser = false }: ReviewCardProps) {
  const { movie, user } = review;
  const me = useMe().data;
  const [revealed, setRevealed] = useState(false);
  // o autor sempre vê a própria review; os outros precisam pedir para ver
  const isOwn = me?.username === user.username;
  const hideText = review.spoiler && !isOwn && !revealed;

  return (
    <View className="flex-row items-start gap-4 py-5">
      {!hideMovie && (
        <Poster title={movie.title} posterPath={movie.posterPath} size="w185" width={60} href={`/filme/${movie.id}`} />
      )}

      <Link href={`/review/${review.id}`} asChild>
        <Pressable className="min-w-0 flex-1 active:opacity-80">
          {!hideMovie && (
            <Text className="font-serif text-xl leading-6 text-foreground" numberOfLines={2}>
              {movie.title}
              {movie.releaseYear ? <Text className="font-normal text-sm text-brand-slate">{`  ${movie.releaseYear}`}</Text> : null}
            </Text>
          )}

          <View className="mt-1.5 flex-row flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {!hideUser && (
              <View className="flex-row items-center gap-1.5">
                <Avatar name={user.name} username={user.username} size="xs" />
                <Text className="text-sm font-semibold text-foreground/90">{user.name}</Text>
              </View>
            )}
            {review.rating !== null && <StarRating rating={toRating(review.rating)} size={13} />}
            {review.liked && <Ionicons name="heart" size={13} color={colors.orange} accessibilityLabel="Curtiu" />}
            {review.rewatch && <Ionicons name="repeat" size={14} color={colors.emerald} accessibilityLabel="Reassistido" />}
            <Text className="text-xs text-brand-slate">{shortDate(review.watchedOn)}</Text>
          </View>

          {review.text && hideText && (
            <Pressable
              onPress={() => setRevealed(true)}
              className="mt-3 flex-row items-center gap-2.5 rounded-xl border border-dashed border-brand-crimson/40 bg-brand-crimson/5 px-3.5 py-3">
              <Ionicons name="warning-outline" size={17} color={colors.crimson} />
              <Text className="flex-1 text-sm text-brand-slate">Contém spoilers.</Text>
              <Text className="text-sm font-medium text-brand-crimson">Mostrar</Text>
            </Pressable>
          )}

          {review.text && !hideText && (
            <View className="mt-2.5">
              {review.spoiler && (
                <Text className="mb-1 text-[10px] font-bold uppercase tracking-[2px] text-brand-crimson">Spoiler</Text>
              )}
              <ReviewText text={review.text} lines={4} />
            </View>
          )}
        </Pressable>
      </Link>
    </View>
  );
}
