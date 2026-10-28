import { parseTree, validateTree } from '../../core';
import { TreeLoadError, type PublishedTreeSource } from '../types';

/**
 * Fetches a published tree over HTTP. In the MVP that's a static `decision.json`
 * next to the viewer page, but any endpoint returning the same JSON works.
 * Bypasses the HTTP cache so a re-published file shows up immediately.
 */
export function createFetchPublishedTreeSource(init: RequestInit = {}): PublishedTreeSource {
  return {
    async load(url, signal) {
      let response: Response;
      try {
        response = await fetch(url, { cache: 'no-cache', ...init, signal });
      } catch (e) {
        if (signal?.aborted) throw e;
        throw new TreeLoadError(`Could not reach ${url}: ${(e as Error).message}`);
      }
      if (!response.ok) throw new TreeLoadError(`Could not load ${url} (HTTP ${response.status}).`);
      const text = await response.text();
      try {
        const tree = parseTree(text);
        return { tree, errors: validateTree(tree).filter((i) => i.level === 'error') };
      } catch (e) {
        throw new TreeLoadError(`${url} is not a valid decision tree: ${(e as Error).message}`);
      }
    },
  };
}
