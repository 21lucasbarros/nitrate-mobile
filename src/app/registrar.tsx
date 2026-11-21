import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { Poster } from '@/components/poster';
import { StarInput } from '@/components/stars';
import { Button, ErrorState, Loading } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { confirmAction } from '@/lib/dialogs';
import { isoDay, shiftDay, shortDate, todayIso } from '@/lib/format';
import { useInvalidateMovie } from '@/lib/hooks';
import { toggleBold, toggleItalic, toggleQuote, type TextState } from '@/lib/review-markup';
import { createReview, deleteReview, getMovie, getMovieState, getReview, updateReview } from '@/lib/services';
import { colors } from '@/lib/theme';
import { canRate, type Movie, type MovieReview } from '@/lib/types';

const TEXT_MAX = 20000; // igual ao limite do backend

/** registrar um filme (ou editar a review), aberto como modal a partir da página do filme */
export default function LogScreen() {
  const { movieId, reviewId } = useLocalSearchParams<{ movieId: string; reviewId?: string }>();
  const movie = useQuery({ queryKey: ['movie', Number(movieId)], queryFn: () => getMovie(Number(movieId)) });
  const state = useQuery({ queryKey: ['movie-state', Number(movieId)], queryFn: () => getMovieState(Number(movieId)) });
  const existing = useQuery({
    queryKey: ['review', Number(reviewId)],
    queryFn: () => getReview(Number(reviewId)),
    enabled: !!reviewId,
  });

  if (movie.isPending || state.isPending || (reviewId && existing.isPending)) return <Loading />;
  if (movie.isError || state.isError || existing.isError) {
    return <ErrorState onRetry={() => [movie.refetch(), state.refetch(), existing.refetch()]} />;
  }

  return (
    <ReviewForm
      movie={movie.data}
      existing={reviewId ? (existing.data ?? null) : null}
      previouslyWatched={state.data.reviewsCount > 0}
    />
  );
}

