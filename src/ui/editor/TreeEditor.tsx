import { useMemo, useState } from 'react';
import type { Issue, NodeKind } from '../../core';
import { reachableNodes } from '../../core';
import { useTree } from '../TreeContext';
import { NodeSelect } from './fields';
import { NodeEditor } from './NodeEditor';
import { VariablesPanel } from './VariablesPanel';

export type EditorSelection = { type: 'settings' } | { type: 'variables' } | { type: 'node'; id: string };

const KIND_ICON: Record<NodeKind, string> = { question: '?', router: '⑂', outcome: '★' };

export function TreeEditor({
  selection,
  onSelect,
  issues,
  onPlayFrom,
}: {
  selection: EditorSelection;
  onSelect: (s: EditorSelection) => void;
  issues: Issue[];
  onPlayFrom: (nodeId: string) => void;
}) {
  const { tree, createNode } = useTree();
  const [filter, setFilter] = useState('');
  const reachable = useMemo(() => reachableNodes(tree), [tree]);

  const issuesByNode = useMemo(() => {
    const map = new Map<string, Issue[]>();
    for (const i of issues) if (i.nodeId) map.set(i.nodeId, [...(map.get(i.nodeId) ?? []), i]);
    return map;
  }, [issues]);

  const nodes = tree.nodes.filter((n) => {
    const q = filter.trim().toLowerCase();
    return !q || n.id.toLowerCase().includes(q) || n.title.toLowerCase().includes(q);
  });

  const selectedNode = selection.type === 'node' ? tree.nodes.find((n) => n.id === selection.id) : undefined;
  const add = (kind: NodeKind) => onSelect({ type: 'node', id: createNode(kind, kind === 'question' ? 'New question' : kind === 'router' ? 'New router' : 'New outcome') });

  return (
    <div className="editor">
      <aside className="sidebar">
        <button type="button" className={`side-item${selection.type === 'settings' ? ' active' : ''}`} onClick={() => onSelect({ type: 'settings' })}>
          ⚙ Tree settings
        </button>
        <button type="button" className={`side-item${selection.type === 'variables' ? ' active' : ''}`} onClick={() => onSelect({ type: 'variables' })}>
          𝑥 State variables <span className="count">{tree.variables.length}</span>
        </button>
        <div className="side-heading">
          Nodes <span className="count">{tree.nodes.length}</span>
        </div>
        <input className="filter" placeholder="Filter nodes…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="node-list">
          {nodes.map((n) => {
            const nodeIssues = issuesByNode.get(n.id) ?? [];
            const hasError = nodeIssues.some((i) => i.level === 'error');
            return (
              <button
                type="button"
                key={n.id}
                className={`side-item node-item kind-${n.kind}${selectedNode?.id === n.id ? ' active' : ''}${reachable.has(n.id) ? '' : ' unreachable'}`}
                onClick={() => onSelect({ type: 'node', id: n.id })}
                title={reachable.has(n.id) ? n.title : `${n.title} (unreachable)`}
              >
                <span className="kind-icon">{KIND_ICON[n.kind]}</span>
                <span className="node-item-text">
                  <span className="mono">{n.id}</span>
                  <span className="muted small ellipsis">{n.title}</span>
                </span>
                {tree.startNodeId === n.id && <span className="pill start">start</span>}
                {nodeIssues.length > 0 && <span className={`dot ${hasError ? 'error' : 'warning'}`} title={nodeIssues.map((i) => i.message).join('\n')} />}
              </button>
            );
          })}
        </div>
        <div className="add-node">
          <button type="button" onClick={() => add('question')} title="Add a question node">
            + Question
          </button>
          <button type="button" onClick={() => add('router')} title="Add a router (automatic branching) node">
            + Router
          </button>
          <button type="button" onClick={() => add('outcome')} title="Add an outcome node">
            + Outcome
          </button>
        </div>
      </aside>

      <main className="editor-main">
        <IssuesBar issues={issues} onSelect={(id) => onSelect({ type: 'node', id })} />
        {selection.type === 'settings' && <TreeSettings />}
        {selection.type === 'variables' && <VariablesPanel />}
        {selection.type === 'node' &&
          (selectedNode ? (
            <NodeEditor key={selectedNode.id} node={selectedNode} onPlayFrom={() => onPlayFrom(selectedNode.id)} />
          ) : (
            <p className="muted">Select a node on the left, or add a new one.</p>
          ))}
      </main>
    </div>
  );
}

function TreeSettings() {
  const { tree, update } = useTree();
  return (
    <div className="tree-settings">
      <h2>Tree settings</h2>
      <label className="field">
        <span>Title</span>
        <input value={tree.title} onChange={(e) => update((t) => ({ ...t, title: e.target.value }), 'title')} />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea rows={3} value={tree.description} onChange={(e) => update((t) => ({ ...t, description: e.target.value }), 'description')} />
      </label>
      <label className="field">
        <span>Start node</span>
        <NodeSelect value={tree.startNodeId} onChange={(startNodeId) => update((t) => ({ ...t, startNodeId }))} />
      </label>
      <h3>How it works</h3>
      <ul className="help">
        <li>
          <b>Questions</b> show text and choices. A choice can be hidden by a <i>show-if</i> condition, applies <i>effects</i> to state variables, and then
          follows its own <i>transitions</i> – or, if none match, the node’s default routing.
        </li>
        <li>
          <b>Routers</b> are invisible decision points that branch purely on state (e.g. a scoring step at the end).
        </li>
        <li>
          <b>Outcomes</b> are result screens; they can still offer choices that loop back into the tree.
        </li>
        <li>
          Transitions are evaluated top to bottom; the first one whose condition holds wins. A transition without a condition always matches – keep it last as
          the “else”.
        </li>
        <li>
          Conditions compare variables with numbers or other variables, combine with AND / OR / NOT, and can check whether a node was <i>visited</i> –
          which makes loops and “skip if already asked” flows possible.
        </li>
      </ul>
    </div>
  );
}

function IssuesBar({ issues, onSelect }: { issues: Issue[]; onSelect: (nodeId: string) => void }) {
  const [open, setOpen] = useState(false);
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.length - errors;
  if (issues.length === 0) return <div className="issues ok">✓ No problems found</div>;
  return (
    <div className={`issues ${errors ? 'has-errors' : 'has-warnings'}`}>
      <button type="button" className="issues-toggle" onClick={() => setOpen(!open)}>
        {open ? '▾' : '▸'} {errors > 0 && `${errors} error${errors > 1 ? 's' : ''}`}
        {errors > 0 && warnings > 0 && ', '}
        {warnings > 0 && `${warnings} warning${warnings > 1 ? 's' : ''}`}
      </button>
      {open && (
        <ul>
          {issues.map((issue, i) => (
            <li key={i} className={issue.level}>
              {issue.nodeId ? (
                <button type="button" className="link mono" onClick={() => onSelect(issue.nodeId!)}>
                  {issue.nodeId}
                </button>
              ) : null}{' '}
              {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
