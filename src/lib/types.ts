// Espelha os DTOs do backend do Nitrate (os mesmos tipos do Nitrate web)

export interface Movie {
  id: number;
  title: string;
  releaseYear: number | null;
  rating: number | null;
  director: string | null;
  franchise: string | null;
  genres: string[];
  slug: string | null;
  posterPath: string | null;
  overview: string | null;
}

/** Resultado da busca no TMDB. `id` só existe se o filme já foi importado para o Nitrate. */
export interface MovieSearchResult {
  id: number | null;
  slug: string | null;
  tmdbId: number;
  title: string;
  releaseYear: number | null;
  posterPath: string | null;
  overview: string | null;
  rating: number | null;
}

export interface Page<T> {
  items: T[];
  page: number; // começa em 0
  size: number;
  totalItems: number;
  totalPages: number;
}

// ---------- auth ----------

export interface LoginRequest {
  login: string; // e-mail ou username
  password: string;
}

export interface RegisterRequest {
  name: string;
  username: string;
  email: string;
  password: string;
  acceptedTerms: boolean; // idade mínima + Termos e Política de Privacidade
}

export interface AuthResponse {
  token: string;
  name: string;
  username: string;
  email: string;
}

// ---------- usuários ----------

export interface UserSummary {
  username: string;
  name: string;
}

export interface UserProfile extends UserSummary {
  createdAt: string;
  bio: string | null;
  twitter: string | null;
  instagram: string | null;
  filmsCount: number;
  reviewsCount: number;
  likesCount: number;
  watchlistCount: number;
  followersCount: number;
  followingCount: number;
  favorites: Movie[];
  followedByMe: boolean | null; // null para visitantes e no próprio perfil
}

export interface SimilarUser extends UserSummary {
  sharedFilms: number;
  compatibility: number; // 0 a 100
}

export interface ProfileUpdate {
  name: string;
  username: string;
  bio: string;
  twitter: string;
  instagram: string;
}

// estreias do radar (com `movie`) ou alguém que começou a seguir (com `actor`)
interface NotificationBase {
  id: number;
  detail: string | null;
  createdAt: string;
  read: boolean;
}

export type AppNotification =
  | (NotificationBase & { type: 'CINEMA' | 'STREAMING'; movie: Movie; actor: null })
  | (NotificationBase & { type: 'FOLLOW'; movie: null; actor: UserSummary });

// ---------- reviews ----------

export interface MovieReview {
  id: number;
  movie: Movie;
  user: UserSummary;
  rating: number | null; // 0.5 a 5; null = assistiu sem dar nota
  text: string | null;
  liked: boolean;
  rewatch: boolean;
  spoiler: boolean;
  watchedOn: string; // yyyy-mm-dd
  createdAt: string;
}

export interface ReviewRequest {
  movieId?: number; // só na criação
  rating: number | null;
  text: string | null;
  liked: boolean;
  rewatch: boolean;
  spoiler: boolean;
  watchedOn: string | null;
}

export interface ReviewEngagement {
  likesCount: number;
  likedByMe: boolean | null;
  commentsCount: number;
}

export interface ReviewComment {
  id: number;
  user: UserSummary;
  text: string;
  createdAt: string;
}

export interface WatchlistItem {
  movie: Movie;
  addedAt: string;
}

export interface MovieUserState {
  review: MovieReview | null; // a mais recente
  reviewsCount: number;
  inWatchlist: boolean;
}

export interface Recommendation {
  movieId: number;
  slug: string | null;
  title: string;
  releaseYear: number | null;
  posterPath: string | null;
  score: number;
  reasons: string[];
}

// ---------- filmes ----------

export interface CreditPerson {
  tmdbId: number;
  name: string;
  role: string | null;
  profilePath: string | null;
}

export interface MovieCredits {
  directors: CreditPerson[];
  cast: CreditPerson[];
  backdropPath: string | null;
  tagline: string | null;
}

export interface MovieStats {
  averageRating: number | null;
  ratingsCount: number;
  watchedCount: number;
  likesCount: number;
  ratingDistribution: Record<string, number>; // "0.5" .. "5.0"
}

export interface WatchProvider {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface WatchProviders {
  link: string | null;
  streaming: WatchProvider[];
  free: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

// ---------- pessoas ----------

export interface PersonSummary {
  tmdbId: number;
  name: string;
  profilePath: string | null;
  department: string | null;
  knownFor: string[];
}

export interface PersonCredit {
  id: number | null;
  slug: string | null;
  tmdbId: number;
  title: string;
  releaseYear: number | null;
  posterPath: string | null;
  role: string | null;
}

export interface PersonDetail {
  tmdbId: number;
  name: string;
  profilePath: string | null;
  department: string | null;
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  directed: PersonCredit[];
  acted: PersonCredit[];
}

/** ator/atriz ou diretor(a) favorito no perfil */
export interface FavoritePerson {
  tmdbId: number;
  name: string;
  profilePath: string | null;
}

/** as duas listas, cada uma na ordem escolhida */
export interface FavoritePeople {
  actors: FavoritePerson[];
  directors: FavoritePerson[];
}

export type FavoritePeopleKind = keyof FavoritePeople;

// ---------- listas ----------

export interface MovieList {
  id: number;
  name: string;
  description: string | null;
  isPublic: boolean;
  filmsCount: number;
  movies: Movie[];
  owner: UserSummary;
  createdAt: string;
  updatedAt: string;
  containsMovie: boolean | null; // só em getMyLists(movieId)
}

export interface MovieListRequest {
  name: string;
  description: string;
  isPublic: boolean;
  movieIds: number[];
}

// ---------- feed de amigos ----------

export type ActivityType = 'REVIEW' | 'WATCHLIST' | 'LIST' | 'REVIEW_LIKE' | 'COMMENT' | 'FOLLOW';

export interface Activity {
  type: ActivityType;
  id: string;
  at: string;
  user: UserSummary;
  review: MovieReview | null;
  movie: Movie | null;
  list: MovieList | null;
  comment: string | null;
  target: UserSummary | null;
  likesCount: number | null;
  likedByMe: boolean | null;
}

export interface ActivityPage {
  items: Activity[];
  nextBefore: string | null; // null = acabou
}

const DEPARTMENTS: Record<string, string> = {
  Acting: 'Atuação',
  Directing: 'Direção',
  Writing: 'Roteiro',
  Production: 'Produção',
  Editing: 'Montagem',
  Camera: 'Fotografia',
  Sound: 'Som',
  Art: 'Direção de arte',
};

export function departmentLabel(department: string | null): string | null {
  if (!department) return null;
  return DEPARTMENTS[department] ?? department;
}
