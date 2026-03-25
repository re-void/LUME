/**
 * Simple in-memory cache for downloaded avatar object URLs.
 * Maps fileId -> object URL string.
 */

const cache = new Map<string, string>();

/** Pending downloads keyed by fileId to avoid duplicate parallel fetches. */
const pending = new Map<string, Promise<string | null>>();

export function getCachedAvatarUrl(fileId: string): string | undefined {
  return cache.get(fileId);
}

export function setCachedAvatarUrl(fileId: string, url: string): void {
  cache.set(fileId, url);
}

export function hasCachedAvatar(fileId: string): boolean {
  return cache.has(fileId);
}

/**
 * Download an avatar by fileId, cache the resulting object URL, and return it.
 * De-duplicates concurrent requests for the same fileId.
 */
export async function downloadAndCacheAvatar(
  fileId: string,
  downloadFn: () => Promise<{ data: string; mimeHint: string } | null>,
): Promise<string | null> {
  const existing = cache.get(fileId);
  if (existing) return existing;

  const inflight = pending.get(fileId);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const result = await downloadFn();
      if (!result) return null;

      const binary = atob(result.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: result.mimeHint || "image/png" });
      const url = URL.createObjectURL(blob);
      cache.set(fileId, url);
      return url;
    } catch {
      return null;
    } finally {
      pending.delete(fileId);
    }
  })();

  pending.set(fileId, promise);
  return promise;
}
