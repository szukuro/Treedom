import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DecisionTree, NodeKind, Session } from '../core';
import { getNode, newNode, newTree, parseTree, serializeTree, startSession, uid, validateTree } from '../core';
import { createItServicesTree } from '../examples/itServices';
import { deleteTree, downloadTree, getLastOpen, listTrees, loadTree, readTreeFile, saveTree, setLastOpen, type TreeSummary } from '../storage/localStore';
import { TreeEditor, type EditorSelection } from './editor/TreeEditor';
import { GraphView } from './GraphView';
import { DecisionTreePlayer } from './Player';
import { TreeContext, type TreeContextValue } from './TreeContext';
import { useUndoable } from './useUndoable';

type Tab = 'edit' | 'graph' | 'play' | 'json';

function bootstrap(): DecisionTree {
  const last = getLastOpen();
  const fromLast = last ? loadTree(last) : null;
  if (fromLast) return fromLast;
  const first = listTrees()[0];
  const fromFirst = first ? loadTree(first.id) : null;
  if (fromFirst) return fromFirst;
  return saveTree(createItServicesTree());
}

/**
 * The full authoring environment: library (localStorage), editor, graph,
 * player and raw JSON. Drop it into any React app: `<DecisionTreeStudio />`.
 */
export function DecisionTreeStudio() {
  const initial = useMemo(bootstrap, []);
  const history = useUndoable<DecisionTree>(initial);
  const tree = history.value;
  const [library, setLibrary] = useState<TreeSummary[]>(() => listTrees());
  const [tab, setTab] = useState<Tab>('edit');
  const [selection, setSelection] = useState<EditorSelection>({ type: 'node', id: initial.startNodeId });
  const [session, setSession] = useState<Session>(() => startSession(initial));
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const fileInput = useRef<HTMLInputElement>(null);
  const loadedRef = useRef<DecisionTree>(initial);

  const issues = useMemo(() => validateTree(tree), [tree]);

  // Autosave (debounced) whenever the tree changes after being opened.
  useEffect(() => {
    if (tree === loadedRef.current) return;
    setSaveState('saving');
    const timer = setTimeout(() => {
      saveTree(tree);
      setLibrary(listTrees());
      setSaveState('saved');
    }, 400);
    return () => clearTimeout(timer);
  }, [tree]);

  useEffect(() => setLastOpen(tree.id), [tree.id]);

  // Keep the play session valid while editing.
  useEffect(() => {
    if (!getNode(tree, session.nodeId)) setSession(startSession(tree));
  }, [tree, session.nodeId]);

  const open = useCallback(
    (t: DecisionTree) => {
      loadedRef.current = t;
      history.reset(t);
      setSelection({ type: 'node', id: t.startNodeId });
      setSession(startSession(t));
      setLibrary(listTrees());
    },
    [history],
  );

  const ctx: TreeContextValue = useMemo(
    () => ({
      tree,
      update: (fn, key) => history.set(fn, key),
      selectNode: (id) => {
        setSelection({ type: 'node', id });
        setTab('edit');
      },
      createNode: (kind: NodeKind = 'question', title?: string) => {
        const node = newNode(tree, kind, title);
        history.set((t) => ({ ...t, nodes: [...t.nodes, node] }));
        return node.id;
      },
    }),
    [tree, history],
  );

  // Ctrl/Cmd+Z outside of text fields.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        history.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [history]);

  // --- library actions ------------------------------------------------------

  const switchTo = (id: string) => {
    if (id === tree.id) return;
    saveTree(tree);
    const t = loadTree(id);
    if (t) open(t);
  };
  const createNew = () => {
    saveTree(tree);
    open(saveTree(newTree()));
  };
  const loadExample = () => {
    const example = createItServicesTree();
    if (library.some((t) => t.id === example.id) && !confirm('Reset the example tree to its original version? Your changes to it will be lost.')) {
      switchTo(example.id);
      return;
    }
    saveTree(tree);
    open(saveTree(example));
  };
  const duplicate = () => {
    saveTree(tree);
    open(saveTree({ ...structuredClone(tree), id: uid('tree'), title: `${tree.title} (copy)` }));
  };
  const remove = () => {
    if (!confirm(`Delete "${tree.title}" from this browser? Export it first if you want to keep a copy.`)) return;
    deleteTree(tree.id);
    loadedRef.current = tree; // prevent the pending autosave from resurrecting it
    const next = listTrees()[0];
    open((next && loadTree(next.id)) || saveTree(newTree()));
  };
  const importFile = async (file: File) => {
    try {
      let t = await readTreeFile(file);
      if (listTrees().some((s) => s.id === t.id)) {
        const replace = confirm(`A tree with id "${t.id}" already exists. OK = replace it, Cancel = import as a copy.`);
        if (!replace) t = { ...t, id: uid('tree'), title: `${t.title} (imported)` };
      }
      saveTree(tree);
      open(saveTree(t));
    } catch (e) {
      alert(`Could not import: ${(e as Error).message}`);
    }
  };

  const errors = issues.filter((i) => i.level === 'error').length;

  return (
    <TreeContext.Provider value={ctx}>
      <div className="studio">
        <header className="topbar">
          <div className="brand">
            <span className="logo">🌳</span> Treedom
          </div>
          <select className="tree-picker" value={tree.id} onChange={(e) => switchTo(e.target.value)} title="Saved trees (this browser)">
            {!library.some((t) => t.id === tree.id) && <option value={tree.id}>{tree.title}</option>}
            {library.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id === tree.id ? tree.title : t.title}
              </option>
            ))}
          </select>
          <div className="toolbar">
            <button type="button" onClick={createNew}>
              New
            </button>
            <button type="button" onClick={duplicate}>
              Duplicate
            </button>
            <button type="button" onClick={loadExample} title="Open (or reset) the IT services example">
              Example
            </button>
            <button type="button" onClick={() => fileInput.current?.click()}>
              Import
            </button>
            <button type="button" onClick={() => downloadTree(tree)}>
              Export
            </button>
            <button type="button" className="danger" onClick={remove}>
              Delete
            </button>
            <span className="sep" />
            <button type="button" onClick={history.undo} disabled={!history.canUndo} title="Undo (Ctrl+Z)">
              ↶
            </button>
            <button type="button" onClick={history.redo} disabled={!history.canRedo} title="Redo (Ctrl+Shift+Z)">
              ↷
            </button>
            <span className="save-state muted small">{saveState === 'saving' ? 'Saving…' : 'Saved locally'}</span>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = '';
            }}
          />
        </header>

        <nav className="tabs">
          {(
            [
              ['edit', 'Editor'],
              ['graph', 'Graph'],
              ['play', 'Play'],
              ['json', 'JSON'],
            ] as const
          ).map(([id, label]) => (
            <button type="button" key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {label}
              {id === 'edit' && errors > 0 && <span className="dot error" />}
            </button>
          ))}
        </nav>

        <div className="content">
          {tab === 'edit' && (
            <TreeEditor
              selection={selection}
              onSelect={setSelection}
              issues={issues}
              onPlayFrom={(nodeId) => {
                setSession(startSession(tree, nodeId));
                setTab('play');
              }}
            />
          )}
          {tab === 'graph' && <GraphView tree={tree} session={session} onSelect={ctx.selectNode} />}
          {tab === 'play' && (
            <div className="play-tab">
              {errors > 0 && <div className="issues has-errors">This tree has {errors} validation error(s); some paths may fail.</div>}
              <DecisionTreePlayer tree={tree} session={session} onSessionChange={setSession} debug onEditNode={ctx.selectNode} />
            </div>
          )}
          {tab === 'json' && <JsonTab tree={tree} onApply={(t) => history.set(t)} />}
        </div>
      </div>
    </TreeContext.Provider>
  );
}

function JsonTab({ tree, onApply }: { tree: DecisionTree; onApply: (t: DecisionTree) => void }) {
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
        <span className="muted small">This is the exact document stored in localStorage and exported to file.</span>
      </div>
      <textarea className="json-editor mono" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  );
}
