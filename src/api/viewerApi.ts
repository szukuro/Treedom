/**
 * The single place where the viewer's data source is chosen. The viewer bundle
 * imports only this file, so none of the editor's auth/storage code ships to
 * visitors.
 */
import { createFetchPublishedTreeSource } from './http/fetchPublishedTreeSource';
import type { PublishedTreeSource } from './types';

export interface ViewerApi {
  published: PublishedTreeSource;
}

export const viewerApi: ViewerApi = {
  published: createFetchPublishedTreeSource(),
};
