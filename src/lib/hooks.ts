import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useAuthStore } from './auth-store';
import { getMe } from './services';

export const meKey = ['me'] as const;

/** o perfil de quem está logado (contadores, favoritos...) */
export function useMe() {
  const token = useAuthStore((s) => s.token);
  return useQuery({ queryKey: meKey, queryFn: getMe, enabled: !!token });
}

export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/** depois de registrar/editar algo de um filme: tudo o que mostra esse filme precisa recarregar */
export function useInvalidateMovie() {
  const queryClient = useQueryClient();
  return (movieId: number) => {
    queryClient.invalidateQueries({ queryKey: ['movie-state', movieId] });
    queryClient.invalidateQueries({ queryKey: ['movie-reviews', movieId] });
    queryClient.invalidateQueries({ queryKey: ['movie-stats', movieId] });
    queryClient.invalidateQueries({ queryKey: meKey });
    queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
    queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  };
}
