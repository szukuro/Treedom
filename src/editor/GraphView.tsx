import { useEffect, useMemo, useRef, useState } from 'react';
import type { DecisionTree, NodeKind, Session } from '../core';
import { describeCondition } from '../core';

const W = 200;
const H = 60;
const COL_GAP = 80;
const ROW_GAP = 28;
const PAD = 40;

interface Edge {
  from: string;
  to: string;
  labels: string[];
  conditional: boolean;
}

interface Layout {
  pos: Map<string, { x: number; y: number; col: number }>;
  width: number;
  height: number;
  edges: Edge[];
}

/**
 * Layered layout. Back edges (found by DFS from the start node) are ignored, the
 * rest forms a DAG whose longest-path depth is the node's column. Unreachable
 * nodes go to an extra last column. Rows are ordered by the average row of each
 * node's predecessors to reduce crossings.
 */
function layout(tree: DecisionTree): Layout {
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const targets = (id: string) => {
    const node = byId.get(id);
    if (!node) return [];
    return [...new Set([...node.choices.flatMap((c) => c.transitions), ...node.transitions].map((t) => t.to))].filter((t) => byId.has(t));
  };

  // DFS to classify back edges.
  const back = new Set<string>();
  const state = new Map<string, 'open' | 'done'>();
  const dfsOrder: string[] = [];
  const dfs = (id: string) => {
    state.set(id, 'open');
    for (const t of targets(id)) {
      if (state.get(t) === 'open') back.add(`${id}→${t}`);
      else if (!state.has(t)) dfs(t);
    }
    state.set(id, 'done');
    dfsOrder.push(id);
  };
  if (byId.has(tree.startNodeId)) dfs(tree.startNodeId);

  // Longest path over forward edges, processed in topological order (reverse post-order).
  const depth = new Map<string, number>();
  const preds = new Map<string, string[]>();
  for (const id of [...dfsOrder].reverse()) {
    if (!depth.has(id)) depth.set(id, 0);
    for (const t of targets(id)) {
      if (back.has(`${id}→${t}`)) continue;
      depth.set(t, Math.max(depth.get(t) ?? 0, depth.get(id)! + 1));
      preds.set(t, [...(preds.get(t) ?? []), id]);
    }
  }
  const maxDepth = Math.max(0, ...depth.values());
  for (const n of tree.nodes) if (!depth.has(n.id)) depth.set(n.id, maxDepth + 1);

  const columnsRaw = new Map<number, string[]>();
  for (const n of tree.nodes) {
    const d = depth.get(n.id)!;
    columnsRaw.set(d, [...(columnsRaw.get(d) ?? []), n.id]);
  }
  // Barycentric ordering, column by column.
  const row = new Map<string, number>();
  const columns = new Map<number, string[]>();
  for (const col of [...columnsRaw.keys()].sort((a, b) => a - b)) {
    const ids = columnsRaw.get(col)!;
    const score = (id: string) => {
      const ps = (preds.get(id) ?? []).filter((p) => row.has(p));
      return ps.length ? ps.reduce((sum, p) => sum + row.get(p)!, 0) / ps.length : ids.indexOf(id);
    };
    const sorted = [...ids].sort((a, b) => score(a) - score(b));
    sorted.forEach((id, i) => row.set(id, i - (sorted.length - 1) / 2));
    columns.set(col, sorted);
  }

  const tallest = Math.max(1, ...[...columns.values()].map((c) => c.length));
  const height = PAD * 2 + tallest * H + (tallest - 1) * ROW_GAP;
  const pos = new Map<string, { x: number; y: number; col: number }>();
  for (const [col, ids] of columns) {
    const colHeight = ids.length * H + (ids.length - 1) * ROW_GAP;
    const top = (height - colHeight) / 2;
    ids.forEach((id, i) => pos.set(id, { x: PAD + col * (W + COL_GAP), y: top + i * (H + ROW_GAP), col }));
  }
  const width = PAD * 2 + (columns.size ? Math.max(...columns.keys()) + 1 : 1) * (W + COL_GAP) - COL_GAP;

  const edgeMap = new Map<string, Edge>();
  const addEdge = (from: string, to: string, label: string, conditional: boolean) => {
    if (!byId.has(to)) return;
    const key = `${from}→${to}`;
    const e = edgeMap.get(key) ?? { from, to, labels: [], conditional: true };
    e.labels.push(label);
    e.conditional = e.conditional && conditional;
    edgeMap.set(key, e);
  };
  for (const n of tree.nodes) {
    for (const c of n.choices) {
      for (const t of c.transitions) addEdge(n.id, t.to, `“${c.label}”${t.when ? ` if ${describeCondition(t.when)}` : ''}`, !!t.when);
    }
    for (const t of n.transitions) addEdge(n.id, t.to, t.label ?? (t.when ? `if ${describeCondition(t.when)}` : 'otherwise'), !!t.when);
  }
  return { pos, width, height: height + 60, edges: [...edgeMap.values()] };
}

