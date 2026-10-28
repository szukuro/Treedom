import { AuthError, type AuthApi, type AuthSession } from '../types';
import { EDITOR_CREDENTIALS } from './credentials';

const SESSION_KEY = 'treedom:session';

function sessionStore(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Checks against hardcoded credentials; the "session" lives in sessionStorage,
 * so it survives reloads but ends with the browser tab.
 */
export function createLocalAuthApi(credentials = EDITOR_CREDENTIALS): AuthApi {
  return {
    async login(username, password) {
      if (username.trim() !== credentials.username || password !== credentials.password) {
        throw new AuthError('Wrong username or password.');
      }
      const session: AuthSession = { user: { username: credentials.username, displayName: credentials.displayName } };
      sessionStore()?.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    },
    async logout() {
      sessionStore()?.removeItem(SESSION_KEY);
    },
    async currentSession() {
      try {
        const raw = sessionStore()?.getItem(SESSION_KEY);
        return raw ? (JSON.parse(raw) as AuthSession) : null;
      } catch {
        return null;
      }
    },
  };
}
