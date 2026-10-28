import { createContext, useContext } from 'react';
import type { DecisionTree } from '../core';

export type TreeUpdater = (fn: (tree: DecisionTree) => DecisionTree, coalesceKey?: string) => void;

export interface TreeContextValue {
  tree: DecisionTree;
  update: TreeUpdater;
  /** Opens a node in the editor. */
  selectNode: (id: string) => void;
  /** Creates a new node and returns its id (used by target pickers). */
  createNode: (kind?: 'question' | 'router' | 'outcome', title?: string) => string;
}

export const TreeContext = createContext<TreeContextValue | null>(null);

export function useTree(): TreeContextValue {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error('useTree must be used inside <TreeContext.Provider>');
  return ctx;
}