function ReviewForm({ movie, existing, previouslyWatched }: { movie: Movie; existing: MovieReview | null; previouslyWatched: boolean }) {
  const router = useRouter();
  const invalidate = useInvalidateMovie();
  // antes da estreia a review pode ter texto e curtida, mas não nota
  const rateable = canRate(movie);
  const [rating, setRating] = useState<number | null>(rateable ? existing?.rating ?? null : null);
  const [liked, setLiked] = useState(existing?.liked ?? false);
  const [watchedOn, setWatchedOn] = useState(existing?.watchedOn ?? todayIso());
  const [text, setText] = useState(existing?.text ?? '');
  // a seleção só é controlada logo depois de um botão de formatação; no resto, o campo cuida dela
  const selection = useRef({ start: 0, end: 0 });
  const [forcedSelection, setForcedSelection] = useState<{ start: number; end: number } | undefined>();
  const [spoiler, setSpoiler] = useState(existing?.spoiler ?? false);
  const [rewatch, setRewatch] = useState(existing?.rewatch ?? previouslyWatched);
  // a segunda review de um filme no Nitrate é sempre reassistido (o backend garante)
  const rewatchLocked = !existing && previouslyWatched;
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasText = text.trim().length > 0;

  // aberto por link direto não há tela anterior: volta para a página do filme
  const close = () => (router.canGoBack() ? router.back() : router.replace(`/filme/${movie.id}`));
  const today = todayIso();

  const save = async () => {
    setBusy('save');
    setError(null);
    const data = {
      rating,
      liked,
      watchedOn,
      text: text.trim() || null,
      spoiler: hasText && spoiler,
      rewatch: rewatch || rewatchLocked,
    };
    try {
      if (existing) await updateReview(existing.id, data);
      else await createReview({ ...data, movieId: movie.id });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      invalidate(movie.id);
      close();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível salvar. Tente novamente.'));
      setBusy(null);
    }
  };

  const remove = () => {
    if (!existing) return;
    confirmAction('Apagar review?', `Sua review de ${movie.title} será apagada.`, 'Apagar', async () => {
      setBusy('delete');
      try {
        await deleteReview(existing.id);
        invalidate(movie.id);
        close();
      } catch {
        setError('Não foi possível apagar. Tente novamente.');
        setBusy(null);
      }
    });
  };

  const format = (fn: (s: TextState) => TextState) => {
    const next = fn({ text, ...selection.current });
    setText(next.text);
    selection.current = { start: next.start, end: next.end };
    setForcedSelection(selection.current);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: existing ? 'Editar review' : previouslyWatched ? 'Assisti de novo' : 'Eu assisti',
          headerLeft: () => (
            <Pressable onPress={close} hitSlop={10}>
              <Text className="text-base text-brand-slate">Cancelar</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background" keyboardVerticalOffset={80}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 24 }}>
          <View className="flex-row items-center gap-4">
            <Poster title={movie.title} posterPath={movie.posterPath} width={56} size="w185" />
            <View className="min-w-0 flex-1">
              <Text className="font-serif text-2xl leading-7 text-foreground" numberOfLines={2}>
                {movie.title}
              </Text>
              {movie.releaseYear && <Text className="mt-0.5 text-brand-slate">{movie.releaseYear}</Text>}
            </View>
          </View>

          <View className="gap-5 border-y border-foreground/10 py-5">
            <View className="flex-row items-end justify-between">
              <View className="gap-2">
                <Label>Nota</Label>
                {rateable ? (
                  <StarInput value={rating} onChange={setRating} size={34} />
                ) : (
                  <View className="min-h-[38px] flex-row items-center gap-2">
                    <Ionicons name="calendar-outline" size={16} color={colors.slate} />
                    <Text className="text-sm text-brand-slate">
                      {movie.releaseDate ? `Liberada na estreia, em ${shortDate(movie.releaseDate)}` : 'Liberada quando o filme estrear'}
                    </Text>
                  </View>
                )}
              </View>
              <View className="items-center gap-2">
                <Label>Curtir</Label>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setLiked(!liked);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: liked }}
                  accessibilityLabel={liked ? 'Descurtir' : 'Curtir'}
                  hitSlop={8}>
                  <Ionicons name="heart" size={34} color={liked ? colors.orange : 'rgba(154,158,165,0.25)'} />
                </Pressable>
              </View>
            </View>

            <View className="gap-2">
              <Label>Assistido em</Label>
              <View className="flex-row items-center gap-2">
                <Chip label="Hoje" selected={watchedOn === today} onPress={() => setWatchedOn(today)} />
                <Chip label="Ontem" selected={watchedOn === isoDay(-1)} onPress={() => setWatchedOn(isoDay(-1))} />
                <View className="ml-auto flex-row items-center rounded-full bg-surface">
                  <Pressable onPress={() => setWatchedOn(shiftDay(watchedOn, -1))} className="px-3 py-2" accessibilityLabel="Dia anterior" hitSlop={4}>
                    <Ionicons name="chevron-back" size={16} color={colors.foreground} />
                  </Pressable>
                  <Text className="min-w-[96px] text-center text-sm text-foreground">{shortDate(watchedOn)}</Text>
                  <Pressable
                    onPress={() => setWatchedOn(shiftDay(watchedOn, 1))}
                    disabled={watchedOn >= today}
                    className={`px-3 py-2 ${watchedOn >= today ? 'opacity-30' : ''}`}
                    accessibilityLabel="Dia seguinte"
                    hitSlop={4}>
                    <Ionicons name="chevron-forward" size={16} color={colors.foreground} />
                  </Pressable>
                </View>
              </View>
            </View>

            <ToggleRow
              icon="repeat"
              label={rewatchLocked ? 'Reassistido (você já registrou este filme)' : 'Já tinha assistido antes'}
              value={rewatch || rewatchLocked}
              onChange={setRewatch}
              disabled={rewatchLocked}
              color={colors.orange}
            />
          </View>

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Label>Review</Label>
              <View className="flex-row gap-1">
                <FormatButton icon="text" label="Negrito" bold onPress={() => format(toggleBold)} />
                <FormatButton icon="text" label="Itálico" italic onPress={() => format(toggleItalic)} />
                <FormatButton icon="chatbox-ellipses-outline" label="Citação" onPress={() => format(toggleQuote)} />
              </View>
            </View>
            <TextInput
              value={text}
              onChangeText={setText}
              selection={forcedSelection}
              onSelectionChange={({ nativeEvent }) => {
                selection.current = nativeEvent.selection;
                if (forcedSelection) setForcedSelection(undefined);
              }}
              multiline
              maxLength={TEXT_MAX}
              placeholder="Escreva sua review… (opcional)"
              placeholderTextColor="rgba(154,158,165,0.5)"
              selectionColor={colors.orange}
              textAlignVertical="top"
              className="min-h-[180px] rounded-xl border border-foreground/10 bg-surface px-4 py-3.5 font-serif-regular text-[17px] leading-7 text-foreground"
            />
            <Text className="text-xs text-brand-slate/60">**negrito**, _itálico_ e &gt; citação</Text>
          </View>

          <ToggleRow
            icon="warning-outline"
            label="Contém spoilers"
            value={hasText && spoiler}
            onChange={setSpoiler}
            disabled={!hasText}
            color={colors.crimson}
          />

          {error && (
            <View className="rounded-xl border border-brand-crimson/30 bg-brand-crimson/10 px-4 py-3">
              <Text className="text-sm text-brand-crimson">{error}</Text>
            </View>
          )}

          <Button label={existing ? 'Salvar' : 'Registrar'} onPress={save} loading={busy === 'save'} disabled={busy !== null} />
          {existing && (
            <Button label="Apagar review" variant="danger" icon="trash-outline" onPress={remove} loading={busy === 'delete'} disabled={busy !== null} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Label({ children }: { children: string }) {
  return <Text className="text-[11px] uppercase tracking-[1.5px] text-brand-slate/70">{children}</Text>;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`rounded-full px-3.5 py-2 ${selected ? 'bg-foreground' : 'bg-surface'}`}>
      <Text className={`text-sm font-medium ${selected ? 'text-background' : 'text-brand-slate'}`}>{label}</Text>
    </Pressable>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onChange,
  disabled,
  color,
}: {
  icon: 'repeat' | 'warning-outline';
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  color: string;
}) {
  return (
    <View className={`flex-row items-center gap-3 ${disabled ? 'opacity-50' : ''}`}>
      <Ionicons name={icon} size={18} color={value ? color : colors.slate} />
      <Text className="flex-1 text-[15px] text-foreground/85">{label}</Text>
      <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: color, false: colors.surfaceStrong }} thumbColor="#fff" />
    </View>
  );
}

function FormatButton({
  icon,
  label,
  bold,
  italic,
  onPress,
}: {
  icon: 'text' | 'chatbox-ellipses-outline';
  label: string;
  bold?: boolean;
  italic?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} className="h-8 w-9 items-center justify-center rounded-md bg-surface active:bg-surface-strong">
      {bold || italic ? (
        <Text className={`text-[15px] text-foreground ${bold ? 'font-bold' : 'font-serif-italic'}`}>{bold ? 'B' : 'I'}</Text>
      ) : (
        <Ionicons name={icon} size={16} color={colors.foreground} />
      )}
    </Pressable>
  );
}
