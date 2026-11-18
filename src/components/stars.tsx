import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

import { formatScore } from '@/lib/format';
import { colors } from '@/lib/theme';

const EMPTY = 'rgba(154,158,165,0.2)';

/** Nota em meias estrelas, só para exibir */
export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View className="flex-row items-center" style={{ gap: size * 0.08 }} accessibilityLabel={`${formatScore(rating)} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const full = rating >= star;
        const half = !full && rating >= star - 0.5;
        return (
          <Ionicons
            key={star}
            name={full ? 'star' : half ? 'star-half' : 'star'}
            size={size}
            color={full || half ? colors.orange : EMPTY}
          />
        );
      })}
    </View>
  );
}

interface StarInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  size?: number;
  disabled?: boolean;
}

/** Nota de 0,5 a 5: cada estrela tem duas metades tocáveis. Tocar na nota atual limpa a nota. */
export function StarInput({ value, onChange, size = 38, disabled }: StarInputProps) {
  const shown = value ?? 0;

  const select = (rating: number) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(value === rating ? null : rating);
  };

  return (
    <View className="flex-row items-center gap-3" style={{ opacity: disabled ? 0.5 : 1 }}>
      <View className="flex-row" accessibilityRole="adjustable" accessibilityLabel="Nota">
        {[1, 2, 3, 4, 5].map((star) => {
          const full = shown >= star;
          const half = !full && shown >= star - 0.5;
          return (
            <View key={star} style={{ width: size + 4, height: size }}>
              <View pointerEvents="none" className="absolute inset-0 items-center">
                <Ionicons name={half ? 'star-half' : 'star'} size={size} color={full || half ? colors.orange : 'rgba(154,158,165,0.15)'} />
              </View>
              {[star - 0.5, star].map((rating, i) => (
                <Pressable
                  key={rating}
                  disabled={disabled}
                  onPress={() => select(rating)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value === rating }}
                  accessibilityLabel={`${formatScore(rating)} estrela${rating > 1 ? 's' : ''}`}
                  hitSlop={{ top: 8, bottom: 8 }}
                  style={{ position: 'absolute', top: 0, bottom: 0, width: '50%', [i === 0 ? 'left' : 'right']: 0 }}
                />
              ))}
            </View>
          );
        })}
      </View>
      <Text className="w-8 font-mono text-sm text-brand-slate/70">{shown > 0 ? formatScore(shown) : '—'}</Text>
    </View>
  );
}
