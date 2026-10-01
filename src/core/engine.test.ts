import { describe, expect, it } from 'vitest';
import { back, choose, interpolate, playPath, startSession, availableChoices } from './engine';
import { evaluate, applyEffects, describeCondition } from './conditions';
import { renameNode, renameVariable, newTree, variableUsage } from './mutations';
import { parseTree, serializeTree } from './serialize';
import { validateTree } from './validate';
import type { DecisionTree } from './types';

const loopTree = (): DecisionTree => ({
  schemaVersion: 1,
  id: 't',
  title: 'loop',
  description: '',
  startNodeId: 'q',
  variables: [{ key: 'n', label: 'n', initial: 0, min: 0, max: 3 }],
  nodes: [
    {
      id: 'q', kind: 'question', title: 'Q', body: 'n={{n}}', onEnter: [],
      choices: [
        { id: 'inc', label: '+1', effects: [{ var: 'n', op: 'add', value: 1 }], transitions: [] },
        { id: 'stop', label: 'stop', showIf: { type: 'compare', left: { var: 'n' }, op: 'gte', right: 1 }, effects: [], transitions: [{ id: 's', to: 'end' }] },
      ],
      transitions: [{ id: 'a', to: 'q', when: { type: 'compare', left: { var: 'n' }, op: 'lt', right: 2 } }, { id: 'b', to: 'r' }],
    },
    { id: 'r', kind: 'router', title: 'R', body: '', onEnter: [{ var: 'n', op: 'multiply', value: 10 }], choices: [], transitions: [{ id: 'c', to: 'end' }] },
    { id: 'end', kind: 'outcome', title: 'End', body: '', onEnter: [], choices: [], transitions: [] },
  ],
});

describe('conditions', () => {
  it('evaluates nested groups, var-vs-var and visited', () => {
    const ctx = { vars: { a: 2, b: 3 }, visits: { x: 1 } };
    expect(evaluate({ type: 'compare', left: { var: 'a' }, op: 'lt', right: { var: 'b' } }, ctx)).toBe(true);
    expect(evaluate({ type: 'any', conditions: [] }, ctx)).toBe(false);
    expect(evaluate({ type: 'all', conditions: [] }, ctx)).toBe(true);
    expect(evaluate({ type: 'not', condition: { type: 'visited', node: 'y' } }, ctx)).toBe(true);
    expect(evaluate({ type: 'all', conditions: [{ type: 'visited', node: 'x' }, { type: 'compare', left: { var: 'a' }, op: 'eq', right: 2 }] }, ctx)).toBe(true);
  });
  it('clamps effects to min/max', () => {
    const vars = applyEffects([{ var: 'n', op: 'add', value: 10 }], { n: 0 }, [{ key: 'n', label: '', initial: 0, max: 3 }]);
    expect(vars.n).toBe(3);
  });
  it('describes conditions', () => {
    expect(describeCondition({ type: 'all', conditions: [{ type: 'compare', left: { var: 'a' }, op: 'gte', right: 1 }, { type: 'visited', node: 'x' }] })).toBe('a ≥ 1 AND visited x');
  });
});

describe('engine', () => {
  it('loops on a node, hides/shows choices by state and follows routers', () => {
    const tree = loopTree();
    let s = startSession(tree);
    expect(availableChoices(tree, s).map((c) => c.id)).toEqual(['inc']);
    s = choose(tree, s, 'inc');
    expect(s.nodeId).toBe('q');
    expect(s.visits.q).toBe(2);
    expect(availableChoices(tree, s).map((c) => c.id)).toEqual(['inc', 'stop']);
    s = choose(tree, s, 'inc');
    // n=2 -> node fallback to router r, which multiplies (clamped to 3) and goes to end
    expect(s.nodeId).toBe('end');
    expect(s.vars.n).toBe(3);
    expect(s.status).toBe('finished');
  });
  it('choice transitions win over node transitions', () => {
    const tree = loopTree();
    const s = playPath(tree, ['inc', 'stop'].slice(0, 1));
    expect(choose(tree, s, 'stop').nodeId).toBe('end');
  });
  it('supports back', () => {
    const tree = loopTree();
    const s1 = choose(tree, startSession(tree), 'inc');
    const s0 = back(s1);
    expect(s0.vars.n).toBe(0);
    expect(s0.past).toHaveLength(0);
  });
  it('detects router loops', () => {
    const tree = loopTree();
    tree.nodes[1].transitions = [{ id: 'x', to: 'r' }];
    const s = playPath(tree, ['inc', 'inc']);
    expect(s.status).toBe('error');
  });
  it('interpolates variables', () => {
    expect(interpolate('n={{ n }} {{unknown}}', { n: 4 })).toBe('n=4 {{unknown}}');
  });
});

describe('mutations & serialisation', () => {
  it('renames variables everywhere', () => {
    const tree = renameVariable(loopTree(), 'n', 'count');
    expect(variableUsage(tree, 'count')).toBe(5);
    expect(variableUsage(tree, 'n')).toBe(0);
    expect(tree.nodes[0].body).toBe('n={{count}}');
    expect(validateTree(tree).filter((i) => i.level === 'error')).toEqual([]);
  });
  it('renames nodes everywhere', () => {
    const tree = renameNode(loopTree(), 'end', 'finish');
    expect(tree.nodes[2].id).toBe('finish');
    expect(tree.nodes[1].transitions[0].to).toBe('finish');
    expect(validateTree(tree).filter((i) => i.level === 'error')).toEqual([]);
  });
  it('round-trips through JSON and fills defaults', () => {
    const tree = loopTree();
    expect(parseTree(serializeTree(tree))).toEqual(tree);
    const terse = parseTree('{"nodes":[{"id":"a","choices":[{"label":"x","transitions":[{"to":"a"}]}]}]}');
    expect(terse.startNodeId).toBe('a');
    expect(terse.nodes[0].choices[0].effects).toEqual([]);
    expect(() => parseTree('nope')).toThrow();
  });
  it('validates a new tree as clean and flags broken references', () => {
    const tree = newTree();
    expect(validateTree(tree)).toEqual([]);
    tree.nodes[0].transitions[0].to = 'missing';
    expect(validateTree(tree).some((i) => i.level === 'error')).toBe(true);
  });
});

describe('README sample', () => {
  it('imports and plays', () => {
    const tree = parseTree(`{
      "startNodeId": "q",
      "variables": [{ "key": "score", "label": "Score", "initial": 0 }],
      "nodes": [
        { "id": "q", "title": "Pick one", "choices": [
          { "label": "A", "effects": [{ "var": "score", "op": "add", "value": 2 }] },
          { "label": "B" }
        ], "transitions": [
          { "when": { "type": "compare", "left": { "var": "score" }, "op": "gte", "right": 2 }, "to": "good" },
          { "to": "meh" }
        ]},
        { "id": "good", "kind": "outcome", "title": "Great" },
        { "id": "meh", "kind": "outcome", "title": "Okay" }
      ]
    }`);
    expect(validateTree(tree)).toEqual([]);
    const [a, b] = tree.nodes[0].choices;
    expect(choose(tree, startSession(tree), a.id).nodeId).toBe('good');
    expect(choose(tree, startSession(tree), b.id).nodeId).toBe('meh');
  });
});
