import * as WebBrowser from 'expo-web-browser';

import { WEB_URL } from './config';

// os mesmos valores do Nitrate web (src/lib/legal.ts)
export const MIN_AGE = 13;
export const TMDB_NOTICE = 'This product uses the TMDB API but is not endorsed or certified by TMDB.';

/** os Termos e a Política ficam no Nitrate web; sem EXPO_PUBLIC_WEB_URL não há o que abrir */
export function openLegalPage(page: 'termos' | 'privacidade') {
  if (WEB_URL) WebBrowser.openBrowserAsync(`${WEB_URL}/${page}`);
}
