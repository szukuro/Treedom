import { useEffect, useMemo, useState } from 'react';
import { parseTree, serializeTree, type DecisionTree } from '../core';

export function JsonTab({ tree, onApply }: { tree: DecisionTree; onApply: (t: DecisionTree) => void }) {
  const json = useMemo(() => serializeTree(tree), [tree]);
  const [text, setText] = useState(json);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setText(json), [json]);
  const dirty = text !== json;
  return (
    <div className="json-tab">
      <div className="json-toolbar">
        <button
          type="button"
          disabled={!dirty}
          onClick={() => {
            try {
              const parsed = parseTree(text);
              onApply({ ...parsed, id: tree.id });
              setError(null);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Apply changes
        </button>
        <button type="button" disabled={!dirty} onClick={() => setText(json)}>
          Revert
        </button>
        <button type="button" onClick={() => void navigator.clipboard?.writeText(json)}>
          Copy
        </button>
        {error && <span className="error-text">{error}</span>}
        <span className="muted small">This is the exact document that is saved and exported as decision.json.</span>
      </div>
      <textarea className="json-editor mono" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  );
}
