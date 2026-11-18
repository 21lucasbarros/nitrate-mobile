import { Platform, RefreshControl, ScrollView, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';

/**
 * ScrollView das abas. No iOS as abas nativas ajustam os insets da primeira ScrollView
 * (status bar e tab bar); no Android só o de baixo, então o topo fica por nossa conta.
 */
export function TabScroll({
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  ...props
}: ScrollViewProps & { refreshing?: boolean; onRefresh?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[{ paddingTop: Platform.OS === 'ios' ? 8 : insets.top + 8, paddingBottom: 48 }, contentContainerStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.slate} /> : undefined}
      {...props}
    />
  );
}
