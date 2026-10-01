import type { Transition } from '../../core';
import { newTransition } from '../../core';
import { useTree } from '../TreeContext';
import { ConditionEditor } from './ConditionEditor';
import { IconButton, ListControls, move, NodeSelect } from './fields';

/** Ordered list of conditional transitions. First match wins. */
export function TransitionsEditor({ value, onChange, emptyLabel }: { value: Transition[]; onChange: (t: Transition[]) => void; emptyLabel: string }) {
  const { tree, selectNode } = useTree();
  const set = (i: number, t: Transition) => onChange(value.map((x, j) => (j === i ? t : x)));
  return (
    <div className="transitions">
      {value.length === 0 && <div className="muted">{emptyLabel}</div>}
      {value.map((t, i) => (
        <div className="transition" key={t.id}>
          <div className="transition-head">
            <span className="badge">{i === 0 ? 'if' : t.when ? 'else if' : 'else'}</span>
            <div className="grow">
              <ConditionEditor
                value={t.when}
                emptyLabel="always"
                onChange={(when) => {
                  const next = { ...t };
                  if (when) next.when = when;
                  else delete next.when;
                  set(i, next);
                }}
              />
            </div>
            <ListControls index={i} length={value.length} onMove={(to) => onChange(move(value, i, to))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
          </div>
          <div className="transition-target">
            <span className="arrow">→ go to</span>
            <NodeSelect value={t.to} onChange={(to) => set(i, { ...t, to })} />
            <IconButton title="Open target node" onClick={() => selectNode(t.to)}>
              ↗
            </IconButton>
            <input
              className="label-input"
              placeholder="note (optional)"
              value={t.label ?? ''}
              onChange={(e) => {
                const next = { ...t };
                if (e.target.value) next.label = e.target.value;
                else delete next.label;
                set(i, next);
              }}
            />
          </div>
        </div>
      ))}
      <button type="button" className="link" onClick={() => onChange([...value, newTransition(tree.nodes[0]?.id ?? '')])}>
        + transition
      </button>
    </div>
  );
}
