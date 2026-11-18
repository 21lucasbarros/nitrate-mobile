import type { Href } from 'expo-router';
import { FlatList, Text, View } from 'react-native';

import { Poster, PosterSkeleton } from './poster';

export interface RowItem {
  key: string;
  title: string;
  posterPath: string | null;
  href: Href;
  /** linha abaixo do pôster (ano, autor, motivo...) */
  caption?: string;
}

const POSTER_WIDTH = 104;

/** fileira horizontal de pôsteres */
export function MovieRow({ items, loading, width = POSTER_WIDTH }: { items: RowItem[] | undefined; loading?: boolean; width?: number }) {
  if (!items || loading) {
    return (
      <View className="flex-row gap-3 px-5">
        {Array.from({ length: 4 }, (_, i) => (
          <PosterSkeleton key={i} width={width} />
        ))}
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(item) => item.key}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      renderItem={({ item }) => (
        <View style={{ width }}>
          <Poster title={item.title} posterPath={item.posterPath} width={width} href={item.href} size="w185" />
          {item.caption && (
            <Text className="mt-1.5 text-xs text-brand-slate" numberOfLines={1}>
              {item.caption}
            </Text>
          )}
        </View>
      )}
    />
  );
}