function edgePath(a: { x: number; y: number; col: number }, b: { x: number; y: number; col: number }, selfLoop: boolean): string {
  if (selfLoop) {
    const x = a.x + W;
    const y = a.y + H / 2;
    return `M ${x} ${y - 10} C ${x + 50} ${y - 50}, ${x + 50} ${y + 50}, ${x} ${y + 10}`;
  }
  if (b.col > a.col) {
    const sx = a.x + W;
    const sy = a.y + H / 2;
    const tx = b.x;
    const ty = b.y + H / 2;
    const dx = (tx - sx) / 2;
    return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
  }
  // Backward or same-column edge: arc below the nodes.
  const sx = a.x + W / 2;
  const sy = a.y + H;
  const tx = b.x + W / 2;
  const ty = b.y + H;
  const drop = 40 + Math.abs(sx - tx) * 0.15;
  return `M ${sx} ${sy} C ${sx} ${Math.max(sy, ty) + drop}, ${tx} ${Math.max(sy, ty) + drop}, ${tx} ${ty}`;
}

const KIND_LABEL: Record<NodeKind, string> = { question: 'question', router: 'router', outcome: 'outcome' };

export function GraphView({ tree, session, onSelect }: { tree: DecisionTree; session?: Session; onSelect: (id: string) => void }) {
  const { pos, width, height, edges } = useMemo(() => layout(tree), [tree]);
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const canvas = useRef<HTMLDivElement>(null);
  const fitZoom = () => {
    const el = canvas.current;
    return el ? Math.max(0.3, Math.min(1, (el.clientWidth - 8) / width, (el.clientHeight - 8) / height)) : 1;
  };
  const fit = () => setZoom(fitZoom());
  // On open, fit unless that would make the text unreadable; then scroll instead.
  useEffect(() => setZoom(Math.max(0.7, fitZoom())), []);
  const [showLabels, setShowLabels] = useState(false);

  const visited = session?.visits ?? {};
  const pathEdges = useMemo(() => {
    const set = new Set<string>();
    for (const t of session?.trace ?? []) if (t.kind === 'route' && t.to) set.add(`${t.nodeId}→${t.to}`);
    return set;
  }, [session]);

  return (
    <div className="graph">
      <div className="graph-toolbar">
        <button type="button" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}>
          −
        </button>
        <span className="small">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>
          +
        </button>
        <button type="button" onClick={() => setZoom(1)}>
          100%
        </button>
        <button type="button" onClick={fit}>
          Fit
        </button>
        <label className="small">
          <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> edge labels
        </label>
        <span className="legend small">
          <span className="lg question">question</span>
          <span className="lg router">router</span>
          <span className="lg outcome">outcome</span>
          <span className="lg dashed">conditional</span>
          {session && <span className="lg visited">last play-through</span>}
        </span>
        <span className="muted small">Click a node to edit it. Hover to highlight its edges.</span>
      </div>
      <div className="graph-canvas" ref={canvas}>
        <svg width={width * zoom} height={height * zoom} viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="arrow-head" />
            </marker>
            <marker id="arrow-hl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="arrow-head hl" />
            </marker>
          </defs>
          {edges.map((e) => {
            const a = pos.get(e.from);
            const b = pos.get(e.to);
            if (!a || !b) return null;
            const key = `${e.from}→${e.to}`;
            const hl = hover !== null && (hover === e.from || hover === e.to);
            const walked = pathEdges.has(key);
            const d = edgePath(a, b, e.from === e.to);
            const midX = e.from === e.to ? a.x + W + 40 : (a.x + W + b.x) / 2;
            const midY = e.from === e.to ? a.y + H / 2 : b.col > a.col ? (a.y + b.y + H) / 2 : Math.max(a.y, b.y) + H + 30;
            return (
              <g key={key} className={`edge${e.conditional ? ' conditional' : ''}${hl ? ' hl' : ''}${walked ? ' walked' : ''}${hover && !hl ? ' dim' : ''}`}>
                <title>{`${e.from} → ${e.to}\n${e.labels.join('\n')}`}</title>
                <path d={d} markerEnd={hl ? 'url(#arrow-hl)' : 'url(#arrow)'} />
                {(showLabels || hl) && (
                  <text x={midX} y={midY} className="edge-label" textAnchor="middle">
                    {e.labels.length > 1 ? `${e.labels.length} ways` : truncate(e.labels[0], 34)}
                  </text>
                )}
              </g>
            );
          })}
          {tree.nodes.map((n) => {
            const p = pos.get(n.id);
            if (!p) return null;
            const isCurrent = session?.nodeId === n.id;
            return (
              <g
                key={n.id}
                className={`gnode kind-${n.kind}${visited[n.id] ? ' visited' : ''}${isCurrent ? ' current' : ''}${tree.startNodeId === n.id ? ' start' : ''}`}
                transform={`translate(${p.x}, ${p.y})`}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(n.id)}
              >
                <title>{`${n.title}\n(${KIND_LABEL[n.kind]})`}</title>
                <rect width={W} height={H} rx={n.kind === 'router' ? 30 : 8} />
                <text x={12} y={22} className="gnode-id">
                  {truncate(n.id, 24)}
                </text>
                <text x={12} y={42} className="gnode-title">
                  {truncate(n.title, 30)}
                </text>
                {tree.startNodeId === n.id && (
                  <text x={W - 10} y={18} textAnchor="end" className="gnode-badge">
                    START
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
