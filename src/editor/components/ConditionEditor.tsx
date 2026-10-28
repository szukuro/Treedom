import type { Comparator, Condition } from '../../core';
import { COMPARATOR_SYMBOL, describeCondition } from '../../core';
import { useTree } from '../TreeContext';
import { IconButton, NodeSelect, OperandInput } from './fields';

const COMPARATORS = Object.keys(COMPARATOR_SYMBOL) as Comparator[];

function useFactories() {
  const { tree } = useTree();
  return {
    compare: (): Condition => ({
      type: 'compare',
      left: tree.variables[0] ? { var: tree.variables[0].key } : 0,
      op: 'gte',
      right: 1,
    }),
    visited: (): Condition => ({ type: 'visited', node: tree.startNodeId }),
  };
}

/**
 * Edits an optional condition. `undefined` means "always", which is displayed
 * with an "add condition" button.
 */
export function ConditionEditor({
  value,
  onChange,
  emptyLabel = 'always',
}: {
  value: Condition | undefined;
  onChange: (c: Condition | undefined) => void;
  emptyLabel?: string;
}) {
  const make = useFactories();
  if (!value) {
    return (
      <span className="condition-empty">
        <span className="muted">{emptyLabel}</span>
        <button type="button" className="link" onClick={() => onChange(make.compare())}>
          + condition
        </button>
      </span>
    );
  }
  return (
    <div className="condition-root">
      <ConditionNode value={value} onChange={onChange} onRemove={() => onChange(undefined)} />
    </div>
  );
}

function ConditionNode({ value, onChange, onRemove }: { value: Condition; onChange: (c: Condition) => void; onRemove: () => void }) {
  const make = useFactories();
  const wrap = (type: 'all' | 'any') => onChange({ type, conditions: [value] });
  const wrapButtons =
    value.type !== 'all' && value.type !== 'any' ? (
      <>
        <IconButton title="Wrap in an AND group" onClick={() => wrap('all')}>
          &amp;
        </IconButton>
        <IconButton title="Wrap in an OR group" onClick={() => wrap('any')}>
          |
        </IconButton>
      </>
    ) : null;
  const remove = (
    <IconButton title="Remove condition" danger onClick={onRemove}>
      ✕
    </IconButton>
  );

  switch (value.type) {
    case 'compare':
      return (
        <div className="cond-row">
          <OperandInput value={value.left} onChange={(left) => onChange({ ...value, left })} />
          <select value={value.op} onChange={(e) => onChange({ ...value, op: e.target.value as Comparator })}>
            {COMPARATORS.map((c) => (
              <option key={c} value={c}>
                {COMPARATOR_SYMBOL[c]}
              </option>
            ))}
          </select>
          <OperandInput value={value.right} onChange={(right) => onChange({ ...value, right })} />
          {wrapButtons}
          {remove}
        </div>
      );
    case 'visited':
      return (
        <div className="cond-row">
          <span className="kw">visited</span>
          <NodeSelect value={value.node} allowNew={false} onChange={(node) => onChange({ ...value, node })} />
          {wrapButtons}
          {remove}
        </div>
      );
    case 'not':
      return (
        <div className="cond-group">
          <div className="cond-row">
            <span className="kw">NOT</span>
            <IconButton title="Remove NOT (keep inner condition)" onClick={() => onChange(value.condition)}>
              ⤓
            </IconButton>
            {wrapButtons}
            {remove}
          </div>
          <div className="cond-children">
            <ConditionNode value={value.condition} onChange={(condition) => onChange({ ...value, condition })} onRemove={onRemove} />
          </div>
        </div>
      );
    case 'all':
    case 'any': {
      const set = (conditions: Condition[]) => onChange({ ...value, conditions });
      return (
        <div className={`cond-group ${value.type}`}>
          <div className="cond-row">
            <select value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value as 'all' | 'any' })}>
              <option value="all">ALL of (AND)</option>
              <option value="any">ANY of (OR)</option>
            </select>
            <span className="muted small" title={describeCondition(value)}>
              {value.conditions.length} condition{value.conditions.length === 1 ? '' : 's'}
            </span>
            {value.conditions.length === 1 && (
              <IconButton title="Unwrap group" onClick={() => onChange(value.conditions[0])}>
                ⤓
              </IconButton>
            )}
            {remove}
          </div>
          <div className="cond-children">
            {value.conditions.map((c, i) => (
              <ConditionNode
                key={i}
                value={c}
                onChange={(nc) => set(value.conditions.map((x, j) => (j === i ? nc : x)))}
                onRemove={() => set(value.conditions.filter((_, j) => j !== i))}
              />
            ))}
            <div className="cond-add">
              <button type="button" className="link" onClick={() => set([...value.conditions, make.compare()])}>
                + comparison
              </button>
              <button type="button" className="link" onClick={() => set([...value.conditions, make.visited()])}>
                + visited
              </button>
              <button type="button" className="link" onClick={() => set([...value.conditions, { type: value.type === 'all' ? 'any' : 'all', conditions: [make.compare()] }])}>
                + {value.type === 'all' ? 'OR' : 'AND'} group
              </button>
              <button type="button" className="link" onClick={() => set([...value.conditions, { type: 'not', condition: make.compare() }])}>
                + NOT
              </button>
            </div>
          </div>
        </div>
      );
    }
  }
}
