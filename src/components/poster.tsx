import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { posterUrl, type PosterSize } from '@/lib/images';

interface PosterProps {
  title: string;
  posterPath: string | null | undefined;
  /** largura em pontos; sem ela, ocupa a largura do pai */
  width?: number;
  size?: PosterSize;
  href?: Href;
  style?: StyleProp<ViewStyle>;
}

export function Poster({ title, posterPath, width, size = 'w342', href, style }: PosterProps) {
  const src = posterUrl(posterPath, size);

  const content = (
    <View
      className="overflow-hidden rounded-md bg-surface border border-white/10"
      style={[{ aspectRatio: 2 / 3 }, width ? { width } : { width: '100%' }, style]}>
      {src ? (
        <Image
          source={src}
          accessibilityLabel={`Pôster de ${title}`}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          recyclingKey={src}
        />
      ) : (
        <View className="flex-1 items-center justify-center gap-1.5 p-2">
          <Ionicons name="film-outline" size={22} color="rgba(236,237,238,0.25)" />
          <Text className="text-[10px] text-center text-foreground/30" numberOfLines={3}>
            {title}
          </Text>
        </View>
      )}
    </View>
  );

  if (!href) return content;
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={title} className="active:opacity-75">
        {content}
      </Pressable>
    </Link>
  );
}

/** placeholder enquanto os pôsteres carregam */
export function PosterSkeleton({ width }: { width?: number }) {
  return (
    <View
      className="rounded-md bg-surface"
      style={[{ aspectRatio: 2 / 3, opacity: 0.7 }, width ? { width } : { width: '100%' }]}
    />
  );
}
