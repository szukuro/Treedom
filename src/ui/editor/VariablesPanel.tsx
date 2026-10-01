import { useEffect, useState } from 'react';
import type { Variable } from '../../core';
import { renameVariable, uniqueId, variableUsage } from '../../core';
import { useTree } from '../TreeContext';
import { ListControls, move, NumberInput } from './fields';

const KEY_PATTERN = /^[A-Za-z_]\w*$/;

export function VariablesPanel() {
  const { tree, update } = useTree();
  const setVars = (fn: (vars: Variable[]) => Variable[], key?: string) => update((t) => ({ ...t, variables: fn(t.variables) }), key && `vars:${key}`);

  const add = () => {
    const key = uniqueId('counter', tree.variables.map((v) => v.key));
    setVars((vars) => [...vars, { key, label: 'New counter', initial: 0 }]);
  };

  return (
    <div className="variables-panel">
      <h2>State variables</h2>
      <p className="muted">
        Numeric counters that make up the session state. Choices and on-enter effects change them; conditions on choices and transitions read them. Use
        min/max to clamp, e.g. 0…1 for a yes/no flag. Reference them in text as <code>{'{{key}}'}</code>.
      </p>
      <table className="var-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Label</th>
            <th>Initial</th>
            <th>Min</th>
            <th>Max</th>
            <th title="References in conditions, effects and text">Used</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tree.variables.map((v, i) => (
            <tr key={i}>
              <td>
                <KeyInput
                  value={v.key}
                  taken={tree.variables.filter((_, j) => j !== i).map((x) => x.key)}
                  onCommit={(key) => update((t) => renameVariable(t, v.key, key))}
                />
              </td>
              <td>
                <input value={v.label} title={v.description} onChange={(e) => setVars((vars) => vars.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)), `${i}:label`)} />
              </td>
              <td>
                <NumberInput value={v.initial} onChange={(n) => setVars((vars) => vars.map((x, j) => (j === i ? { ...x, initial: n ?? 0 } : x)), `${i}:initial`)} />
              </td>
              <td>
                <NumberInput
                  value={v.min}
                  allowEmpty
                  placeholder="–"
                  onChange={(n) =>
                    setVars((vars) =>
                      vars.map((x, j) => {
                        if (j !== i) return x;
                        const next = { ...x, min: n };
                        if (n === undefined) delete next.min;
                        return next;
                      }),
                    `${i}:min`)
                  }
                />
              </td>
              <td>
                <NumberInput
                  value={v.max}
                  allowEmpty
                  placeholder="–"
                  onChange={(n) =>
                    setVars((vars) =>
                      vars.map((x, j) => {
                        if (j !== i) return x;
                        const next = { ...x, max: n };
                        if (n === undefined) delete next.max;
                        return next;
                      }),
                    `${i}:max`)
                  }
                />
              </td>
              <td className="center">{variableUsage(tree, v.key)}</td>
              <td>
                <ListControls
                  index={i}
                  length={tree.variables.length}
                  onMove={(to) => setVars((vars) => move(vars, i, to))}
                  onRemove={() => {
                    const used = variableUsage(tree, v.key);
                    if (used && !confirm(`"${v.key}" is used ${used} time(s). Delete anyway? References will be flagged as errors.`)) return;
                    setVars((vars) => vars.filter((_, j) => j !== i));
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={add}>
        + Add variable
      </button>
    </div>
  );
}

function KeyInput({ value, taken, onCommit }: { value: string; taken: string[]; onCommit: (key: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const valid = KEY_PATTERN.test(draft) && !taken.includes(draft);
  const commit = () => {
    if (draft === value) return;
    if (valid) onCommit(draft);
    else setDraft(value);
  };
  return (
    <input
      className={valid ? 'mono' : 'mono invalid'}
      value={draft}
      title="Renaming updates every reference"
      onChange={(e) => setDraft(e.target.value.trim())}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
    />
  );
}
