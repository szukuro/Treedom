import { useCallback, useRef, useState } from 'react';

interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

const LIMIT = 200;
const COALESCE_MS = 1000;

/**
 * Undo/redo state. Consecutive updates with the same `coalesceKey` (e.g. typing
 * in one text field) within a second are merged into a single undo step.
 */
export function useUndoable<T>(initial: T) {
  const [h, setH] = useState<History<T>>({ past: [], present: initial, future: [] });
  const last = useRef<{ key?: string; at: number }>({ at: 0 });

  const set = useCallback((updater: T | ((prev: T) => T), coalesceKey?: string) => {
    setH((prev) => {
      const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev.present) : updater;
      if (Object.is(next, prev.present)) return prev;
      const now = Date.now();
      const merge = coalesceKey !== undefined && last.current.key === coalesceKey && now - last.current.at < COALESCE_MS;
      last.current = { key: coalesceKey, at: now };
      return {
        past: merge ? prev.past : [...prev.past, prev.present].slice(-LIMIT),
        present: next,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    last.current = { at: 0 };
    setH((prev) =>
      prev.past.length === 0
        ? prev
        : { past: prev.past.slice(0, -1), present: prev.past[prev.past.length - 1], future: [prev.present, ...prev.future] },
    );
  }, []);

  const redo = useCallback(() => {
    last.current = { at: 0 };
    setH((prev) =>
      prev.future.length === 0 ? prev : { past: [...prev.past, prev.present], present: prev.future[0], future: prev.future.slice(1) },
    );
  }, []);

  /** Replaces the value and clears history (e.g. when opening another document). */
  const reset = useCallback((value: T) => {
    last.current = { at: 0 };
    setH({ past: [], present: value, future: [] });
  }, []);

  return { value: h.present, set, undo, redo, reset, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}
