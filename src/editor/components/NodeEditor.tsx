import { useEffect, useState } from 'react';
import type { Choice, ChoiceTextField, NodeKind, NodeTextField, OutcomeTone, TranslationLocale, TreeNode } from '../../core';
import { incomingNodes, newChoice, renameNode, setTranslation, uid } from '../../core';
import { useTree } from '../TreeContext';
import { ConditionEditor } from './ConditionEditor';
import { EffectsEditor } from './EffectsEditor';
import { IconButton, ListControls, move } from './fields';
import { LocalizedField } from './LocalizedField';
import { TransitionsEditor } from './TransitionsEditor';

const ID_PATTERN = /^[\w-]+$/;

const KIND_HELP: Record<NodeKind, string> = {
  question: 'Shows the text and waits for the user to pick a choice.',
  router: 'Invisible. Applies its on-enter effects, then immediately follows the first matching transition.',
  outcome: 'A result screen. It ends the session unless it offers choices.',
};

export function NodeEditor({ node, onPlayFrom }: { node: TreeNode; onPlayFrom?: () => void }) {
  const { tree, update, selectNode } = useTree();
  const [idDraft, setIdDraft] = useState(node.id);
  useEffect(() => setIdDraft(node.id), [node.id]);

  const patch = (fn: (n: TreeNode) => TreeNode, coalesceKey?: string) =>
    update((t) => ({ ...t, nodes: t.nodes.map((n) => (n.id === node.id ? fn(n) : n)) }), coalesceKey && `${node.id}:${coalesceKey}`);

  const idTaken = idDraft !== node.id && tree.nodes.some((n) => n.id === idDraft);
  const idValid = ID_PATTERN.test(idDraft) && !idTaken;
  const commitId = () => {
    if (idDraft === node.id) return;
    if (!idValid) {
      setIdDraft(node.id);
      return;
    }
    update((t) => renameNode(t, node.id, idDraft));
    selectNode(idDraft);
  };

  const setKind = (kind: NodeKind) =>
    patch((n) => {
      const next: TreeNode = { ...n, kind };
      if (kind === 'outcome' && !next.outcome) next.outcome = { tone: 'neutral' };
      if (kind !== 'outcome') delete next.outcome;
      return next;
    });

  const removeNode = () => {
    const incoming = incomingNodes(tree, node.id).filter((id) => id !== node.id);
    const msg = incoming.length
      ? `Delete "${node.id}"? It is still targeted by: ${incoming.join(', ')}. Those transitions will be flagged as broken.`
      : `Delete "${node.id}"?`;
    if (!confirm(msg)) return;
    update((t) => ({ ...t, nodes: t.nodes.filter((n) => n.id !== node.id) }));
    selectNode('');
  };

  const duplicate = () => {
    const ids = new Set(tree.nodes.map((n) => n.id));
    let id = `${node.id}_copy`;
    for (let i = 2; ids.has(id); i++) id = `${node.id}_copy${i}`;
    const copy: TreeNode = structuredClone(node);
    copy.id = id;
    copy.choices = copy.choices.map((c) => ({ ...c, id: uid('c'), transitions: c.transitions.map((t) => ({ ...t, id: uid('t') })) }));
    copy.transitions = copy.transitions.map((t) => ({ ...t, id: uid('t') }));
    update((t) => {
      const index = t.nodes.findIndex((n) => n.id === node.id);
      const nodes = [...t.nodes];
      nodes.splice(index + 1, 0, copy);
      return { ...t, nodes };
    });
    selectNode(id);
  };

  const setChoices = (choices: Choice[], key?: string) => patch((n) => ({ ...n, choices }), key);
  const incoming = incomingNodes(tree, node.id);
  const isStart = tree.startNodeId === node.id;

  return (
    <div className="node-editor">
      <div className="node-editor-head">
        <div className="field-row">
          <label className="field">
            <span>ID</span>
            <input
              className={idValid ? 'mono' : 'mono invalid'}
              value={idDraft}
              onChange={(e) => setIdDraft(e.target.value.trim())}
              onBlur={commitId}
              onKeyDown={(e) => e.key === 'Enter' && commitId()}
              title={idTaken ? 'ID already used' : 'Renaming updates every reference'}
            />
          </label>
          <label className="field">
            <span>Kind</span>
            <select value={node.kind} onChange={(e) => setKind(e.target.value as NodeKind)}>
              <option value="question">Question</option>
              <option value="router">Router (automatic)</option>
              <option value="outcome">Outcome</option>
            </select>
          </label>
          <div className="spacer" />
          {isStart ? (
            <span className="pill start">start node</span>
          ) : (
            <button type="button" onClick={() => update((t) => ({ ...t, startNodeId: node.id }))}>
              Set as start
            </button>
          )}
          {onPlayFrom && (
            <button type="button" onClick={onPlayFrom}>
              ▶ Preview
            </button>
          )}
          <button type="button" onClick={duplicate}>
            Duplicate
          </button>
          <button type="button" className="danger" onClick={removeNode}>
            Delete
          </button>
        </div>
        <p className="muted small">{KIND_HELP[node.kind]}</p>
        {incoming.length > 0 && (
          <p className="small">
            <span className="muted">Reached from: </span>
            {incoming.map((id) => (
              <button key={id} type="button" className="chip" onClick={() => selectNode(id)}>
                {id}
              </button>
            ))}
          </p>
        )}
      </div>

      {node.kind === 'router' ? (
        <label className="field">
          <span>Title (editor only)</span>
          <input value={node.title} onChange={(e) => patch((n) => ({ ...n, title: e.target.value }), 'title')} />
        </label>
      ) : (
        <>
          <LocalizedField
            label="Title"
            value={node.title}
            onChange={(title) => patch((n) => ({ ...n, title }), 'title')}
            translations={node.translations?.title}
            onTranslationChange={(locale, v) => patch((n) => withNodeTranslation(n, 'title', locale, v), `title-${locale}`)}
          />
          <LocalizedField
            label="Text"
            hint={<>supports **bold**, *italic* and {'{{variable}}'} placeholders</>}
            multiline
            value={node.body}
            onChange={(body) => patch((n) => ({ ...n, body }), 'body')}
            translations={node.translations?.body}
            onTranslationChange={(locale, v) => patch((n) => withNodeTranslation(n, 'body', locale, v), `body-${locale}`)}
          />
        </>
      )}

      {node.kind === 'outcome' && node.outcome && (
        <div className="field-row">
          <label className="field">
            <span>Tone</span>
            <select value={node.outcome.tone} onChange={(e) => patch((n) => ({ ...n, outcome: { ...n.outcome!, tone: e.target.value as OutcomeTone } }))}>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </label>
          <LocalizedField
            label="Call-to-action label"
            className="grow"
            value={node.outcome.cta?.label ?? ''}
            onChange={(label) =>
              patch((n) => {
                const url = n.outcome?.cta?.url ?? '';
                const outcome: NonNullable<TreeNode['outcome']> = { ...n.outcome!, cta: { label, url } };
                if (!label && !url) delete outcome.cta;
                return { ...n, outcome };
              }, 'cta-label')
            }
            translations={node.translations?.ctaLabel}
            onTranslationChange={(locale, v) => patch((n) => withNodeTranslation(n, 'ctaLabel', locale, v), `cta-${locale}`)}
          />
          <label className="field grow">
            <span>Call-to-action URL</span>
            <input
              value={node.outcome.cta?.url ?? ''}
              onChange={(e) =>
                patch((n) => {
                  const url = e.target.value;
                  const label = n.outcome?.cta?.label ?? '';
                  const outcome: NonNullable<TreeNode['outcome']> = { ...n.outcome!, cta: { label, url } };
                  if (!label && !url) delete outcome.cta;
                  return { ...n, outcome };
                }, 'cta-url')
              }
            />
          </label>
        </div>
      )}

      <section className="section">
        <h3>On enter</h3>
        <p className="muted small">Applied every time this node is entered.</p>
        <EffectsEditor value={node.onEnter} onChange={(onEnter) => patch((n) => ({ ...n, onEnter }))} />
      </section>

      {node.kind !== 'router' && (
        <section className="section">
          <h3>
            Choices <span className="muted small">({node.choices.length})</span>
          </h3>
          {node.choices.length === 0 && <p className="muted">{node.kind === 'outcome' ? 'No choices – the session ends here.' : 'Add at least one choice.'}</p>}
          {node.choices.map((choice, i) => (
            <ChoiceCard
              key={choice.id}
              choice={choice}
              index={i}
              count={node.choices.length}
              onChange={(c, key) => setChoices(node.choices.map((x, j) => (j === i ? c : x)), key && `${choice.id}:${key}`)}
              onMove={(to) => setChoices(move(node.choices, i, to))}
              onRemove={() => setChoices(node.choices.filter((_, j) => j !== i))}
            />
          ))}
          <button type="button" onClick={() => setChoices([...node.choices, newChoice(`Option ${node.choices.length + 1}`)])}>
            + Add choice
          </button>
        </section>
      )}

      <section className="section">
        <h3>{node.kind === 'router' ? 'Routing' : 'Default routing'}</h3>
        <p className="muted small">
          {node.kind === 'router'
            ? 'Evaluated top to bottom, the first transition whose condition holds is taken.'
            : "Used when a picked choice has no matching transition of its own – so choices can differ only by their effects and share this routing. Evaluated after the choice's effects are applied."}
        </p>
        <TransitionsEditor
          value={node.transitions}
          onChange={(transitions) => patch((n) => ({ ...n, transitions }))}
          emptyLabel={node.kind === 'router' ? 'A router needs at least one transition.' : 'None.'}
        />
      </section>

      <label className="field">
        <span>Editor notes</span>
        <textarea
          rows={2}
          value={node.notes ?? ''}
          onChange={(e) =>
            patch((n) => {
              const next: TreeNode = { ...n, notes: e.target.value };
              if (!next.notes) delete next.notes;
              return next;
            }, 'notes')
          }
        />
      </label>
    </div>
  );
}

