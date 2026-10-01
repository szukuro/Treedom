import type { Comparator, Condition, Effect, EffectOp, Operand, Variable } from './types';

export type VarValues = Record<string, number>;

/** What a condition can look at. */
export interface EvalContext {
  vars: VarValues;
  /** Number of times each node has been entered. */
  visits: Record<string, number>;
}

export function resolveOperand(operand: Operand, vars: VarValues): number {
  if (typeof operand === 'number') return operand;
  return vars[operand.var] ?? 0;
}

export function compare(a: number, op: Comparator, b: number): boolean {
  switch (op) {
    case 'eq':
      return a === b;
    case 'neq':
      return a !== b;
    case 'gt':
      return a > b;
    case 'gte':
      return a >= b;
    case 'lt':
      return a < b;
    case 'lte':
      return a <= b;
  }
}

export function evaluate(condition: Condition | undefined, ctx: EvalContext): boolean {
  if (!condition) return true;
  switch (condition.type) {
    case 'compare':
      return compare(
        resolveOperand(condition.left, ctx.vars),
        condition.op,
        resolveOperand(condition.right, ctx.vars),
      );
    case 'all':
      return condition.conditions.every((c) => evaluate(c, ctx));
    case 'any':
      return condition.conditions.some((c) => evaluate(c, ctx));
    case 'not':
      return !evaluate(condition.condition, ctx);
    case 'visited':
      return (ctx.visits[condition.node] ?? 0) > 0;
  }
}

export function clamp(value: number, variable?: Variable): number {
  if (!variable) return value;
  let v = value;
  if (variable.min !== undefined && v < variable.min) v = variable.min;
  if (variable.max !== undefined && v > variable.max) v = variable.max;
  return v;
}

function applyOp(current: number, op: EffectOp, value: number): number {
  switch (op) {
    case 'set':
      return value;
    case 'add':
      return current + value;
    case 'subtract':
      return current - value;
    case 'multiply':
      return current * value;
  }
}

/** Returns a new value map with the effects applied in order. */
export function applyEffects(effects: Effect[], vars: VarValues, variables: Variable[]): VarValues {
  const next = { ...vars };
  for (const effect of effects) {
    const def = variables.find((v) => v.key === effect.var);
    const value = resolveOperand(effect.value, next);
    next[effect.var] = clamp(applyOp(next[effect.var] ?? 0, effect.op, value), def);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Human-readable descriptions (used by the editor, graph and player trace).
// ---------------------------------------------------------------------------

export const COMPARATOR_SYMBOL: Record<Comparator, string> = {
  eq: '=',
  neq: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
};

export const EFFECT_SYMBOL: Record<EffectOp, string> = {
  set: '=',
  add: '+=',
  subtract: '−=',
  multiply: '×=',
};

export function describeOperand(operand: Operand): string {
  return typeof operand === 'number' ? String(operand) : operand.var;
}

export function describeCondition(condition: Condition | undefined): string {
  if (!condition) return 'always';
  switch (condition.type) {
    case 'compare':
      return `${describeOperand(condition.left)} ${COMPARATOR_SYMBOL[condition.op]} ${describeOperand(condition.right)}`;
    case 'all':
    case 'any': {
      if (condition.conditions.length === 0) return condition.type === 'all' ? 'always' : 'never';
      const joiner = condition.type === 'all' ? ' AND ' : ' OR ';
      const parts = condition.conditions.map((c) =>
        c.type === 'all' || c.type === 'any' ? `(${describeCondition(c)})` : describeCondition(c),
      );
      return parts.join(joiner);
    }
    case 'not':
      return `NOT (${describeCondition(condition.condition)})`;
    case 'visited':
      return `visited ${condition.node}`;
  }
}

export function describeEffect(effect: Effect): string {
  return `${effect.var} ${EFFECT_SYMBOL[effect.op]} ${describeOperand(effect.value)}`;
}

/** Collects every variable key referenced by a condition. */
export function conditionVars(condition: Condition | undefined, out: Set<string> = new Set()): Set<string> {
  if (!condition) return out;
  switch (condition.type) {
    case 'compare':
      for (const o of [condition.left, condition.right]) if (typeof o !== 'number') out.add(o.var);
      break;
    case 'all':
    case 'any':
      condition.conditions.forEach((c) => conditionVars(c, out));
      break;
    case 'not':
      conditionVars(condition.condition, out);
      break;
    case 'visited':
      break;
  }
  return out;
}
