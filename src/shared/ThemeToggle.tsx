import { useState } from 'react';
import { getThemePreference, nextThemePreference, setThemePreference, type ThemePreference } from './theme';

const ICON: Record<ThemePreference, string> = { system: '◐', light: '☀', dark: '☾' };

export interface ThemeToggleLabels {
  auto: string;
  light: string;
  dark: string;
  label: string;
}
const ENGLISH: ThemeToggleLabels = { auto: 'Auto', light: 'Light', dark: 'Dark', label: 'Theme' };

/** Cycles Auto (follow OS) → Light → Dark. `labels` lets the viewer show it in the player's language. */
export function ThemeToggle({ className = '', labels = ENGLISH }: { className?: string; labels?: ThemeToggleLabels }) {
  const [pref, setPref] = useState<ThemePreference>(getThemePreference);
  const next = nextThemePreference(pref);
  const LABEL: Record<ThemePreference, { icon: string; text: string }> = {
    system: { icon: ICON.system, text: labels.auto },
    light: { icon: ICON.light, text: labels.light },
    dark: { icon: ICON.dark, text: labels.dark },
  };
  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      title={`${labels.label}: ${LABEL[pref].text} → ${LABEL[next].text}`}
      aria-label={`${labels.label}: ${LABEL[pref].text} → ${LABEL[next].text}`}
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
