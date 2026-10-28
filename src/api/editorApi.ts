/**
 * The single place where the editor's backend is chosen.
 *
 * MVP (serverless): hardcoded credentials + localStorage.
 * To move to a real backend, swap the implementations, e.g.:
 *
 *   import { createHttpAuthApi, getStoredToken } from './http/httpAuthApi';
 *   import { createHttpTreeRepository } from './http/httpTreeRepository';
 *   const BASE = import.meta.env.VITE_API_URL;
 *   export const editorApi: EditorApi = {
 *     auth: createHttpAuthApi(BASE),
 *     trees: createHttpTreeRepository({ baseUrl: BASE, getToken: getStoredToken }),
 *   };
 */
import { createLocalAuthApi } from './local/localAuthApi';
import { createLocalTreeRepository } from './local/localTreeRepository';
import type { AuthApi, TreeRepository } from './types';

export interface EditorApi {
  auth: AuthApi;
  trees: TreeRepository;
}

export const editorApi: EditorApi = {
  auth: createLocalAuthApi(),
  trees: createLocalTreeRepository(),
};
