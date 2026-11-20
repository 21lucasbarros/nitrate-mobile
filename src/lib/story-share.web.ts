// o react-native-share não roda no navegador; no web a figurinha não é oferecida

export const canShareStories = false;

export async function shareImageFile(_uri: string): Promise<void> {}

export async function shareStickerToStories(
  _stickerUri: string,
  _options: { topColor: string; bottomColor: string; link?: string },
): Promise<'instagram' | 'sheet'> {
  return 'sheet';
}
