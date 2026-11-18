import { Stack, useLocalSearchParams } from 'expo-router';

import { ProfileView } from '@/components/profile-view';
import { useMe } from '@/lib/hooks';

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const me = useMe().data;
  return (
    <>
      <Stack.Screen options={{ title: `@${username}` }} />
      <ProfileView username={username} own={me?.username === username} />
    </>
  );
}
