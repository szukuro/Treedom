import { useState, type FormEvent } from 'react';
import { AuthError, type AuthApi, type AuthSession } from '../api/types';

export function LoginScreen({ auth, onLogin }: { auth: AuthApi; onLogin: (s: AuthSession) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      onLogin(await auth.login(username, password));
    } catch (err) {
      setError(err instanceof AuthError ? err.message : `Login failed: ${(err as Error).message}`);
      setPending(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="card login-card" onSubmit={submit}>
        <h1>
          <span className="logo">🌳</span> Treedom Editor
        </h1>
        <p className="muted">Sign in to create and edit decision trees.</p>
        <label className="field">
          <span>Username</span>
          <input autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && (
          <p className="error-text small" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary" disabled={pending || !username || !password}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
