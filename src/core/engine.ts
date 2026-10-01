import { applyEffects, evaluate, type EvalContext, type VarValues } from './conditions';
import type { Choice, DecisionTree, Effect, NodeId, Transition, TreeNode } from './types';

/** Guards against router cycles that never stop at a visible node. */
export const MAX_AUTO_STEPS = 200;

export interface TraceEntry {
  nodeId: NodeId;
  /** `enter` = node entered (with its onEnter effects), `choose` = choice picked, `route` = transition taken. */
  kind: 'enter' | 'choose' | 'route';
  choiceId?: string;
  transitionId?: string;
  /** Target of a `route` entry. */
  to?: NodeId;
  /** Where the matching transition came from. */
  source?: 'choice' | 'node';
  effects?: Effect[];
  vars: VarValues;
}

export interface SessionState {
  nodeId: NodeId;
  vars: VarValues;
  visits: Record<NodeId, number>;
  status: 'active' | 'finished' | 'error';
  error?: string;
  /** Visible steps taken so far: the node shown and the choice picked there. */
  path: { nodeId: NodeId; choiceId: string }[];
  trace: TraceEntry[];
}

export interface Session extends SessionState {
  /** Previous states, for "back". */
  past: SessionState[];
}

export function getNode(tree: DecisionTree, id: NodeId): TreeNode | undefined {
  return tree.nodes.find((n) => n.id === id);
}

export function initialVars(tree: DecisionTree): VarValues {
  const vars: VarValues = {};
  for (const v of tree.variables) vars[v.key] = v.initial;
  return vars;
}

function ctxOf(state: Pick<SessionState, 'vars' | 'visits'>): EvalContext {
  return { vars: state.vars, visits: state.visits };
}

export function firstMatchingTransition(
  transitions: Transition[],
  ctx: EvalContext,
): Transition | undefined {
  return transitions.find((t) => evaluate(t.when, ctx));
}

export function availableChoices(tree: DecisionTree, state: SessionState): Choice[] {
  const node = getNode(tree, state.nodeId);
  if (!node || node.kind === 'router' || state.status === 'error') return [];
  return node.choices.filter((c) => evaluate(c.showIf, ctxOf(state)));
}

function fail(state: SessionState, error: string): SessionState {
  return { ...state, status: 'error', error };
}

/** Enters `nodeId` and keeps following router nodes until a visible node is reached. */
function enter(tree: DecisionTree, base: SessionState, nodeId: NodeId): SessionState {
  let state: SessionState = { ...base, trace: [...base.trace] };
  let targetId = nodeId;

  for (let step = 0; step < MAX_AUTO_STEPS; step++) {
    const node = getNode(tree, targetId);
    if (!node) return fail(state, `Node "${targetId}" does not exist.`);

    const visits = { ...state.visits, [node.id]: (state.visits[node.id] ?? 0) + 1 };
    const vars = applyEffects(node.onEnter, state.vars, tree.variables);
    state = { ...state, nodeId: node.id, visits, vars, status: 'active', error: undefined };
    state.trace.push({ nodeId: node.id, kind: 'enter', effects: node.onEnter, vars });

    if (node.kind !== 'router') {
      const finished = availableChoices(tree, state).length === 0;
      if (finished && node.kind === 'question') {
        return fail(state, `Question "${node.id}" has no available choices.`);
      }
      return { ...state, status: finished ? 'finished' : 'active' };
    }

    const transition = firstMatchingTransition(node.transitions, ctxOf(state));
    if (!transition) return fail(state, `Router "${node.id}" has no matching transition.`);
    state.trace.push({
      nodeId: node.id,
      kind: 'route',
      transitionId: transition.id,
      to: transition.to,
      source: 'node',
      vars,
    });
    targetId = transition.to;
  }
  return fail(state, `Stopped after ${MAX_AUTO_STEPS} automatic steps – is there a router loop?`);
}

/** Starts a new session at the tree's start node (or at `startAt`, handy for testing a branch). */
export function startSession(tree: DecisionTree, startAt: NodeId = tree.startNodeId): Session {
  const blank: SessionState = {
    nodeId: startAt,
    vars: initialVars(tree),
    visits: {},
    status: 'active',
    path: [],
    trace: [],
  };
  return { ...enter(tree, blank, startAt), past: [] };
}

/** Picks a choice on the current node and advances. Returns the same session if the choice is not available. */
export function choose(tree: DecisionTree, session: Session, choiceId: string): Session {
  if (session.status !== 'active') return session;
  const node = getNode(tree, session.nodeId);
  const choice = availableChoices(tree, session).find((c) => c.id === choiceId);
  if (!node || !choice) return session;

  const { past, ...current } = session;
  const vars = applyEffects(choice.effects, current.vars, tree.variables);
  let state: SessionState = {
    ...current,
    vars,
    path: [...current.path, { nodeId: node.id, choiceId }],
    trace: [...current.trace, { nodeId: node.id, kind: 'choose', choiceId, effects: choice.effects, vars }],
  };

  const ctx = ctxOf(state);
  let source: 'choice' | 'node' = 'choice';
  let transition = firstMatchingTransition(choice.transitions, ctx);
  if (!transition) {
    source = 'node';
    transition = firstMatchingTransition(node.transitions, ctx);
  }
  if (!transition) {
    state = fail(state, `No transition matched after choosing "${choice.label}" on "${node.id}".`);
    return { ...state, past: [...past, current] };
  }
  state.trace.push({ nodeId: node.id, kind: 'route', choiceId, transitionId: transition.id, to: transition.to, source, vars });

  return { ...enter(tree, state, transition.to), past: [...past, current] };
}

export function back(session: Session): Session {
  if (session.past.length === 0) return session;
  const past = session.past.slice(0, -1);
  return { ...session.past[session.past.length - 1], past };
}

/** Replaces `{{varKey}}` with the variable's current value. Unknown keys are left untouched. */
export function interpolate(text: string, vars: VarValues): string {
  return text.replace(/\{\{\s*([A-Za-z_][\w]*)\s*\}\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** Convenience for tests and scripted runs: plays a list of choice ids from the start. */
export function playPath(tree: DecisionTree, choiceIds: string[]): Session {
  let session = startSession(tree);
  for (const id of choiceIds) {
    const next = choose(tree, session, id);
    if (next === session) {
      throw new Error(`Choice "${id}" is not available on node "${session.nodeId}".`);
    }
    session = next;
  }
  return session;
}
