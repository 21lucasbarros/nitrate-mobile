import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { ErrorState, Loading } from '@/components/ui';
import { getMovieByTmdbId } from '@/lib/services';

/** filmes da busca que ainda não estão no Nitrate: o backend importa do TMDB na primeira vez */
export default function TmdbMovieScreen() {
  const { tmdbId } = useLocalSearchParams<{ tmdbId: string }>();
  const movie = useQuery({ queryKey: ['movie-tmdb', tmdbId], queryFn: () => getMovieByTmdbId(Number(tmdbId)) });

  if (movie.isError) return <ErrorState message="Não foi possível abrir este filme." onRetry={() => movie.refetch()} />;
  if (!movie.data) return <Loading hint />;
  return <Redirect href={`/filme/${movie.data.id}`} />;
}
