import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Poster } from '@/components/poster';
import { ReviewText } from '@/components/review-text';
import { StarRating } from '@/components/stars';
import { ErrorState, Loading, SectionHeading } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { confirmAction, showError } from '@/lib/dialogs';
import { shortDate, timeAgo, toRating } from '@/lib/format';
import { useMe } from '@/lib/hooks';
import {
  addReviewComment,
  deleteReviewComment,
  getReview,
  getReviewComments,
  getReviewEngagement,
  likeReview,
  unlikeReview,
} from '@/lib/services';
import { canShareStories } from '@/lib/story-share';
import { colors } from '@/lib/theme';
import type { ReviewEngagement } from '@/lib/types';

const COMMENT_MAX = 1000;

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewId = Number(id);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  const me = useMe().data;

  const review = useQuery({ queryKey: ['review', reviewId], queryFn: () => getReview(reviewId) });
  const engagementKey = ['review-engagement', reviewId];
  const engagement = useQuery({ queryKey: engagementKey, queryFn: () => getReviewEngagement(reviewId) });
  const comments = useQuery({ queryKey: ['review-comments', reviewId], queryFn: () => getReviewComments(reviewId) });

  const [revealed, setRevealed] = useState(false);
  const [comment, setComment] = useState('');

  // curtida otimista: o coração muda na hora e volta se der erro
  const like = useMutation({
    mutationFn: (liked: boolean) => (liked ? likeReview(reviewId) : unlikeReview(reviewId)),
    onMutate: (liked) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const previous = queryClient.getQueryData<ReviewEngagement>(engagementKey);
      if (previous) {
        queryClient.setQueryData<ReviewEngagement>(engagementKey, {
          ...previous,
          likedByMe: liked,
          likesCount: previous.likesCount + (liked ? 1 : -1),
        });
      }
      return { previous };
    },
    onError: (_err, _liked, context) => queryClient.setQueryData(engagementKey, context?.previous),
    onSuccess: (data) => queryClient.setQueryData(engagementKey, data),
  });

  const send = useMutation({
    mutationFn: (text: string) => addReviewComment(reviewId, text),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['review-comments', reviewId] });
      queryClient.invalidateQueries({ queryKey: engagementKey });
    },
    onError: (err) => showError('Não foi possível comentar', errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (commentId: number) => deleteReviewComment(reviewId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-comments', reviewId] });
      queryClient.invalidateQueries({ queryKey: engagementKey });
    },
  });

  if (review.isPending) return <Loading hint />;
  if (review.isError) return <ErrorState message="Review não encontrada." onRetry={() => review.refetch()} />;

  const r = review.data;
  const isOwn = me?.username === r.user.username;
  const hideText = r.spoiler && !isOwn && !revealed;
  const liked = engagement.data?.likedByMe ?? false;

  const edit = () => router.push({ pathname: '/registrar', params: { movieId: String(r.movie.id), reviewId: String(r.id) } });
  const shareStory = () =>
    router.push({ pathname: '/compartilhar-story', params: { movieId: String(r.movie.id), reviewId: String(r.id) } });

  // no web não há figurinha: o menu vira só o editar
  const openMenu = () => {
    if (!canShareStories) return edit();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Compartilhar nos Stories', 'Editar review', 'Cancelar'], cancelButtonIndex: 2 },
        (index) => (index === 0 ? shareStory() : index === 1 ? edit() : undefined),
      );
    } else {
      Alert.alert('Sua review', undefined, [
        { text: 'Compartilhar nos Stories', onPress: shareStory },
        { text: 'Editar review', onPress: edit },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  const confirmDelete = (commentId: number) =>
    confirmAction('Apagar comentário?', undefined, 'Apagar', () => remove.mutate(commentId));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background" keyboardVerticalOffset={90}>
      {isOwn && (
        <Stack.Screen
          options={{
            headerRight: () => (
              <Pressable onPress={openMenu} hitSlop={10} accessibilityLabel="Mais opções">
                <Ionicons name="ellipsis-horizontal-circle-outline" size={24} color={colors.foreground} />
              </Pressable>
            ),
          }}
        />
      )}
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Link href={`/u/${r.user.username}`} asChild>
          <Pressable className="flex-row items-center gap-2.5 active:opacity-70">
            <Avatar name={r.user.name} username={r.user.username} size="sm" />
            <Text className="text-sm text-brand-slate">
              Review de <Text className="font-semibold text-foreground">{r.user.name}</Text>
            </Text>
          </Pressable>
        </Link>

        <View className="mt-5 flex-row gap-4">
          <View className="min-w-0 flex-1">
            <Link href={`/filme/${r.movie.id}`} asChild>
              <Pressable>
                <Text className="font-serif text-[28px] leading-8 text-foreground">
                  {r.movie.title}
                  {r.movie.releaseYear ? <Text className="font-normal text-base text-brand-slate">{`  ${r.movie.releaseYear}`}</Text> : null}
                </Text>
              </Pressable>
            </Link>
            <View className="mt-3 flex-row flex-wrap items-center gap-2.5">
              {r.rating !== null && <StarRating rating={toRating(r.rating)} size={16} />}
              {r.liked && <Ionicons name="heart" size={15} color={colors.orange} />}
              {r.rewatch && (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="repeat" size={14} color={colors.emerald} />
                  <Text className="text-xs font-medium text-brand-emerald">reassistido</Text>
                </View>
              )}
            </View>
            <Text className="mt-2 text-sm text-brand-slate">Assistido em {shortDate(r.watchedOn)}</Text>
          </View>
          <Poster title={r.movie.title} posterPath={r.movie.posterPath} width={84} size="w342" href={`/filme/${r.movie.id}`} />
        </View>

        {r.text && (
          <View className="mt-7">
            {hideText ? (
              <Pressable
                onPress={() => setRevealed(true)}
                className="flex-row items-center gap-3 rounded-xl border border-dashed border-brand-crimson/40 bg-brand-crimson/5 px-4 py-3.5">
                <Ionicons name="warning-outline" size={20} color={colors.crimson} />
                <Text className="flex-1 text-sm text-brand-slate">Esta review contém spoilers.</Text>
                <Text className="text-sm font-medium text-brand-crimson">Mostrar</Text>
              </Pressable>
            ) : (
              <>
                {r.spoiler && (
                  <Text className="mb-2 text-[11px] font-bold uppercase tracking-[2px] text-brand-crimson">Spoiler</Text>
                )}
                <ReviewText text={r.text} />
              </>
            )}
          </View>
        )}

        <View className="mt-7 flex-row items-center gap-5 border-y border-foreground/10 py-3">
          <Pressable
            onPress={() => like.mutate(!liked)}
            disabled={isOwn || !engagement.data}
            accessibilityRole="button"
            accessibilityState={{ selected: liked }}
            className="flex-row items-center gap-1.5"
            hitSlop={8}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? colors.orange : colors.slate} />
            <Text className="text-sm text-brand-slate">
              {engagement.data?.likesCount ?? 0} {engagement.data?.likesCount === 1 ? 'curtida' : 'curtidas'}
            </Text>
          </Pressable>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="chatbubble-outline" size={18} color={colors.slate} />
            <Text className="text-sm text-brand-slate">{engagement.data?.commentsCount ?? 0}</Text>
          </View>
          <Text className="ml-auto text-xs text-brand-slate/60">{timeAgo(r.createdAt)}</Text>
        </View>

        <View className="mt-8">
          <SectionHeading title="Comentários" count={comments.data?.length} />
          {comments.data?.length === 0 && <Text className="text-brand-slate">Nenhum comentário ainda. Comece a conversa.</Text>}
          {comments.data?.map((c) => {
            // quem comentou e o dono da review podem apagar
            const canDelete = me?.username === c.user.username || isOwn;
            return (
              <Pressable
                key={c.id}
                onLongPress={canDelete ? () => confirmDelete(c.id) : undefined}
                className="flex-row gap-3 border-b border-foreground/5 py-3.5">
                <Link href={`/u/${c.user.username}`} asChild>
                  <Pressable hitSlop={4}>
                    <Avatar name={c.user.name} username={c.user.username} size="sm" />
                  </Pressable>
                </Link>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm">
                    <Text className="font-semibold text-foreground">{c.user.name}</Text>
                    <Text className="text-xs text-brand-slate/60">{`  ${timeAgo(c.createdAt)}`}</Text>
                  </Text>
                  <Text className="mt-1 text-[15px] leading-[22px] text-foreground/85" selectable>
                    {c.text}
                  </Text>
                </View>
                {canDelete && (
                  <Pressable onPress={() => confirmDelete(c.id)} hitSlop={8} accessibilityLabel="Apagar comentário">
                    <Ionicons name="trash-outline" size={16} color={colors.slate} />
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="flex-row items-end gap-2 border-t border-foreground/10 bg-background px-4 pt-3" style={{ paddingBottom: insets.bottom + 10 }}>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Escreva um comentário…"
          placeholderTextColor="rgba(154,158,165,0.5)"
          selectionColor={colors.orange}
          multiline
          maxLength={COMMENT_MAX}
          className="max-h-28 flex-1 rounded-2xl bg-surface px-4 py-2.5 text-[15px] text-foreground"
        />
        <Pressable
          onPress={() => comment.trim() && send.mutate(comment.trim())}
          disabled={!comment.trim() || send.isPending}
          accessibilityLabel="Enviar comentário"
          className={`h-10 w-10 items-center justify-center rounded-full bg-brand-btn ${!comment.trim() || send.isPending ? 'opacity-40' : ''}`}>
          <Ionicons name="arrow-up" size={20} color={colors.btnText} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
