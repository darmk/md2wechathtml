export const siteBasePath = '/md2articlehtml';

/**
 * Absolute origin used for metadata that must be a full URL, such as Open Graph images.
 * Without it the framework resolves relative metadata against a localhost default and
 * ships `http://localhost:3000/...` into the production export.
 * Override with the SITE_ORIGIN environment variable at build time.
 */
export const siteOrigin = (typeof process !== 'undefined' ? process.env.SITE_ORIGIN : undefined)?.replace(/\/+$/, '') || 'http://219.151.188.86:81';

/** Paths for application-owned public assets, not user Markdown images. */
export function siteAssetPath(path: string): string {
  return `${siteBasePath}/${path.replace(/^\/+/, '')}`;
}
