/**
 * localStorage implementation of the editor's tree library. Each tree is stored
 * as its own JSON document plus a small index, so one corrupted entry doesn't
 * take the whole library down.
 */
import { parseTree, serializeTree, type DecisionTree } from '../../core';
import type { TreeRepository, TreeSummary } from '../types';

const PREFIX = 'treedom';
const INDEX_KEY = `${PREFIX}:index`;
const treeKey = (id: string) => `${PREFIX}:tree:${id}`;

export function createLocalTreeRepository(storage: () => Storage | null = defaultStorage): TreeRepository {
  const readIndex = (): TreeSummary[] => {
    try {
      const parsed = JSON.parse(storage()?.getItem(INDEX_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const writeIndex = (index: TreeSummary[]) => storage()?.setItem(INDEX_KEY, JSON.stringify(index));

  return {
    async list() {
      return readIndex();
    },
    async load(id) {
      const raw = storage()?.getItem(treeKey(id));
      if (!raw) return null;
      try {
        return parseTree(raw);
      } catch {
        return null;
      }
    },
    async save(tree: DecisionTree) {
      const stamped = { ...tree, updatedAt: new Date().toISOString() };
      const s = storage();
      if (!s) return stamped;
      s.setItem(treeKey(tree.id), serializeTree(stamped));
      writeIndex([{ id: tree.id, title: tree.title, updatedAt: stamped.updatedAt }, ...readIndex().filter((t) => t.id !== tree.id)]);
      return stamped;
    },
    async remove(id) {
      storage()?.removeItem(treeKey(id));
      writeIndex(readIndex().filter((t) => t.id !== id));
    },
  };
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
