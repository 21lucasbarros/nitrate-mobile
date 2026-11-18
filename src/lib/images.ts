const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

function tmdbImage(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path.startsWith('/') ? path : `/${path}`}`;
}

export type PosterSize = 'w185' | 'w342' | 'w500';

export const posterUrl = (path: string | null | undefined, size: PosterSize = 'w342') => tmdbImage(path, size);
export const profileUrl = (path: string | null | undefined) => tmdbImage(path, 'w185');
export const logoUrl = (path: string | null | undefined) => tmdbImage(path, 'w92');
export const backdropUrl = (path: string | null | undefined) => tmdbImage(path, 'w1280');
