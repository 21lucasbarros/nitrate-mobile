import '@/global.css';

import {
  SourceSerif4_400Regular,
  SourceSerif4_400Regular_Italic,
  SourceSerif4_600SemiBold,
  useFonts,
} from '@expo-google-fonts/source-serif-4';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAuthStore } from '@/lib/auth-store';
import { colors, navigationTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

export default function RootLayout() {
  const token = useAuthStore((s) => s.token);
  const hydrate = useAuthStore((s) => s.hydrate);
  const [fontsLoaded, fontError] = useFonts({
    SourceSerif4_400Regular,
    SourceSerif4_400Regular_Italic,
    SourceSerif4_600SemiBold,
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // saiu da conta: nada do usuário anterior fica em cache
  useEffect(() => {
    if (token === null) queryClient.clear();
  }, [token]);

  const ready = token !== undefined && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const signedIn = !!token;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerTintColor: colors.foreground,
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: colors.background },
            }}>
            <Stack.Protected guard={signedIn}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Início' }} />
              <Stack.Screen name="filme/[id]" options={{ headerTransparent: true, title: '' }} />
              <Stack.Screen name="filme/tmdb/[tmdbId]" options={{ title: '' }} />
              <Stack.Screen name="pessoa/[tmdbId]" options={{ title: '' }} />
              <Stack.Screen name="u/[username]/index" options={{ title: '' }} />
              <Stack.Screen name="u/[username]/conexoes" options={{ title: '' }} />
              <Stack.Screen name="review/[id]" options={{ title: 'Review' }} />
              <Stack.Screen name="lista/[id]" options={{ title: 'Lista' }} />
              <Stack.Screen name="notificacoes" options={{ title: 'Radar de estreias' }} />
              <Stack.Screen name="configuracoes" options={{ title: 'Configurações' }} />
              <Stack.Screen name="registrar" options={{ presentation: 'modal', title: '' }} />
              <Stack.Screen name="adicionar-a-lista" options={{ presentation: 'formSheet', title: 'Adicionar à lista', sheetAllowedDetents: [0.6, 1] }} />
            </Stack.Protected>
            <Stack.Protected guard={!signedIn}>
              <Stack.Screen name="entrar" options={{ headerShown: false }} />
            </Stack.Protected>
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
