import { useEffect, useState } from 'react';
import { browserLanguages, resolveInitialLocale, treeText, type Locale } from '../core';
import { DecisionTreePlayer } from '../player/DecisionTreePlayer';
import { PLAYER_STRINGS } from '../player/strings';
import { ThemeToggle } from '../shared/ThemeToggle';
import { viewerApi } from '../api/viewerApi';
import type { PublishedTree, PublishedTreeSource } from '../api/types';
import { resolveDecisionUrl } from './resolveDecisionUrl';
import './viewer.css';

export interface DecisionTreeViewerProps {
  /**
   * Where to load the tree from. Defaults to `decision.json` next to the current
   * page, e.g. `example.com/decision/index.html` → `example.com/decision/decision.json`.
   */
  src?: string;
  /** Show the tree's title and description above the player (default true). */
  showHeader?: boolean;
  /** Override the data source (defaults to `viewerApi.published`). */
  source?: PublishedTreeSource;
  /**
   * Language to start in ("hu", "de", …). Precedence: this parameter, then the
   * browser's preferred languages (if the tree is translated into one), then English.
   */
  language?: string;
}

type State = { status: 'loading' } | { status: 'ready'; data: PublishedTree } | { status: 'failed'; message: string };

/**
 * Standalone, read-only viewer: fetches a published tree JSON from the server and
 * plays it. Has no editor code, login or localStorage – deploy it as static files
 * together with the `decision.json` exported from the editor.
 */
export function DecisionTreeViewer({ src, showHeader = true, source = viewerApi.published, language }: DecisionTreeViewerProps) {
  const url = src ?? resolveDecisionUrl(window.location.href);
  const [state, setState] = useState<State>({ status: 'loading' });
  // Before the tree is loaded we don't know its languages; use the same precedence over all supported ones.
  const [locale, setLocale] = useState<Locale>(() => resolveInitialLocale(language, browserLanguages()));
  const t = PLAYER_STRINGS[locale];

  // Keep <html lang> and the page title in the active language.
  useEffect(() => {
    document.documentElement.lang = locale;
    if (state.status === 'ready') document.title = treeText(state.data.tree, 'title', locale);
  }, [locale, state]);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    source
      .load(url, controller.signal)
      .then((data) => {
        setState({ status: 'ready', data });
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setState({ status: 'failed', message: e.message });
      });
    return () => controller.abort();
  }, [url, source]);

  if (state.status === 'loading') {
    return (
      <div className="viewer">
        <p className="viewer-status muted">{t.loading}</p>
      </div>
    );
  }
  if (state.status === 'failed') {
    return (
      <div className="viewer">
        <ThemeToggle className="theme-toggle-corner" labels={t.theme} />
        <div className="card error-card">
          <h2>{t.notAvailable}</h2>
          <p>{state.message}</p>
          <p className="muted small">{t.expectsFile}</p>
        </div>
      </div>
    );
  }

  const { tree, errors } = state.data;
  return (
    <div className="viewer">
      <ThemeToggle className="theme-toggle-corner" labels={t.theme} />
      {errors.length > 0 && (
        <p className="viewer-warning small" title={errors.map((e) => e.message).join('\n')}>
          {t.configProblems(errors.length)}
        </p>
      )}
      <DecisionTreePlayer tree={tree} language={language} showHeader={showHeader} onLanguageChange={setLocale} />
    </div>
  );
}
