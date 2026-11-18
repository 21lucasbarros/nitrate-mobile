import { Link, useRouter, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { toRating } from '@/lib/format';
import type { Activity, MovieReview } from '@/lib/types';

import { Avatar } from './avatar';
import { Poster } from './poster';
import { ReviewText } from './review-text';
import { StarRating } from './stars';

/** "assistiu", "reassistiu, curtiu e avaliou"... (igual ao web) */
function reviewVerbs(review: MovieReview): string {
  const verbs = [review.rewatch ? 'reassistiu' : 'assistiu'];
  if (review.liked) verbs.push('curtiu');
  if (review.rating !== null) verbs.push('avaliou');
  return verbs.length === 1 ? verbs[0] : `${verbs.slice(0, -1).join(', ')} e ${verbs[verbs.length - 1]}`;
}

/** tempo curto, como nos apps: "agora", "12min", "11h", "4d", "3sem" */
function shortAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}sem`;
}

/** uma linha do feed de amigos */
export function ActivityItem({ item, myUsername }: { item: Activity; myUsername?: string }) {
  const router = useRouter();
  const strong = 'font-semibold text-foreground';

  const owner = (review: MovieReview) =>
    review.user.username === myUsername ? 'a sua review' : `a review de ${review.user.name}`;

  let sentence: React.ReactNode = null;
  let movie: { title: string; posterPath: string | null; href: Href } | null = null;
  let target: Href | null = null;

  switch (item.type) {
    case 'REVIEW': {
      const r = item.review!;
      sentence = (
        <>
          {reviewVerbs(r)} <Text className={strong}>{r.movie.title}</Text>
        </>
      );
      movie = { title: r.movie.title, posterPath: r.movie.posterPath, href: `/filme/${r.movie.id}` };
      target = `/review/${r.id}`;
      break;
    }
    case 'WATCHLIST':
      sentence = (
        <>
          adicionou <Text className={strong}>{item.movie!.title}</Text> à watchlist
        </>
      );
      movie = { title: item.movie!.title, posterPath: item.movie!.posterPath, href: `/filme/${item.movie!.id}` };
      target = `/filme/${item.movie!.id}`;
      break;
    case 'LIST':
      sentence = (
        <>
          criou a lista <Text className={strong}>{item.list!.name}</Text>
          <Text className="text-brand-slate/70">{` · ${item.list!.filmsCount} ${item.list!.filmsCount === 1 ? 'filme' : 'filmes'}`}</Text>
        </>
      );
      target = `/lista/${item.list!.id}`;
      break;
    case 'REVIEW_LIKE': {
      const r = item.review!;
      sentence = (
        <>
          curtiu {owner(r)} de <Text className={strong}>{r.movie.title}</Text>
        </>
      );
      movie = { title: r.movie.title, posterPath: r.movie.posterPath, href: `/filme/${r.movie.id}` };
      target = `/review/${r.id}`;
      break;
    }
    case 'COMMENT': {
      const r = item.review!;
      sentence = (
        <>
          comentou n{owner(r)} de <Text className={strong}>{r.movie.title}</Text>
        </>
      );
      movie = { title: r.movie.title, posterPath: r.movie.posterPath, href: `/filme/${r.movie.id}` };
      target = `/review/${r.id}`;
      break;
    }
    case 'FOLLOW':
      sentence = (
        <>
          começou a seguir{' '}
          <Text className={strong}>{item.target!.username === myUsername ? 'você' : item.target!.name}</Text>
        </>
      );
      target = `/u/${item.target!.username}`;
      break;
  }

  const review = item.type === 'REVIEW' ? item.review : null;

  return (
    <Pressable
      onPress={() => target && router.push(target)}
      className="flex-row gap-3 border-b border-foreground/5 px-5 py-4 active:bg-surface">
      <Link href={`/u/${item.user.username}`} asChild>
        <Pressable hitSlop={6}>
          <Avatar name={item.user.name} username={item.user.username} size="sm" />
        </Pressable>
      </Link>

      <View className="min-w-0 flex-1">
        <Text className="text-[15px] leading-[21px] text-brand-slate">
          <Text className={strong}>{item.user.username === myUsername ? 'Você' : item.user.name}</Text> {sentence}
          <Text className="text-xs text-brand-slate/60">{`  ${shortAgo(item.at)}`}</Text>
        </Text>
        {review && review.rating !== null && (
          <View className="mt-1.5">
            <StarRating rating={toRating(review.rating)} size={12} />
          </View>
        )}
        {review?.text && !review.spoiler && (
          <View className="mt-2">
            <ReviewText text={review.text} lines={3} />
          </View>
        )}
        {item.type === 'COMMENT' && item.comment && (
          <Text className="mt-1.5 text-[15px] italic text-foreground/70" numberOfLines={2}>
            “{item.comment}”
          </Text>
        )}
      </View>

      {movie && <Poster title={movie.title} posterPath={movie.posterPath} width={44} size="w185" href={movie.href} />}
    </Pressable>
  );
}
