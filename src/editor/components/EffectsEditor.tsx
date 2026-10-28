import type { Effect, EffectOp } from '../../core';
import { EFFECT_SYMBOL } from '../../core';
import { useTree } from '../TreeContext';
import { ListControls, move, OperandInput, VariableSelect } from './fields';

const OPS = Object.keys(EFFECT_SYMBOL) as EffectOp[];

export function EffectsEditor({ value, onChange, emptyLabel = 'no state changes' }: { value: Effect[]; onChange: (e: Effect[]) => void; emptyLabel?: string }) {
  const { tree } = useTree();
  const add = () => onChange([...value, { var: tree.variables[0]?.key ?? '', op: 'add', value: 1 }]);
  return (
    <div className="effects">
      {value.length === 0 && <span className="muted">{emptyLabel}</span>}
      {value.map((effect, i) => (
        <div className="effect-row" key={i}>
          <VariableSelect value={effect.var} onChange={(key) => onChange(value.map((e, j) => (j === i ? { ...e, var: key } : e)))} />
          <select value={effect.op} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, op: e.target.value as EffectOp } : x)))}>
            {OPS.map((op) => (
              <option key={op} value={op}>
                {EFFECT_SYMBOL[op]} {op}
              </option>
            ))}
          </select>
          <OperandInput value={effect.value} onChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
          <ListControls index={i} length={value.length} onMove={(to) => onChange(move(value, i, to))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
        </div>
      ))}
      <button type="button" className="link" onClick={add} disabled={tree.variables.length === 0} title={tree.variables.length === 0 ? 'Define a variable first' : undefined}>
        + effect
      </button>
    </div>
  );
}
