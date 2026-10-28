/** Name of the tree document the viewer loads, next to its own page. */
export const DECISION_FILE = 'decision.json';

/**
 * Resolves `decision.json` relative to the page the viewer is hosted on:
 *
 *   https://example.com/decision/index.html  → https://example.com/decision/decision.json
 *   https://example.com/decision/            → https://example.com/decision/decision.json
 *   https://example.com/decision             → https://example.com/decision/decision.json
 *
 * The last case is not what plain relative-URL resolution would give
 * (`/decision.json`), but a final path segment without a file extension is
 * almost always a folder served without its trailing slash.
 */
export function resolveDecisionUrl(pageUrl: string, file: string = DECISION_FILE): string {
  const url = new URL(pageUrl);
  url.search = '';
  url.hash = '';
  const last = url.pathname.split('/').pop() ?? '';
  if (last !== '' && !last.includes('.')) url.pathname += '/';
  return new URL(file, url).href;
}
