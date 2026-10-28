import { useId, useState, type ReactNode } from 'react';
import type { LocalizedText, TranslationLocale } from '../../core';
import { LOCALE_NAMES, TRANSLATION_LOCALES } from '../../core';

type Tab = 'main' | TranslationLocale;

/**
 * A text input for player-visible content, with one tab per language. The first
 * tab is the field itself ("Title", "Text", …) and holds the main (English) text;
 * the other tabs hold the Hungarian and German translations. Missing
 * translations fall back to English in the player.
 */
export function LocalizedField({
  label,
  hint,
  value,
  onChange,
  translations,
  onTranslationChange,
  multiline = false,
  rows = 4,
  placeholder,
  className = '',
  inputClassName = '',
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  translations: LocalizedText | undefined;
  onTranslationChange: (locale: TranslationLocale, value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  const [tab, setTab] = useState<Tab>('main');
  const id = useId();
  const current = tab === 'main' ? value : (translations?.[tab] ?? '');
  const set = (v: string) => (tab === 'main' ? onChange(v) : onTranslationChange(tab, v));
  const inputProps = {
    id: `${id}-${tab}`,
    className: inputClassName,
    value: current,
    lang: tab === 'main' ? 'en' : tab,
    placeholder: tab === 'main' ? placeholder : value ? `${value.split('\n')[0]}` : `${LOCALE_NAMES[tab].english} text`,
    'aria-labelledby': `${id}-tab-${tab}`,
    onChange: (e: { target: { value: string } }) => set(e.target.value),
  };

  return (
    <div className={`field localized ${className}`.trim()}>
      <div className="lang-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          id={`${id}-tab-main`}
          aria-selected={tab === 'main'}
          className={tab === 'main' ? 'active' : ''}
          onClick={() => setTab('main')}
          title="Main language (English)"
        >
          {label}
        </button>
        {TRANSLATION_LOCALES.map((locale) => {
          const done = !!translations?.[locale]?.trim();
          const status = !value.trim() ? '' : done ? 'done' : 'missing';
          return (
            <button
              type="button"
              role="tab"
              key={locale}
              id={`${id}-tab-${locale}`}
              aria-selected={tab === locale}
              className={`${tab === locale ? 'active' : ''} ${status}`.trim()}
              onClick={() => setTab(locale)}
              title={status === 'missing' ? `${LOCALE_NAMES[locale].english} translation missing – English is shown instead` : LOCALE_NAMES[locale].english}
            >
              {LOCALE_NAMES[locale].english}
              {status && <span className={`lang-dot ${status}`} aria-label={status === 'done' ? 'translated' : 'missing'} />}
            </button>
          );
        })}
        {hint && <span className="lang-hint muted small">{hint}</span>}
      </div>
      {multiline ? <textarea rows={rows} {...inputProps} /> : <input {...inputProps} />}
      {tab !== 'main' && value && (
        <div className="lang-reference muted small" title="Main (English) text">
          <span className="pill">EN</span> {value}
        </div>
      )}
    </div>
  );
}
