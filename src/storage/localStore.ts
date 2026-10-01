/**
 * localStorage persistence. Each tree is stored as its own JSON document, plus a
 * small index, so one corrupted entry doesn't take the whole library down.
 */
import { parseTree, serializeTree, type DecisionTree } from '../core';

const PREFIX = 'treedom';
const INDEX_KEY = `${PREFIX}:index`;
const treeKey = (id: string) => `${PREFIX}:tree:${id}`;
const LAST_OPEN_KEY = `${PREFIX}:lastOpen`;

export interface TreeSummary {
  id: string;
  title: string;
  updatedAt?: string;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function listTrees(): TreeSummary[] {
  const s = storage();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s.getItem(INDEX_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(index: TreeSummary[]) {
  storage()?.setItem(INDEX_KEY, JSON.stringify(index));
}

export function loadTree(id: string): DecisionTree | null {
  const raw = storage()?.getItem(treeKey(id));
  if (!raw) return null;
  try {
    return parseTree(raw);
  } catch {
    return null;
  }
}

export function saveTree(tree: DecisionTree): DecisionTree {
  const s = storage();
  const stamped = { ...tree, updatedAt: new Date().toISOString() };
  if (!s) return stamped;
  s.setItem(treeKey(tree.id), serializeTree(stamped));
  const index = listTrees().filter((t) => t.id !== tree.id);
  index.unshift({ id: tree.id, title: tree.title, updatedAt: stamped.updatedAt });
  writeIndex(index);
  return stamped;
}

export function deleteTree(id: string) {
  const s = storage();
  if (!s) return;
  s.removeItem(treeKey(id));
  writeIndex(listTrees().filter((t) => t.id !== id));
}

export function getLastOpen(): string | null {
  return storage()?.getItem(LAST_OPEN_KEY) ?? null;
}

export function setLastOpen(id: string) {
  storage()?.setItem(LAST_OPEN_KEY, id);
}

/** Triggers a browser download of the tree as a `.json` file. */
export function downloadTree(tree: DecisionTree) {
  const blob = new Blob([serializeTree(tree)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tree.title.replace(/[^\w-]+/g, '_') || 'tree'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readTreeFile(file: File): Promise<DecisionTree> {
  return parseTree(await file.text());
}
