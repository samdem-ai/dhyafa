/**
 * Thin wrapper around expo-image-picker.
 *
 * Loaded dynamically so this app still type-checks and bundles even before
 * `expo-image-picker` is installed (the dependency is declared in package.json
 * but installs are run separately). At runtime, if the native module is absent
 * we surface a typed PickResult with `error: 'unavailable'` instead of throwing.
 *
 * Returns base64 image bytes so the data layer can upload without expo-file-system.
 */

export interface PickedImage {
  base64: string;
  uri: string;
  /** lowercase extension without dot, best-effort ('jpg' | 'png' | …). */
  ext: string;
  mimeType: string;
}

export type PickResult =
  | { ok: true; image: PickedImage }
  | { ok: false; reason: 'canceled' | 'denied' | 'unavailable' | 'error' };

// Structural typing of the bits of expo-image-picker we use. (An ambient shim
// in src/types/expo-image-picker.d.ts lets tsc resolve the dynamic import even
// when the package isn't installed in this environment.)
interface ImagePickerModule {
  requestMediaLibraryPermissionsAsync: () => Promise<{ granted: boolean }>;
  launchImageLibraryAsync: (options: Record<string, unknown>) => Promise<{
    canceled: boolean;
    assets?:
      | Array<{
          uri: string;
          base64?: string | null;
          mimeType?: string | null;
          fileName?: string | null;
        }>
      | null;
  }>;
  MediaTypeOptions?: { Images?: unknown };
}

async function loadModule(): Promise<ImagePickerModule | null> {
  try {
    // Statically analyzable so Metro bundles it once installed; wrapped in
    // try/catch so a missing native module degrades to `unavailable`.
    const mod = (await import('expo-image-picker')) as unknown as ImagePickerModule;
    if (typeof mod.launchImageLibraryAsync !== 'function') return null;
    return mod;
  } catch {
    return null;
  }
}

function extFromUri(uri: string, mimeType?: string | null): { ext: string; mime: string } {
  if (mimeType === 'image/png') return { ext: 'png', mime: 'image/png' };
  if (mimeType === 'image/webp') return { ext: 'webp', mime: 'image/webp' };
  if (mimeType === 'image/jpeg') return { ext: 'jpg', mime: 'image/jpeg' };
  const raw = uri.split('?')[0]?.split('.').pop()?.toLowerCase() ?? '';
  if (raw === 'png') return { ext: 'png', mime: 'image/png' };
  if (raw === 'webp') return { ext: 'webp', mime: 'image/webp' };
  return { ext: 'jpg', mime: 'image/jpeg' };
}

/** Prompt for library permission, then pick a single image with base64. */
export async function pickListingImage(): Promise<PickResult> {
  const mod = await loadModule();
  if (!mod) return { ok: false, reason: 'unavailable' };

  try {
    const perm = await mod.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'denied' };

    const result = await mod.launchImageLibraryAsync({
      // New SDKs accept a string array; older ones use MediaTypeOptions.Images.
      mediaTypes: mod.MediaTypeOptions?.Images ?? ['images'],
      quality: 0.8,
      base64: true,
      allowsMultipleSelection: false,
    });

    if (result.canceled) return { ok: false, reason: 'canceled' };
    const asset = result.assets?.[0];
    if (!asset?.base64) return { ok: false, reason: 'error' };

    const { ext, mime } = extFromUri(asset.uri, asset.mimeType);
    return {
      ok: true,
      image: { base64: asset.base64, uri: asset.uri, ext, mimeType: mime },
    };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export type MultiPickResult =
  | { ok: true; images: PickedImage[] }
  | { ok: false; reason: 'canceled' | 'denied' | 'unavailable' | 'error' };

/** Prompt for library permission, then pick one OR MORE images with base64. */
export async function pickListingImages(selectionLimit = 10): Promise<MultiPickResult> {
  const mod = await loadModule();
  if (!mod) return { ok: false, reason: 'unavailable' };

  try {
    const perm = await mod.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'denied' };

    const result = await mod.launchImageLibraryAsync({
      mediaTypes: mod.MediaTypeOptions?.Images ?? ['images'],
      quality: 0.8,
      base64: true,
      allowsMultipleSelection: true,
      selectionLimit,
    });

    if (result.canceled) return { ok: false, reason: 'canceled' };
    const assets = (result.assets ?? []).filter((a) => !!a.base64);
    if (assets.length === 0) return { ok: false, reason: 'error' };

    const images: PickedImage[] = assets.map((asset) => {
      const { ext, mime } = extFromUri(asset.uri, asset.mimeType);
      return { base64: asset.base64 as string, uri: asset.uri, ext, mimeType: mime };
    });
    return { ok: true, images };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
