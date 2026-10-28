/**
 * TEMPLATE – not wired up in the MVP. Shows how `AuthApi` maps onto a typical
 * token-based backend. Adjust endpoints/payloads to your API, then use it in
 * `../editorApi.ts`.
 *
 *   POST {baseUrl}/auth/login   { username, password } → { token, user: { username, displayName } }
 *   POST {baseUrl}/auth/logout
 *   GET  {baseUrl}/auth/me      → { username, displayName }   (401 when signed out)
 */
import { AuthError, type AuthApi, type AuthSession, type AuthUser } from '../types';
import { createHttpClient, HttpError } from './httpClient';

const TOKEN_KEY = 'treedom:token';

export function createHttpAuthApi(baseUrl: string): AuthApi {
  const getToken = () => sessionStorage.getItem(TOKEN_KEY) ?? undefined;
  const request = createHttpClient({ baseUrl, getToken });
  return {
    async login(username, password) {
      try {
        const session = await request<AuthSession>('POST', '/auth/login', { username, password });
        if (session.token) sessionStorage.setItem(TOKEN_KEY, session.token);
        return session;
      } catch (e) {
        if (e instanceof HttpError && (e.status === 401 || e.status === 403)) throw new AuthError('Wrong username or password.');
        throw e;
      }
    },
    async logout() {
      try {
        await request<void>('POST', '/auth/logout');
      } finally {
        sessionStorage.removeItem(TOKEN_KEY);
      }
    },
    async currentSession() {
      const token = getToken();
      if (!token) return null;
      try {
        return { user: await request<AuthUser>('GET', '/auth/me'), token };
      } catch (e) {
        if (e instanceof HttpError && e.status === 401) return null;
        throw e;
      }
    },
  };
}

/** Lets other HTTP services reuse the stored token. */
export const getStoredToken = () => sessionStorage.getItem(TOKEN_KEY) ?? undefined;
