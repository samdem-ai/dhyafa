/**
 * Minimal ambient declaration for `expo-image-picker`.
 *
 * The package is a real dependency (declared in package.json) but may not be
 * installed in every environment where this app is type-checked (installs are
 * run separately). This shim lets `tsc` resolve a normal
 * `import('expo-image-picker')` so the photos step can use a statically
 * analyzable dynamic import (which Metro bundles correctly) without a hard
 * compile-time dependency on the package's own d.ts.
 *
 * When the real package is installed its bundled types take precedence at
 * runtime; this only declares the small surface we touch.
 */
declare module 'expo-image-picker' {
  export interface PermissionResponse {
    granted: boolean;
    canAskAgain?: boolean;
    status?: string;
  }

  export interface ImagePickerAsset {
    uri: string;
    base64?: string | null;
    mimeType?: string | null;
    fileName?: string | null;
    width?: number;
    height?: number;
  }

  export interface ImagePickerResult {
    canceled: boolean;
    assets?: ImagePickerAsset[] | null;
  }

  export const MediaTypeOptions: { Images: unknown; Videos: unknown; All: unknown };

  export function requestMediaLibraryPermissionsAsync(): Promise<PermissionResponse>;

  export function launchImageLibraryAsync(
    options?: Record<string, unknown>,
  ): Promise<ImagePickerResult>;
}
