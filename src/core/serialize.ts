import type { Choice, DecisionTree, TreeNode } from './types';
import { SCHEMA_VERSION } from './types';
import { uid } from './mutations';

export class TreeFormatError extends Error {}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/**
 * Parses and normalises a tree from JSON (string or already-parsed value).
 * Missing optional arrays are filled in, so hand-written files can be terse.
 * Semantic problems are left to `validateTree`.
 */
export function parseTree(input: string | unknown): DecisionTree {
  let raw: unknown = input;
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input);
    } catch (e) {
      throw new TreeFormatError(`Invalid JSON: ${(e as Error).message}`);
    }
  }
  if (!isObject(raw)) throw new TreeFormatError('A tree must be a JSON object.');
  if (!Array.isArray(raw.nodes)) throw new TreeFormatError('A tree needs a "nodes" array.');
  if (typeof raw.schemaVersion === 'number' && raw.schemaVersion > SCHEMA_VERSION) {
    throw new TreeFormatError(`Schema version ${raw.schemaVersion} is newer than supported (${SCHEMA_VERSION}).`);
  }

  const nodes: TreeNode[] = raw.nodes.map((n, i) => {
    if (!isObject(n) || typeof n.id !== 'string') throw new TreeFormatError(`Node #${i + 1} needs a string "id".`);
    const kind = n.kind === 'router' || n.kind === 'outcome' ? n.kind : 'question';
    const choices: Choice[] = arr<Record<string, unknown>>(n.choices).map((c) => ({
      ...(c as object),
      id: typeof c.id === 'string' ? c.id : uid('c'),
      label: typeof c.label === 'string' ? c.label : '',
      effects: arr(c.effects),
      transitions: arr<Record<string, unknown>>(c.transitions).map((t) => ({ ...t, id: typeof t.id === 'string' ? t.id : uid('t') })),
    })) as Choice[];
    return {
      ...(n as object),
      id: n.id,
      kind,
      title: typeof n.title === 'string' ? n.title : n.id,
      body: typeof n.body === 'string' ? n.body : '',
      onEnter: arr(n.onEnter),
      choices,
      transitions: arr<Record<string, unknown>>(n.transitions).map((t) => ({ ...t, id: typeof t.id === 'string' ? t.id : uid('t') })),
    } as TreeNode;
  });

  const startNodeId = typeof raw.startNodeId === 'string' ? raw.startNodeId : nodes[0]?.id ?? '';

  return {
    schemaVersion: SCHEMA_VERSION,
    id: typeof raw.id === 'string' ? raw.id : uid('tree'),
    title: typeof raw.title === 'string' ? raw.title : 'Imported tree',
    description: typeof raw.description === 'string' ? raw.description : '',
    startNodeId,
    variables: arr<Record<string, unknown>>(raw.variables).map((v) => ({
      ...v,
      key: String(v.key ?? ''),
      label: typeof v.label === 'string' ? v.label : String(v.key ?? ''),
      initial: typeof v.initial === 'number' ? v.initial : 0,
    })) as DecisionTree['variables'],
    nodes,
    ...(typeof raw.updatedAt === 'string' ? { updatedAt: raw.updatedAt } : {}),
  };
}

export function serializeTree(tree: DecisionTree): string {
  return JSON.stringify(tree, null, 2);
}
