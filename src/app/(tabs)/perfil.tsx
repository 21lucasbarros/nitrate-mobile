import { View } from 'react-native';

import { ProfileView } from '@/components/profile-view';
import { ErrorState, Loading } from '@/components/ui';
import { useMe } from '@/lib/hooks';

export default function MyProfileScreen() {
  const me = useMe();
  if (me.isPending) return <Loading />;
  if (!me.data) return <ErrorState onRetry={() => me.refetch()} />;
  return (
    <View className="flex-1 bg-background">
      <ProfileView username={me.data.username} own inTab />
    </View>
  );
}
