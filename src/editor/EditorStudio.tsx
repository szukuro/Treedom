import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthUser, TreeRepository, TreeSummary } from '../api/types';
import type { DecisionTree, NodeKind, Session } from '../core';
import { getNode, newNode, newTree, startSession, uid, validateTree } from '../core';
import { createItServicesTree } from '../examples/itServices';
import { TreeEditor, type EditorSelection } from './components/TreeEditor';
import { downloadTreeJson, PUBLISH_FILE_NAME, readTreeFile } from './fileIO';
import { GraphView } from './GraphView';
import { JsonTab } from './JsonTab';
import { getLastOpenTreeId, setLastOpenTreeId } from './preferences';
import { Preview } from './Preview';
import { TreeContext, type TreeContextValue } from './TreeContext';
import { useUndoable } from './useUndoable';
import { ThemeToggle } from '../shared/ThemeToggle';

type Tab = 'edit' | 'graph' | 'preview' | 'json';
type SaveState = 'saved' | 'saving' | 'error';

export interface EditorStudioProps {
  /** Where drafts are listed, loaded and saved (see `src/api/editorApi.ts`). */
  trees: TreeRepository;
  user?: AuthUser;
  onLogout?: () => void;
}

/** Opens the last edited tree, else the first one, else seeds the example. */
async function openInitialTree(trees: TreeRepository): Promise<DecisionTree> {
  const last = getLastOpenTreeId();
  const fromLast = last ? await trees.load(last) : null;
  if (fromLast) return fromLast;
  const first = (await trees.list())[0];
  const fromFirst = first ? await trees.load(first.id) : null;
  return fromFirst ?? trees.save(createItServicesTree());
}

/**
 * The authoring environment: tree library, editor, graph, preview and raw JSON.
 * All persistence goes through the injected `TreeRepository`.
 */
