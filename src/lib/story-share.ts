import * as Sharing from 'expo-sharing';
import { Linking, Platform, TurboModuleRegistry } from 'react-native';

import { FACEBOOK_APP_ID } from './config';

export const canShareStories = true;

/**
 * O react-native-share é código nativo: no Expo Go (ou numa build anterior a ele) o módulo não existe
 * e importar a lib derruba o app. Só carregamos quando o módulo está no binário.
 */
function nativeShare(): typeof import('react-native-share') | null {
  if (!TurboModuleRegistry.get('RNShare')) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- import condicional de propósito
  return require('react-native-share');
}

async function instagramInstalled(lib: typeof import('react-native-share')): Promise<boolean> {
  if (Platform.OS === 'android') {
    return lib.default
      .isPackageInstalled('com.instagram.android')
      .then((r) => r.isInstalled)
      .catch(() => false);
  }
  return Linking.canOpenURL('instagram-stories://share').catch(() => false);
}

/** folha de compartilhar do sistema com o PNG (salvar, AirDrop, mandar para o Instagram à mão) */
export async function shareImageFile(uri: string): Promise<void> {
  try {
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Compartilhar figurinha' });
  } catch {
    // usuário fechou a folha
  }
}

/**
 * Abre o Stories do Instagram com a figurinha (PNG sem fundo) por cima de um degradê, como o Letterboxd.
 * Sem o módulo nativo, sem o app instalado ou sem o ID do app na Meta, cai na folha de compartilhar.
 * Devolve por onde foi.
 */
export async function shareStickerToStories(
  stickerUri: string,
  { topColor, bottomColor, link }: { topColor: string; bottomColor: string; link?: string },
): Promise<'instagram' | 'sheet'> {
  const lib = nativeShare();
  if (lib && FACEBOOK_APP_ID && (await instagramInstalled(lib))) {
    try {
      await lib.default.shareSingle({
        social: lib.Social.InstagramStories,
        appId: FACEBOOK_APP_ID,
        stickerImage: stickerUri,
        backgroundTopColor: topColor,
        backgroundBottomColor: bottomColor,
        attributionURL: link,
      });
      return 'instagram';
    } catch {
      // segue para a folha de compartilhar
    }
  }
  await shareImageFile(stickerUri);
  return 'sheet';
}
