import { useState } from 'react';
import { getThemePreference, nextThemePreference, setThemePreference, type ThemePreference } from './theme';

const LABEL: Record<ThemePreference, { icon: string; text: string }> = {
  system: { icon: '◐', text: 'Auto' },
  light: { icon: '☀', text: 'Light' },
  dark: { icon: '☾', text: 'Dark' },
};

/** Cycles Auto (follow OS) → Light → Dark. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [pref, setPref] = useState<ThemePreference>(getThemePreference);
  const next = nextThemePreference(pref);
  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      title={`Theme: ${LABEL[pref].text}. Click for ${LABEL[next].text}.`}
      aria-label={`Theme: ${LABEL[pref].text}. Switch to ${LABEL[next].text}.`}
      onClick={() => {
        setThemePreference(next);
        setPref(next);
      }}
    >
      <span aria-hidden="true">{LABEL[pref].icon}</span>
      <span className="small">{LABEL[pref].text}</span>
    </button>
  );
}
