import { Text, View } from 'react-native';

import { colors } from '@/lib/theme';

// ainda não temos foto de perfil: a inicial do nome numa cor derivada do username (igual ao web)
const PALETTE = [colors.blue, colors.orange, colors.violet, colors.crimson, colors.emerald, colors.teal];

function colorFor(username: string): string {
  let hash = 0;
  for (const char of username) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

const SIZES = { xs: 20, sm: 32, md: 40, lg: 64, xl: 96 } as const;

interface AvatarProps {
  name: string;
  username: string;
  size?: keyof typeof SIZES;
}

export function Avatar({ name, username, size = 'md' }: AvatarProps) {
  const px = SIZES[size];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: px, height: px, borderRadius: px / 2, backgroundColor: colorFor(username) }}
      className="items-center justify-center">
      <Text style={{ fontSize: px * 0.42 }} className="font-semibold uppercase text-white">
        {name.trim().charAt(0) || username.charAt(0)}
      </Text>
    </View>
  );
}
