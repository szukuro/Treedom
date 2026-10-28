import { useMemo, useState } from 'react';
import type { DecisionTree, Session, TraceEntry, Transition } from '../core';
import { describeCondition, describeEffect, getNode } from '../core';
import { DecisionTreePlayer } from '../player/DecisionTreePlayer';

/**
 * The editor's "Preview": the same player end users get in the viewer, next to a
 * live state table and a step-by-step trace of which rule fired.
 */
export function Preview({
  tree,
  session,
  onSessionChange,
  onEditNode,
}: {
  tree: DecisionTree;
  session: Session;
  onSessionChange: (s: Session) => void;
  onEditNode: (nodeId: string) => void;
}) {
  const prevVars = session.past.length ? session.past[session.past.length - 1].vars : undefined;
  return (
    <div className="preview">
      <div className="preview-frame">
        <div className="preview-label muted small">Preview – this is what visitors of the viewer see</div>
        <DecisionTreePlayer tree={tree} session={session} onSessionChange={onSessionChange} onEditNode={onEditNode} />
      </div>
      <DebugPanel tree={tree} session={session} prevVars={prevVars} onEditNode={onEditNode} />
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
