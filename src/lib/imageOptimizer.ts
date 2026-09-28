import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface CompressionOptions {
  maxWidth?: number;
  quality?: number;
}

/**
 * Compresses and resizes camera images before network upload.
 * Reduces raw 12-48MP photos to max 1600px width at 80% JPEG quality,
 * dramatically speeding up network transit and staying well under backend limits.
 */
export async function compressImageForUpload(
  uri: string,
  options: CompressionOptions = {}
): Promise<string> {
  const { maxWidth = 1600, quality = 0.8 } = options;

  if (!uri) return uri;

  // If already a data URI or blob, let it pass through if manipulation is unnecessary
  if (uri.startsWith('data:') && uri.length < 500000) {
    return uri;
  }

  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress: quality,
        format: SaveFormat.JPEG,
        base64: true,
      }
    );
    if (result.base64) {
      return `data:image/jpeg;base64,${result.base64}`;
    }
    return result.uri || uri;
  } catch (err) {
    // If running in simulator/web without full native image manipulation, gracefully return original URI
    return uri;
  }
}
