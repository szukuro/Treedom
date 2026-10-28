import { useEffect, useState } from 'react';
import { DecisionTreePlayer } from '../player/DecisionTreePlayer';
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
}

type State = { status: 'loading' } | { status: 'ready'; data: PublishedTree } | { status: 'failed'; message: string };

/**
 * Standalone, read-only viewer: fetches a published tree JSON from the server and
 * plays it. Has no editor code, login or localStorage – deploy it as static files
 * together with the `decision.json` exported from the editor.
 */
export function DecisionTreeViewer({ src, showHeader = true, source = viewerApi.published }: DecisionTreeViewerProps) {
  const url = src ?? resolveDecisionUrl(window.location.href);
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    source
      .load(url, controller.signal)
      .then((data) => {
        setState({ status: 'ready', data });
        document.title = data.tree.title;
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setState({ status: 'failed', message: e.message });
      });
    return () => controller.abort();
  }, [url, source]);

  if (state.status === 'loading') {
    return (
      <div className="viewer">
        <p className="viewer-status muted">Loading…</p>
      </div>
    );
  }
  if (state.status === 'failed') {
    return (
      <div className="viewer">
        <div className="card error-card">
          <h2>This questionnaire is not available</h2>
          <p>{state.message}</p>
          <p className="muted small">
            The viewer expects a <code>decision.json</code> exported from the Treedom editor in the same folder as this page.
          </p>
        </div>
      </div>
    );
  }

  const { tree, errors } = state.data;
  return (
    <div className="viewer">
      {showHeader && (
        <header className="viewer-header">
          <h1>{tree.title}</h1>
          {tree.description && <p className="muted">{tree.description}</p>}
        </header>
      )}
      {errors.length > 0 && (
        <p className="viewer-warning small" title={errors.map((e) => e.message).join('\n')}>
          This questionnaire has {errors.length} configuration problem(s); some answers may not lead anywhere.
        </p>
      )}
      <DecisionTreePlayer tree={tree} />
    </div>
  );
}
