import { useEffect, useState } from 'react';
import { editorApi, type EditorApi } from '../api/editorApi';
import type { AuthSession } from '../api/types';
import { EditorStudio } from './EditorStudio';
import { LoginScreen } from './LoginScreen';
import './editor.css';

/**
 * The editor application: login gate + studio. Everything backend-related
 * comes from `api` (defaults to `src/api/editorApi.ts`).
 */
export function EditorApp({ api = editorApi }: { api?: EditorApi }) {
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);

  useEffect(() => {
    api.auth
      .currentSession()
      .then(setSession)
      .catch(() => setSession(null));
  }, [api]);

  if (session === undefined) return <div className="center-screen muted">Loading…</div>;
  if (!session) return <LoginScreen auth={api.auth} onLogin={setSession} />;
  return (
    <EditorStudio
      trees={api.trees}
      user={session.user}
      onLogout={() => {
        void api.auth.logout().finally(() => setSession(null));
      }}
    />
  );
}
