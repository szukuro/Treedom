/** Per-browser UI preferences. Deliberately not part of the API layer: they never need a server. */
const LAST_OPEN_KEY = 'treedom:lastOpen';

export function getLastOpenTreeId(): string | null {
  try {
    return localStorage.getItem(LAST_OPEN_KEY);
  } catch {
    return null;
  }
}

export function setLastOpenTreeId(id: string) {
  try {
    localStorage.setItem(LAST_OPEN_KEY, id);
  } catch {
    /* ignore */
  }
}
