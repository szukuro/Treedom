import { useEffect, useMemo, useState } from 'react';
import type { DecisionTree, Session, TraceEntry, Transition } from '../core';
import { availableChoices, back, choose, describeCondition, describeEffect, getNode, interpolate, startSession } from '../core';
import { RichText } from './RichText';

export interface DecisionTreePlayerProps {
  tree: DecisionTree;
  /** Controlled session (optional). */
  session?: Session;
  onSessionChange?: (s: Session) => void;
  /** Show the state/trace side panel. */
  debug?: boolean;
  /** When set, error messages and the trace link to the editor. */
  onEditNode?: (nodeId: string) => void;
}

/**
 * Plays a decision tree. Works stand-alone (`<DecisionTreePlayer tree={t} />`)
 * or controlled, so a host can share the session with other views.
 */
export function DecisionTreePlayer({ tree, session: controlled, onSessionChange, debug = false, onEditNode }: DecisionTreePlayerProps) {
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
  const prevVars = session.past.length ? session.past[session.past.length - 1].vars : undefined;

  return (
    <div className={`player${debug ? ' with-debug' : ''}`}>
      <div className="player-main">
        <div className="progress muted small">
          Step {session.path.length + 1}
          {session.status === 'finished' && ' · finished'}
        </div>
        {session.status === 'error' ? (
          <div className="card error-card">
            <h2>Something is wrong with this tree</h2>
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
      {debug && <DebugPanel tree={tree} session={session} prevVars={prevVars} onEditNode={onEditNode} />}
    </div>
  );
}

function DebugPanel({
  tree,
  session,
  prevVars,
  onEditNode,
}: {
  tree: DecisionTree;
  session: Session;
  prevVars?: Record<string, number>;
  onEditNode?: (id: string) => void;
}) {
  const [showAllTrace, setShowAllTrace] = useState(false);
  const trace = showAllTrace ? session.trace : session.trace.slice(-40);
  return (
    <aside className="debug">
      <h3>State</h3>
      <table className="state-table">
        <tbody>
          {tree.variables.map((v) => {
            const value = session.vars[v.key] ?? 0;
            const changed = prevVars !== undefined && prevVars[v.key] !== value;
            return (
              <tr key={v.key} className={changed ? 'changed' : value !== v.initial ? 'touched' : ''} title={v.description ?? v.label}>
                <td className="mono">{v.key}</td>
                <td className="value">
                  {changed && <span className="muted small">{prevVars![v.key] ?? 0} → </span>}
                  {value}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h3>
        Trace{' '}
        {session.trace.length > 40 && (
          <button type="button" className="link small" onClick={() => setShowAllTrace(!showAllTrace)}>
            {showAllTrace ? 'show recent' : `show all ${session.trace.length}`}
          </button>
        )}
      </h3>
      <ol className="trace">
        {trace.map((entry, i) => (
          <TraceLine key={i} tree={tree} entry={entry} onEditNode={onEditNode} />
        ))}
      </ol>
    </aside>
  );
}

function TraceLine({ tree, entry, onEditNode }: { tree: DecisionTree; entry: TraceEntry; onEditNode?: (id: string) => void }) {
  const node = getNode(tree, entry.nodeId);
  const choice = entry.choiceId ? node?.choices.find((c) => c.id === entry.choiceId) : undefined;
  const transition = useMemo<Transition | undefined>(() => {
    if (!entry.transitionId || !node) return undefined;
    return [...node.transitions, ...node.choices.flatMap((c) => c.transitions)].find((t) => t.id === entry.transitionId);
  }, [entry.transitionId, node]);
  const nodeLink = (id: string) =>
    onEditNode ? (
      <button type="button" className="link mono" onClick={() => onEditNode(id)}>
        {id}
      </button>
    ) : (
      <span className="mono">{id}</span>
    );
  const effects = entry.effects?.length ? <span className="muted"> [{entry.effects.map(describeEffect).join(', ')}]</span> : null;

  switch (entry.kind) {
    case 'enter':
      return (
        <li className="trace-enter">
          enter {nodeLink(entry.nodeId)}
          {effects}
        </li>
      );
    case 'choose':
      return (
        <li className="trace-choose">
          chose “{choice?.label ?? entry.choiceId}”{effects}
        </li>
      );
    case 'route':
      return (
        <li className="trace-route">
          → {nodeLink(entry.to!)} <span className="muted">via {entry.source} rule “{transition?.label ?? describeCondition(transition?.when)}”</span>
        </li>
      );
  }
}
