import { useEffect, useState } from 'react';
import type { Operand } from '../../core';
import { useTree } from '../TreeContext';

/** A number input that allows intermediate states like "-" or "" while typing. */
export function NumberInput({
  value,
  onChange,
  placeholder,
  allowEmpty,
  className = 'num',
  title,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  className?: string;
  title?: string;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  useEffect(() => {
    setText((t) => (Number(t) === value && t !== '' ? t : value === undefined ? '' : String(value)));
  }, [value]);
  return (
    <input
      className={className}
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      title={title}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        if (t.trim() === '') {
          if (allowEmpty) onChange(undefined);
          return;
        }
        const n = Number(t);
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => setText(value === undefined ? '' : String(value))}
    />
  );
}

const NUMBER = '__number__';

/** Picks a literal number or a variable. */
export function OperandInput({ value, onChange }: { value: Operand; onChange: (v: Operand) => void }) {
  const { tree } = useTree();
  const isNum = typeof value === 'number';
  const missing = !isNum && !tree.variables.some((v) => v.key === value.var);
  return (
    <span className="operand">
      <select
        className={missing ? 'invalid' : ''}
        value={isNum ? NUMBER : value.var}
        onChange={(e) => onChange(e.target.value === NUMBER ? 0 : { var: e.target.value })}
      >
        <option value={NUMBER}># number</option>
        {tree.variables.map((v) => (
          <option key={v.key} value={v.key}>
            {v.key}
          </option>
        ))}
        {missing && <option value={value.var}>{value.var} (missing)</option>}
      </select>
      {isNum && <NumberInput value={value} onChange={(n) => onChange(n ?? 0)} />}
    </span>
  );
}

export function VariableSelect({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const { tree } = useTree();
  const missing = !tree.variables.some((v) => v.key === value);
  return (
    <select className={missing ? 'invalid' : ''} value={value} onChange={(e) => onChange(e.target.value)}>
      {missing && <option value={value}>{value || '— pick —'} {value && '(missing)'}</option>}
      {tree.variables.map((v) => (
        <option key={v.key} value={v.key} title={v.label}>
          {v.key}
        </option>
      ))}
    </select>
  );
}

const NEW_NODE = '__new__';

/** Node picker with a "create new node" shortcut. */
export function NodeSelect({ value, onChange, allowNew = true }: { value: string; onChange: (id: string) => void; allowNew?: boolean }) {
  const { tree, createNode } = useTree();
  const missing = !tree.nodes.some((n) => n.id === value);
  return (
    <select
      className={missing ? 'invalid' : ''}
      value={value}
      onChange={(e) => {
        if (e.target.value === NEW_NODE) {
          const title = prompt('Title of the new node?', 'New question');
          if (title) onChange(createNode('question', title));
          return;
        }
        onChange(e.target.value);
      }}
    >
      {missing && <option value={value}>{value || '— pick —'} {value && '(missing)'}</option>}
      {tree.nodes.map((n) => (
        <option key={n.id} value={n.id}>
          {n.kind === 'router' ? '⑂ ' : n.kind === 'outcome' ? '★ ' : ''}
          {n.id}
        </option>
      ))}
      {allowNew && <option value={NEW_NODE}>＋ New node…</option>}
    </select>
  );
}

export function IconButton({
  onClick,
  title,
  children,
  disabled,
  danger,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button type="button" className={`icon${danger ? ' danger' : ''}`} onClick={onClick} title={title} aria-label={title} disabled={disabled}>
      {children}
    </button>
  );
}

/** Up / down / remove controls for an item in a list. */
export function ListControls({ index, length, onMove, onRemove }: { index: number; length: number; onMove: (to: number) => void; onRemove: () => void }) {
  return (
    <span className="list-controls">
      <IconButton title="Move up" disabled={index === 0} onClick={() => onMove(index - 1)}>
        ↑
      </IconButton>
      <IconButton title="Move down" disabled={index === length - 1} onClick={() => onMove(index + 1)}>
        ↓
      </IconButton>
      <IconButton title="Remove" danger onClick={onRemove}>
        ✕
      </IconButton>
    </span>
  );
}

export function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
