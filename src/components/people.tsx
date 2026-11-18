import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { errorMessage } from '@/lib/api';
import { meKey } from '@/lib/hooks';
import { profileUrl } from '@/lib/images';
import { followUser, unfollowUser } from '@/lib/services';
import { colors } from '@/lib/theme';
import type { UserSummary } from '@/lib/types';

import { Avatar } from './avatar';

/** foto de uma pessoa do elenco/equipe (TMDB), redonda */
export function PersonPhoto({ name, profilePath, size = 44 }: { name: string; profilePath: string | null; size?: number }) {
  const src = profileUrl(profilePath);
  return (
    <View
      className="items-center justify-center overflow-hidden bg-surface"
      style={{ width: size, height: size, borderRadius: size / 2 }}>
      {src ? (
        <Image source={src} accessibilityLabel={`Foto de ${name}`} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <Ionicons name="person" size={size * 0.45} color="rgba(236,237,238,0.25)" />
      )}
    </View>
  );
}

/** linha de um perfil do Nitrate (busca, seguidores) */
export function UserRow({ user, detail, chevron = true }: { user: UserSummary; detail?: string; chevron?: boolean }) {
  return (
    <Link href={`/u/${user.username}`} asChild>
      <Pressable className="flex-row items-center gap-3 py-3 active:opacity-70">
        <Avatar name={user.name} username={user.username} size="md" />
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
            {user.name}
          </Text>
          <Text className="text-sm text-brand-slate" numberOfLines={1}>
            @{user.username}
            {detail ? ` · ${detail}` : ''}
          </Text>
        </View>
        {chevron && <Ionicons name="chevron-forward" size={16} color={colors.slate} />}
      </Pressable>
    </Link>
  );
}

/** seguir / deixar de seguir, com resposta imediata na tela */
export function FollowButton({ username, following }: { username: string; following: boolean }) {
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState(following);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (follow: boolean) => (follow ? followUser(username) : unfollowUser(username)),
    onMutate: (follow) => {
      setError(null);
      setOptimistic(follow);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    onError: (err, follow) => {
      setOptimistic(!follow);
      setError(errorMessage(err));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      queryClient.invalidateQueries({ queryKey: meKey });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  return (
    <View className="items-center gap-1">
      <Pressable
        onPress={() => mutation.mutate(!optimistic)}
        disabled={mutation.isPending}
        accessibilityRole="button"
        className={`flex-row items-center gap-1.5 rounded-full px-5 py-2.5 active:opacity-80 ${optimistic ? 'bg-surface-strong' : 'bg-brand-btn'}`}>
        <Ionicons
          name={optimistic ? 'checkmark' : 'person-add-outline'}
          size={15}
          color={optimistic ? colors.foreground : colors.btnText}
        />
        <Text className={`text-sm font-semibold ${optimistic ? 'text-foreground' : 'text-brand-btn-text'}`}>
          {optimistic ? 'Seguindo' : 'Seguir'}
        </Text>
      </Pressable>
      {error && <Text className="text-xs text-brand-crimson">{error}</Text>}
    </View>
  );
}
