/**
 * Pure helpers for editing a tree: id generation, factories and renames that keep
 * every reference in sync.
 */
import type { Choice, Condition, DecisionTree, Effect, Operand, Transition, TreeNode, NodeKind } from './types';
import { SCHEMA_VERSION } from './types';

export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${rand}` : rand;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32) || 'node'
  );
}

export function uniqueId(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  let i = 2;
  while (set.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

export function newTransition(to: string, when?: Condition): Transition {
  return when ? { id: uid('t'), to, when } : { id: uid('t'), to };
}

export function newChoice(label = 'New choice'): Choice {
  return { id: uid('c'), label, effects: [], transitions: [] };
}

export function newNode(tree: DecisionTree, kind: NodeKind = 'question', title = 'New question'): TreeNode {
  const id = uniqueId(slugify(title), tree.nodes.map((n) => n.id));
  return {
    id,
    kind,
    title,
    body: '',
    onEnter: [],
    choices: kind === 'question' ? [newChoice('Yes'), newChoice('No')] : [],
    transitions: [],
    ...(kind === 'outcome' ? { outcome: { tone: 'neutral' as const } } : {}),
  };
}

export function newTree(title = 'Untitled tree'): DecisionTree {
  const start: TreeNode = {
    id: 'start',
    kind: 'question',
    title: 'First question',
    body: 'Describe the question here.',
    onEnter: [],
    choices: [],
    transitions: [{ id: uid('t'), to: 'done' }],
  };
  start.choices = [newChoice('Option A'), newChoice('Option B')];
  const done: TreeNode = {
    id: 'done',
    kind: 'outcome',
    title: 'Done',
    body: 'Thanks!',
    onEnter: [],
    choices: [],
    transitions: [],
    outcome: { tone: 'neutral' },
  };
  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid('tree'),
    title,
    description: '',
    startNodeId: 'start',
    variables: [],
    nodes: [start, done],
  };
}

// ---------------------------------------------------------------------------
// Reference-preserving renames
// ---------------------------------------------------------------------------

function mapOperand(o: Operand, from: string, to: string): Operand {
  return typeof o !== 'number' && o.var === from ? { var: to } : o;
}

function mapCondition(c: Condition | undefined, fn: (c: Condition) => Condition): Condition | undefined {
  if (!c) return c;
  const mapped = fn(c);
  switch (mapped.type) {
    case 'all':
    case 'any':
      return { ...mapped, conditions: mapped.conditions.map((x) => mapCondition(x, fn)!) };
    case 'not':
      return { ...mapped, condition: mapCondition(mapped.condition, fn)! };
    default:
      return mapped;
  }
}

function mapTree(
  tree: DecisionTree,
  fns: {
    condition?: (c: Condition) => Condition;
    effect?: (e: Effect) => Effect;
    transition?: (t: Transition) => Transition;
  },
): DecisionTree {
  const cond = (c: Condition | undefined) => (fns.condition ? mapCondition(c, fns.condition) : c);
  const eff = (e: Effect) => (fns.effect ? fns.effect(e) : e);
  const tr = (t: Transition): Transition => {
    const mapped = fns.transition ? fns.transition(t) : t;
    return mapped.when ? { ...mapped, when: cond(mapped.when) } : mapped;
  };
  return {
    ...tree,
    nodes: tree.nodes.map((n) => ({
      ...n,
      onEnter: n.onEnter.map(eff),
      transitions: n.transitions.map(tr),
      choices: n.choices.map((c) => {
        const choice: Choice = { ...c, effects: c.effects.map(eff), transitions: c.transitions.map(tr) };
        if (c.showIf) choice.showIf = cond(c.showIf);
        return choice;
      }),
    })),
  };
}

export function renameVariable(tree: DecisionTree, from: string, to: string): DecisionTree {
  if (from === to) return tree;
  const pattern = new RegExp(`\\{\\{\\s*${from}\\s*\\}\\}`, 'g');
  const mapped = mapTree(tree, {
    condition: (c) => (c.type === 'compare' ? { ...c, left: mapOperand(c.left, from, to), right: mapOperand(c.right, from, to) } : c),
    effect: (e) => ({ ...e, var: e.var === from ? to : e.var, value: mapOperand(e.value, from, to) }),
  });
  return {
    ...mapped,
    variables: mapped.variables.map((v) => (v.key === from ? { ...v, key: to } : v)),
    nodes: mapped.nodes.map((n) => ({ ...n, body: n.body.replace(pattern, `{{${to}}}`) })),
  };
}

export function renameNode(tree: DecisionTree, from: string, to: string): DecisionTree {
  if (from === to) return tree;
  const mapped = mapTree(tree, {
    condition: (c) => (c.type === 'visited' && c.node === from ? { ...c, node: to } : c),
    transition: (t) => (t.to === from ? { ...t, to } : t),
  });
  return {
    ...mapped,
    startNodeId: tree.startNodeId === from ? to : tree.startNodeId,
    nodes: mapped.nodes.map((n) => (n.id === from ? { ...n, id: to } : n)),
  };
}

/** Counts how often a variable is referenced (conditions, effects, text). */
export function variableUsage(tree: DecisionTree, key: string): number {
  let count = 0;
  const text = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
  mapTree(tree, {
    condition: (c) => {
      if (c.type === 'compare') {
        for (const o of [c.left, c.right]) if (typeof o !== 'number' && o.var === key) count++;
      }
      return c;
    },
    effect: (e) => {
      if (e.var === key) count++;
      if (typeof e.value !== 'number' && e.value.var === key) count++;
      return e;
    },
  });
  for (const n of tree.nodes) count += (n.body.match(text) ?? []).length;
  return count;
}

/** Nodes that have a transition into `id`. */
export function incomingNodes(tree: DecisionTree, id: string): string[] {
  return tree.nodes
    .filter((n) => n.choices.some((c) => c.transitions.some((t) => t.to === id)) || n.transitions.some((t) => t.to === id))
    .map((n) => n.id);
}