export function EditorStudio(props: EditorStudioProps) {
  const [initial, setInitial] = useState<{ tree: DecisionTree; library: TreeSummary[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    openInitialTree(props.trees)
      .then(async (tree) => {
        const library = await props.trees.list();
        if (!cancelled) setInitial({ tree, library });
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [props.trees]);

  if (error) return <div className="center-screen error-text">Could not load your trees: {error}</div>;
  if (!initial) return <div className="center-screen muted">Loading…</div>;
  return <Workspace {...props} initialTree={initial.tree} initialLibrary={initial.library} />;
}

function Workspace({
  trees,
  user,
  onLogout,
  initialTree,
  initialLibrary,
}: EditorStudioProps & { initialTree: DecisionTree; initialLibrary: TreeSummary[] }) {
  const history = useUndoable<DecisionTree>(initialTree);
  const tree = history.value;
  const [library, setLibrary] = useState<TreeSummary[]>(initialLibrary);
  const [tab, setTab] = useState<Tab>('edit');
  const [selection, setSelection] = useState<EditorSelection>({ type: 'node', id: initialTree.startNodeId });
  const [session, setSession] = useState<Session>(() => startSession(initialTree));
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  /** The value last handed to the repository; anything else is unsaved. */
  const savedRef = useRef<DecisionTree>(initialTree);

  const issues = useMemo(() => validateTree(tree), [tree]);

  const refreshLibrary = useCallback(async () => setLibrary(await trees.list()), [trees]);

  const persist = useCallback(
    async (t: DecisionTree) => {
      savedRef.current = t;
      const stored = await trees.save(t);
      await refreshLibrary();
      return stored;
    },
    [trees, refreshLibrary],
  );

  // Autosave (debounced) whenever the tree differs from what was last saved.
  useEffect(() => {
    if (tree === savedRef.current) return;
    setSaveState('saving');
    const timer = setTimeout(() => {
      persist(tree)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 400);
    return () => clearTimeout(timer);
  }, [tree, persist]);

  useEffect(() => setLastOpenTreeId(tree.id), [tree.id]);

  // Keep the preview session valid while editing.
  useEffect(() => {
    if (!getNode(tree, session.nodeId)) setSession(startSession(tree));
  }, [tree, session.nodeId]);

  const open = useCallback(
    (t: DecisionTree) => {
      savedRef.current = t;
      history.reset(t);
      setSelection({ type: 'node', id: t.startNodeId });
      setSession(startSession(t));
      setSaveState('saved');
    },
    [history],
  );

  /** Saves pending edits, then runs an async library action; errors are reported, not thrown. */
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      if (tree !== savedRef.current) await persist(tree);
      await action();
      await refreshLibrary();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

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

  const switchTo = (id: string) =>
    run(async () => {
      if (id === tree.id) return;
      const t = await trees.load(id);
      if (!t) throw new Error('That tree no longer exists.');
      open(t);
    });
  const createNew = () => run(async () => open(await trees.save(newTree())));
  const loadExample = () =>
    run(async () => {
      const example = createItServicesTree();
      const exists = library.some((t) => t.id === example.id);
      if (exists && !confirm('Reset the example tree to its original version? Your changes to it will be lost.')) {
        const current = await trees.load(example.id);
        if (current) open(current);
        return;
      }
      open(await trees.save(example));
    });
  const duplicate = () => run(async () => open(await trees.save({ ...structuredClone(tree), id: uid('tree'), title: `${tree.title} (copy)` })));
  const remove = () => {
    if (!confirm(`Delete "${tree.title}"? Export it first if you want to keep a copy.`)) return;
    savedRef.current = tree; // nothing left to autosave
    void run(async () => {
      await trees.remove(tree.id);
      const next = (await trees.list())[0];
      open((next && (await trees.load(next.id))) || (await trees.save(newTree())));
    });
  };
  const importFile = (file: File) =>
    run(async () => {
      let t = await readTreeFile(file);
      if ((await trees.list()).some((s) => s.id === t.id)) {
        const replace = confirm(`A tree with id "${t.id}" already exists. OK = replace it, Cancel = import as a copy.`);
        if (!replace) t = { ...t, id: uid('tree'), title: `${t.title} (imported)` };
      }
      open(await trees.save(t));
    });
  const exportJson = () => {
    const errors = issues.filter((i) => i.level === 'error').length;
    if (errors && !confirm(`This tree has ${errors} validation error(s), so some paths may fail in the viewer. Export anyway?`)) return;
    downloadTreeJson(tree);
  };

  const errors = issues.filter((i) => i.level === 'error').length;

  return (
    <TreeContext.Provider value={ctx}>
      <div className="studio">
        <header className="topbar">
          <div className="brand">
            <span className="logo">🌳</span> Treedom <span className="muted small wide-only">Editor</span>
          </div>
          <select className="tree-picker" value={tree.id} disabled={busy} onChange={(e) => void switchTo(e.target.value)} title="Your trees">
            {!library.some((t) => t.id === tree.id) && <option value={tree.id}>{tree.title}</option>}
            {library.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id === tree.id ? tree.title : t.title}
              </option>
            ))}
          </select>
          <div className="toolbar">
            <button type="button" disabled={busy} onClick={() => void createNew()}>
              New
            </button>
            <button type="button" disabled={busy} onClick={() => void duplicate()}>
              Duplicate
            </button>
            <button type="button" disabled={busy} onClick={() => void loadExample()} title="Open (or reset) the IT services example">
              Example
            </button>
            <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} title="Open a tree JSON file">
              Import
            </button>
            <button type="button" className="primary" onClick={exportJson} title={`Download ${PUBLISH_FILE_NAME} – put it next to the viewer's index.html to publish`}>
              ⬇ Export<span className="wide-only"> {PUBLISH_FILE_NAME}</span>
            </button>
            <button type="button" disabled={busy} className="danger" onClick={remove}>
              Delete
            </button>
            <span className="sep" />
            <button type="button" onClick={history.undo} disabled={!history.canUndo} title="Undo (Ctrl+Z)">
              ↶
            </button>
            <button type="button" onClick={history.redo} disabled={!history.canRedo} title="Redo (Ctrl+Shift+Z)">
              ↷
            </button>
            <span
              className={`save-state small ${saveState === 'error' ? 'error-text' : 'muted'}`}
              title={saveState === 'error' ? 'Saving failed – it will be retried on the next change.' : saveState === 'saving' ? 'Saving…' : 'All changes saved'}
            >
              {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? '⚠ Not saved' : '✓ Saved'}
            </span>
          </div>
          <div className="user-box small">
            <ThemeToggle />
            {user && (
              <>
                <span className="muted wide-only">{user.displayName}</span>
                <button type="button" onClick={onLogout} title={`Signed in as ${user.displayName}`}>
                  Log out
                </button>
              </>
            )}
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
              ['preview', 'Preview'],
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
                setTab('preview');
              }}
            />
          )}
          {tab === 'graph' && <GraphView tree={tree} session={session} onSelect={ctx.selectNode} />}
          {tab === 'preview' && (
            <div className="preview-tab">
              {errors > 0 && <div className="issues has-errors">This tree has {errors} validation error(s); some paths may fail.</div>}
              <Preview tree={tree} session={session} onSessionChange={setSession} onEditNode={ctx.selectNode} />
            </div>
          )}
          {tab === 'json' && <JsonTab tree={tree} onApply={(t) => history.set(t)} />}
        </div>
      </div>
    </TreeContext.Provider>
  );
}