function ChoiceCard({
  choice,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  choice: Choice;
  index: number;
  count: number;
  onChange: (c: Choice, coalesceKey?: string) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="choice-card">
      <div className="choice-head">
        <IconButton title={open ? 'Collapse' : 'Expand'} onClick={() => setOpen(!open)}>
          {open ? '▾' : '▸'}
        </IconButton>
        <span className="choice-index">{index + 1}</span>
        <LocalizedField
          label="Choice"
          className="grow choice-label-field"
          inputClassName="choice-label"
          placeholder="Choice label"
          value={choice.label}
          onChange={(label) => onChange({ ...choice, label }, 'label')}
          translations={choice.translations?.label}
          onTranslationChange={(locale, v) => onChange(withChoiceTranslation(choice, 'label', locale, v), `label-${locale}`)}
        />
        <div className="choice-head-side">
          <span className="muted small mono" title="Choice id">
            {choice.id}
          </span>
          <ListControls index={index} length={count} onMove={onMove} onRemove={onRemove} />
        </div>
      </div>
      {!open ? (
        <div className="choice-summary muted small">
          {choice.showIf && 'conditional · '}
          {choice.effects.length} effect(s) · {choice.transitions.length} transition(s)
        </div>
      ) : (
        <div className="choice-body">
          <LocalizedField
            label="Description (optional)"
            value={choice.description ?? ''}
            onChange={(description) => {
              const next: Choice = { ...choice, description };
              if (!next.description) delete next.description;
              onChange(next, 'description');
            }}
            translations={choice.translations?.description}
            onTranslationChange={(locale, v) => onChange(withChoiceTranslation(choice, 'description', locale, v), `description-${locale}`)}
          />
          <div className="sub">
            <h4>Show only if</h4>
            <ConditionEditor
              value={choice.showIf}
              emptyLabel="always shown"
              onChange={(showIf) => {
                const next = { ...choice };
                if (showIf) next.showIf = showIf;
                else delete next.showIf;
                onChange(next);
              }}
            />
          </div>
          <div className="sub">
            <h4>Effects</h4>
            <EffectsEditor value={choice.effects} onChange={(effects) => onChange({ ...choice, effects })} />
          </div>
          <div className="sub">
            <h4>Transitions</h4>
            <TransitionsEditor
              value={choice.transitions}
              onChange={(transitions) => onChange({ ...choice, transitions })}
              emptyLabel="None – uses the node's default routing."
            />
          </div>
        </div>
      )}
    </div>
  );
}

function withNodeTranslation(n: TreeNode, field: NodeTextField, locale: TranslationLocale, value: string): TreeNode {
  const next: TreeNode = { ...n, translations: setTranslation(n.translations, field, locale, value) };
  if (!next.translations) delete next.translations;
  return next;
}

function withChoiceTranslation(c: Choice, field: ChoiceTextField, locale: TranslationLocale, value: string): Choice {
  const next: Choice = { ...c, translations: setTranslation(c.translations, field, locale, value) };
  if (!next.translations) delete next.translations;
  return next;
}
