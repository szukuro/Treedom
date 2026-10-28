/**
 * Light / dark theme preference. `system` follows the OS (prefers-color-scheme);
 * `light` / `dark` force a theme via `data-theme` on <html>, which the CSS tokens
 * in base.css key off. The choice is a per-browser UI preference (localStorage),
 * shared by the editor and the viewer when they're on the same origin.
 *
 * index.html applies the stored value with a tiny inline script before the app
 * loads, so there's no flash of the wrong theme; keep THEME_STORAGE_KEY in sync.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'treedom:theme';
const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

export function getThemePreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(pref: ThemePreference, root: HTMLElement = document.documentElement) {
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;
}

export function setThemePreference(pref: ThemePreference) {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* storage unavailable – still apply for this page view */
  }
  applyTheme(pref);
}

export function nextThemePreference(pref: ThemePreference): ThemePreference {
  return ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
}
