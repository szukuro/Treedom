import { useEffect, useState } from 'react';
import './player.css';
import type { DecisionTree, Session } from '../core';
import { availableChoices, back, choose, getNode, interpolate, startSession } from '../core';
import { RichText } from './RichText';

export interface DecisionTreePlayerProps {
  tree: DecisionTree;
  /** Controlled session (optional). */
  session?: Session;
  onSessionChange?: (s: Session) => void;
  /** When set, the error card offers to open the broken node (used by the editor's Preview). */
  onEditNode?: (nodeId: string) => void;
}

/**
 * Renders and runs a decision tree: the current question / outcome, its choices,
 * Back and Start over. Pure presentation over the core engine – it knows nothing
 * about where the tree came from. Shared by the standalone viewer and the
 * editor's Preview tab.
 *
 * Works uncontrolled (`<DecisionTreePlayer tree={t} />`) or controlled, so a host
 * can share the session with other views (the editor's graph and debug panel).
 */
export function DecisionTreePlayer({ tree, session: controlled, onSessionChange, onEditNode }: DecisionTreePlayerProps) {
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

  const node = getNode(tree, session.nodeId);
  const choices = availableChoices(tree, session);

  return (
    <div className="player">
      <div className="progress muted small">
        Step {session.path.length + 1}
        {session.status === 'finished' && ' · finished'}
      </div>
      {session.status === 'error' ? (
        <div className="card error-card">
          <h2>Sorry, this questionnaire can't continue</h2>
          <p>{session.error}</p>
          {onEditNode && node && (
            <button type="button" onClick={() => onEditNode(node.id)}>
              Edit “{node.id}”
            </button>
          )}
        </div>
      ) : node ? (
        <div className={`card node-card kind-${node.kind}${node.outcome ? ` tone-${node.outcome.tone}` : ''}`}>
          {node.kind === 'outcome' && <div className="outcome-label">Recommendation</div>}
          <h2>{interpolate(node.title, session.vars)}</h2>
          <div className="body">
            <RichText text={interpolate(node.body, session.vars)} />
          </div>
          {node.outcome?.cta?.url && (
            <a className="cta" href={node.outcome.cta.url} target="_blank" rel="noreferrer">
              {node.outcome.cta.label || 'Continue'}
            </a>
          )}
          {choices.length > 0 && (
            <div className="choices">
              {choices.map((c) => (
                <button type="button" key={c.id} className="choice" onClick={() => setSession(choose(tree, session, c.id))}>
                  <span>{interpolate(c.label, session.vars)}</span>
                  {c.description && <span className="muted small">{interpolate(c.description, session.vars)}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
      <div className="player-nav">
        <button type="button" onClick={() => setSession(back(session))} disabled={session.past.length === 0}>
          ← Back
        </button>
        <button type="button" onClick={() => setSession(startSession(tree))}>
          ↺ Start over
      </button>
    </div>
    </div>
  );
}
