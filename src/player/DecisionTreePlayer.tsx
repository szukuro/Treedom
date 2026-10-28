import { useEffect, useMemo, useState } from 'react';
import './player.css';
import type { DecisionTree, Locale, Session } from '../core';
import {
  availableChoices,
  availableLocales,
  back,
  browserLanguages,
  choiceText,
  choose,
  ctaText,
  getNode,
  interpolate,
  LOCALE_NAMES,
  nodeText,
  resolveInitialLocale,
  startSession,
  treeText,
} from '../core';
import { RichText } from './RichText';
import { PLAYER_STRINGS } from './strings';

export interface DecisionTreePlayerProps {
  tree: DecisionTree;
  /**
   * Language to start in ("hu", "de-AT", …). Takes precedence over the browser's
   * preferred languages; English is the final fallback. The user can still switch.
   */
  language?: string;
  /** Called with the active language initially and whenever the user switches. */
  onLanguageChange?: (locale: Locale) => void;
  /** Show the tree's title and description above the questions. */
  showHeader?: boolean;
  /** Controlled session (optional). */
  session?: Session;
  onSessionChange?: (s: Session) => void;
  /** When set, the error card offers to open the broken node (used by the editor's Preview). */
  onEditNode?: (nodeId: string) => void;
}

/**
 * Renders and runs a decision tree: the current question / outcome, its choices,
 * Back and Start over, and a language switcher when the tree is translated.
 * Pure presentation over the core engine – it knows nothing about where the
 * tree came from. Shared by the standalone viewer and the editor's Preview tab.
 *
 * Works uncontrolled (`<DecisionTreePlayer tree={t} />`) or controlled, so a host
 * can share the session with other views (the editor's graph and debug panel).
 */
export function DecisionTreePlayer({
  tree,
  language,
  onLanguageChange,
  showHeader = false,
  session: controlled,
  onSessionChange,
  onEditNode,
}: DecisionTreePlayerProps) {
  const [internal, setInternal] = useState<Session>(() => controlled ?? startSession(tree));
  const session = controlled ?? internal;
  const setSession = (s: Session) => {
    if (!controlled) setInternal(s);
    onSessionChange?.(s);
  };

  // Uncontrolled: restart when a different tree is passed in.
  useEffect(() => {
    if (!controlled) setInternal(startSession(tree));
  }, [tree.id]);

  const locales = useMemo(() => availableLocales(tree), [tree]);
  const [locale, setLocale] = useState<Locale>(() => resolveInitialLocale(language, browserLanguages(), locales));
  // Re-resolve when the requested language changes.
  useEffect(() => setLocale(resolveInitialLocale(language, browserLanguages(), locales)), [language]);
  useEffect(() => onLanguageChange?.(locale), [locale]);

  const t = PLAYER_STRINGS[locale];
  const node = getNode(tree, session.nodeId);
  const choices = availableChoices(tree, session);
  const text = (s: string) => interpolate(s, session.vars);
  const ctaLabel = node ? ctaText(node, locale) : '';
  const description = treeText(tree, 'description', locale);

  return (
    <div className="player" lang={locale}>
      {showHeader && (
        <header className="player-header">
          <h1>{treeText(tree, 'title', locale)}</h1>
          {description && <p className="muted">{description}</p>}
        </header>
      )}
      <div className="player-top">
        <div className="progress muted small">
          {t.step(session.path.length + 1)}
          {session.status === 'finished' && ` · ${t.finished}`}
        </div>
        {(locales.length > 1 || !locales.includes(locale)) && (
          <div className="language-switch" role="group" aria-label={t.language}>
            {(locales.includes(locale) ? locales : [...locales, locale]).map((l) => (
              <button
                type="button"
                key={l}
                className={l === locale ? 'active' : ''}
                aria-pressed={l === locale}
                lang={l}
                title={LOCALE_NAMES[l].native}
                onClick={() => setLocale(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
      {session.status === 'error' ? (
        <div className="card error-card">
          <h2>{t.errorTitle}</h2>
          <p>{session.error}</p>
          {onEditNode && node && (
            <button type="button" onClick={() => onEditNode(node.id)}>
              Edit “{node.id}”
            </button>
          )}
        </div>
      ) : node ? (
        <div className={`card node-card kind-${node.kind}${node.outcome ? ` tone-${node.outcome.tone}` : ''}`}>
          {node.kind === 'outcome' && <div className="outcome-label">{t.recommendation}</div>}
          <h2>{text(nodeText(node, 'title', locale))}</h2>
          <div className="body">
            <RichText text={text(nodeText(node, 'body', locale))} />
          </div>
          {node.outcome?.cta?.url && (
            <a className="cta" href={node.outcome.cta.url} target="_blank" rel="noreferrer">
              {ctaLabel || t.ctaFallback}
            </a>
          )}
          {choices.length > 0 && (
            <div className="choices">
              {choices.map((c) => {
                const desc = choiceText(c, 'description', locale);
                return (
                  <button type="button" key={c.id} className="choice" onClick={() => setSession(choose(tree, session, c.id))}>
                    <span>{text(choiceText(c, 'label', locale))}</span>
                    {desc && <span className="muted small">{text(desc)}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
      <div className="player-nav">
        <button type="button" onClick={() => setSession(back(session))} disabled={session.past.length === 0}>
          {t.back}
        </button>
        <button type="button" onClick={() => setSession(startSession(tree))}>
          {t.startOver}
        </button>
      </div>
    </div>
  );
}
