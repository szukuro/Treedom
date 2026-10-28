/**
 * TEMPLATE – not wired up in the MVP. A REST implementation of `TreeRepository`:
 *
 *   GET    {baseUrl}/trees        → TreeSummary[]
 *   GET    {baseUrl}/trees/:id    → DecisionTree        (404 when missing)
 *   PUT    {baseUrl}/trees/:id    DecisionTree → DecisionTree
 *   DELETE {baseUrl}/trees/:id
 *
 * A "publish" endpoint could then write the tree to wherever the viewer's
 * `decision.json` is served from.
 */
import { parseTree, type DecisionTree } from '../../core';
import type { TreeRepository, TreeSummary } from '../types';
import { createHttpClient, HttpError, type HttpClientOptions } from './httpClient';

export function createHttpTreeRepository(options: HttpClientOptions): TreeRepository {
  const request = createHttpClient(options);
  const path = (id: string) => `/trees/${encodeURIComponent(id)}`;
  return {
    list: () => request<TreeSummary[]>('GET', '/trees'),
    async load(id) {
      try {
        return parseTree(await request<unknown>('GET', path(id)));
      } catch (e) {
        if (e instanceof HttpError && e.status === 404) return null;
        throw e;
      }
    },
    async save(tree: DecisionTree) {
      return parseTree(await request<unknown>('PUT', path(tree.id), tree));
    },
    remove: (id) => request<void>('DELETE', path(id)),
  };
}
