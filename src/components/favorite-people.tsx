import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { MAX_FAVORITE_PEOPLE } from '@/lib/services';
import { colors } from '@/lib/theme';
import type { FavoritePeopleKind, FavoritePerson } from '@/lib/types';

import { PersonPhoto } from './people';

export const FAVORITE_PEOPLE_LABELS: Record<
  FavoritePeopleKind,
  { title: string; search: string; department: string; plural: string }
> = {
  actors: { title: 'Atores e atrizes favoritos', search: 'Buscar um ator ou atriz', department: 'Acting', plural: 'atores e atrizes' },
  directors: { title: 'Diretores favoritos', search: 'Buscar um diretor ou diretora', department: 'Directing', plural: 'diretores' },
};

/** fotos redondas dos favoritos, na ordem escolhida, com o nome embaixo */
export function FavoritePeopleRow({
  kind,
  people,
  own,
  onEdit,
}: {
  kind: FavoritePeopleKind;
  people: FavoritePerson[];
  own: boolean;
  onEdit: () => void;
}) {
  if (people.length === 0) {
    return own ? (
      <Pressable
        onPress={onEdit}
        className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/15 py-7 active:opacity-70">
        <Ionicons name="add" size={16} color={colors.slate} />
        <Text className="text-sm text-brand-slate">
          Escolha seus {MAX_FAVORITE_PEOPLE} {FAVORITE_PEOPLE_LABELS[kind].plural} favoritos
        </Text>
      </Pressable>
    ) : null;
  }

  return (
    <View className="flex-row gap-2">
      {people.map((person) => (
        <Link key={person.tmdbId} href={`/pessoa/${person.tmdbId}`} asChild>
          <Pressable className="flex-1 items-center active:opacity-70">
            <PersonPhoto name={person.name} profilePath={person.profilePath} size={60} />
            <Text className="mt-2 text-center text-[11px] leading-[14px] text-foreground/85" numberOfLines={2}>
              {person.name}
            </Text>
          </Pressable>
        </Link>
      ))}
      {own && people.length < MAX_FAVORITE_PEOPLE && (
        <Pressable onPress={onEdit} accessibilityLabel="Adicionar favorito" className="flex-1 items-center active:opacity-70">
          <View className="h-[60px] w-[60px] items-center justify-center rounded-full border border-dashed border-foreground/15">
            <Ionicons name="add" size={20} color={colors.slate} />
          </View>
        </Pressable>
      )}
      {/* mantém o tamanho com menos de 5 */}
      {Array.from({ length: MAX_FAVORITE_PEOPLE - people.length - (own ? 1 : 0) }, (_, i) => (
        <View key={`empty-${i}`} className="flex-1" />
      ))}
    </View>
  );
}
