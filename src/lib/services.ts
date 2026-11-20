// Os mesmos endpoints usados pelo Nitrate web (src/lib/services/*)
import { api } from './api';
import type {
  ActivityPage,
  AppNotification,
  AuthResponse,
  FavoritePeople,
  FavoritePeopleKind,
  FavoritePerson,
  LoginRequest,
  Movie,
  MovieCredits,
  MovieList,
  MovieListRequest,
  MovieReview,
  MovieSearchResult,
  MovieStats,
  MovieUserState,
  Page,
  PersonDetail,
  PersonSummary,
  ProfileUpdate,
  Recommendation,
  RegisterRequest,
  ReviewComment,
  ReviewEngagement,
  ReviewRequest,
  SimilarUser,
  UserProfile,
  UserSummary,
  WatchlistItem,
  WatchProviders,
} from './types';

const get = <T>(url: string, params?: object) => api.get<T>(url, { params }).then((r) => r.data);
const post = <T>(url: string, body?: unknown) => api.post<T>(url, body).then((r) => r.data);
const put = <T>(url: string, body?: unknown) => api.put<T>(url, body).then((r) => r.data);
const del = <T>(url: string, body?: unknown) => api.delete<T>(url, { data: body }).then((r) => r.data);
const enc = encodeURIComponent;

// ---------- auth ----------

export const login = (data: LoginRequest) => post<AuthResponse>('/auth/login', data);
export const register = (data: RegisterRequest) => post<AuthResponse>('/auth/register', data);
export const checkUsernameAvailability = (username: string) =>
  get<{ available: boolean }>('/auth/check-username', { username });

// ---------- filmes ----------

export const getCatalog = (page: number, size: number) => get<Page<Movie>>('/movies/catalog', { page, size });
export const getTrendingMovies = () => get<Movie[]>('/movies/community/trending');
export const getTopRatedMovies = () => get<Movie[]>('/movies/community/top-rated');
export const getMovie = (id: number) => get<Movie>(`/movies/${id}`);
export const getMovieByTmdbId = (tmdbId: number) => get<Movie>(`/movies/tmdb/${tmdbId}`);
export const searchMovies = (q: string) => get<MovieSearchResult[]>('/movies/search', { q });
export const getMovieCredits = (id: number) => get<MovieCredits>(`/movies/${id}/credits`);
export const getMovieStats = (id: number) => get<MovieStats>(`/movies/${id}/stats`);
export const getWatchProviders = (id: number) => get<WatchProviders>(`/movies/${id}/watch-providers`);

// ---------- pessoas ----------

export const searchPeople = (q: string) => get<PersonSummary[]>('/people/search', { q });
export const getPerson = (tmdbId: number) => get<PersonDetail>(`/people/${tmdbId}`);

// ---------- reviews ----------

export const getRecentReviews = (limit = 20) => get<MovieReview[]>('/reviews/recent', { limit });
export const getReview = (id: number) => get<MovieReview>(`/reviews/${id}`);
export const getMovieReviews = (movieId: number) => get<MovieReview[]>(`/movies/${movieId}/reviews`);
export const createReview = (data: ReviewRequest) => post<MovieReview>('/reviews', data);
export const updateReview = (id: number, data: ReviewRequest) => put<MovieReview>(`/reviews/${id}`, data);
export const deleteReview = (id: number) => del<void>(`/reviews/${id}`);
export const getReviewEngagement = (id: number) => get<ReviewEngagement>(`/reviews/${id}/engagement`);
export const likeReview = (id: number) => post<ReviewEngagement>(`/reviews/${id}/like`);
export const unlikeReview = (id: number) => del<ReviewEngagement>(`/reviews/${id}/like`);
export const getReviewComments = (id: number) => get<ReviewComment[]>(`/reviews/${id}/comments`);
export const addReviewComment = (id: number, text: string) =>
  post<ReviewComment>(`/reviews/${id}/comments`, { text });
export const deleteReviewComment = (id: number, commentId: number) =>
  del<void>(`/reviews/${id}/comments/${commentId}`);

// ---------- watchlist ----------

export const addToWatchlist = (movieId: number) => post<WatchlistItem>(`/watchlist/${movieId}`);
export const removeFromWatchlist = (movieId: number) => del<void>(`/watchlist/${movieId}`);

// ---------- usuários ----------

export const getMe = () => get<UserProfile>('/users/me');
export const updateMyProfile = (data: ProfileUpdate) => put<UserProfile>('/users/me/profile', data);
export const getMyNotifications = () => get<AppNotification[]>('/users/me/notifications');
export const getUnreadNotificationsCount = () => get<{ count: number }>('/users/me/notifications/unread-count');
export const markNotificationsRead = () => post<void>('/users/me/notifications/read');
export const getMyRecommendations = () => get<Recommendation[]>('/users/me/recommendations');
export const getMovieState = (movieId: number) => get<MovieUserState>(`/users/me/movies/${movieId}`);
export const getMyFeed = (limit: number) => get<MovieReview[]>('/users/me/feed', { limit });
export const getSimilarUsers = () => get<SimilarUser[]>('/users/me/similar');
export const setMyFavorites = (movieIds: number[]) => put<Movie[]>('/users/me/favorites', { movieIds });
export const MAX_FAVORITE_PEOPLE = 5;
export const getFavoritePeople = (username: string) => get<FavoritePeople>(`/users/${enc(username)}/favorites/people`);
/** substitui a lista inteira (atores ou diretores); a ordem do array é a ordem do perfil */
export const setMyFavoritePeople = (kind: FavoritePeopleKind, tmdbIds: number[]) =>
  put<FavoritePerson[]>(`/users/me/favorites/${kind}`, { tmdbIds });
export const getProfile = (username: string) => get<UserProfile>(`/users/${enc(username)}`);
export const getUserReviews = (username: string, page: number, size: number, withText = false) =>
  get<Page<MovieReview>>(`/users/${enc(username)}/reviews`, { page, size, withText });
export const getUserWatchlist = (username: string) => get<WatchlistItem[]>(`/users/${enc(username)}/watchlist`);
export const followUser = (username: string) => post<void>(`/users/${enc(username)}/follow`);
export const unfollowUser = (username: string) => del<void>(`/users/${enc(username)}/follow`);
export const getFollowers = (username: string) => get<UserSummary[]>(`/users/${enc(username)}/followers`);
export const getFollowing = (username: string) => get<UserSummary[]>(`/users/${enc(username)}/following`);
export const searchUsers = (q: string) => get<UserSummary[]>('/users/search', { q });

/** feed de atividade meu e de quem eu sigo; `before` (ISO) pede a página seguinte */
export const getFriendsFeed = (before: string | null, size = 30) =>
  get<ActivityPage>('/users/me/friends/feed', before ? { size, before } : { size });

// ---------- listas ----------

export const getUserLists = (username: string) => get<MovieList[]>(`/users/${enc(username)}/lists`);
export const getMyLists = (movieId: number) => get<MovieList[]>('/users/me/lists', { movieId });
export const getList = (id: number) => get<MovieList>(`/lists/${id}`);
export const createList = (data: MovieListRequest) => post<MovieList>('/lists', data);
export const deleteList = (id: number) => del<void>(`/lists/${id}`);
export const addMovieToList = (id: number, movieId: number) => post<MovieList>(`/lists/${id}/movies/${movieId}`);
export const removeMovieFromList = (id: number, movieId: number) =>
  del<MovieList>(`/lists/${id}/movies/${movieId}`);
