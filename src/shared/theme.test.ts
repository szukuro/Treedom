import { describe, expect, it } from 'vitest';
import { applyTheme, nextThemePreference } from './theme';

describe('theme', () => {
  it('cycles system → light → dark → system', () => {
    expect(nextThemePreference('system')).toBe('light');
    expect(nextThemePreference('light')).toBe('dark');
    expect(nextThemePreference('dark')).toBe('system');
  });
  it('sets or clears data-theme', () => {
    const root = { dataset: {} as Record<string, string> } as unknown as HTMLElement;
    applyTheme('dark', root);
    expect(root.dataset.theme).toBe('dark');
    applyTheme('system', root);
    expect(root.dataset.theme).toBeUndefined();
  });
});
