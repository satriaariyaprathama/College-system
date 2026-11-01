/**
 * Sanitizes an external URL, ensuring only http:// and https:// URLs are allowed.
 * Prevents javascript:, data:, and other potentially dangerous URL schemes.
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}
