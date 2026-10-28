/** Browser-only file helpers (no server involved). */
import { parseTree, serializeTree, type DecisionTree } from '../core';

/** File name the viewer looks for next to its page. */
export const PUBLISH_FILE_NAME = 'decision.json';

/** Downloads the tree as `decision.json`, ready to drop next to the viewer's index.html. */
export function downloadTreeJson(tree: DecisionTree, fileName = PUBLISH_FILE_NAME) {
  const blob = new Blob([serializeTree(tree) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function readTreeFile(file: File): Promise<DecisionTree> {
  return parseTree(await file.text());
}
