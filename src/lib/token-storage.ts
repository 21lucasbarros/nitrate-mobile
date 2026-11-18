import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'nitrate_token';

// o SecureStore não existe na web; lá o token fica no localStorage, como no Nitrate web
export async function loadToken(): Promise<string | null> {
  const token =
    Platform.OS === 'web' ? localStorage.getItem(TOKEN_KEY) : await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token || isTokenExpired(token)) return null;
  return token;
}

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') localStorage.setItem(TOKEN_KEY, token);
  else await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') localStorage.removeItem(TOKEN_KEY);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// o backend emite JWT com validade de 24h; lemos o `exp` para não usar um token vencido
function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const { exp } = JSON.parse(json) as { exp?: number };
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return true; // token malformado
  }
}
