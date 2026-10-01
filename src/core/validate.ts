import { conditionVars } from './conditions';
import type { Condition, DecisionTree, Effect, Transition, TreeNode } from './types';

export type IssueLevel = 'error' | 'warning';

export interface Issue {
  level: IssueLevel;
  message: string;
  nodeId?: string;
}

const KEY_PATTERN = /^[A-Za-z_]\w*$/;

function visitedNodes(condition: Condition | undefined, out: string[] = []): string[] {
  if (!condition) return out;
  if (condition.type === 'visited') out.push(condition.node);
  else if (condition.type === 'not') visitedNodes(condition.condition, out);
  else if (condition.type === 'all' || condition.type === 'any') condition.conditions.forEach((c) => visitedNodes(c, out));
  return out;
}

/** All outgoing edges of a node (choice transitions first, then node transitions). */
export function outgoingTransitions(node: TreeNode): Transition[] {
  return [...node.choices.flatMap((c) => c.transitions), ...node.transitions];
}

export function reachableNodes(tree: DecisionTree): Set<string> {
  const seen = new Set<string>();
  const stack = [tree.startNodeId];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = tree.nodes.find((n) => n.id === id);
    if (node) outgoingTransitions(node).forEach((t) => stack.push(t.to));
  }
  return seen;
}

/**
 * Static checks. Errors make the tree unplayable on some path; warnings are
 * likely mistakes. Because routing depends on runtime state, a clean result does
 * not guarantee every path ends well – use the player to try paths out.
 */
export function validateTree(tree: DecisionTree): Issue[] {
  const issues: Issue[] = [];
  const nodeIds = new Set<string>();
  const varKeys = new Set<string>();

  for (const v of tree.variables) {
    if (!KEY_PATTERN.test(v.key)) issues.push({ level: 'error', message: `Variable key "${v.key}" must be an identifier (letters, digits, _).` });
    if (varKeys.has(v.key)) issues.push({ level: 'error', message: `Duplicate variable key "${v.key}".` });
    varKeys.add(v.key);
    if (v.min !== undefined && v.max !== undefined && v.min > v.max) {
      issues.push({ level: 'error', message: `Variable "${v.key}" has min > max.` });
    }
  }

  for (const n of tree.nodes) {
    if (nodeIds.has(n.id)) issues.push({ level: 'error', message: `Duplicate node id "${n.id}".`, nodeId: n.id });
    nodeIds.add(n.id);
  }

  if (!nodeIds.has(tree.startNodeId)) issues.push({ level: 'error', message: `Start node "${tree.startNodeId}" does not exist.` });

  const checkCondition = (c: Condition | undefined, where: string, nodeId: string) => {
    for (const key of conditionVars(c)) {
      if (!varKeys.has(key)) issues.push({ level: 'error', message: `${where} uses unknown variable "${key}".`, nodeId });
    }
    for (const id of visitedNodes(c)) {
      if (!nodeIds.has(id)) issues.push({ level: 'error', message: `${where} checks visit of unknown node "${id}".`, nodeId });
    }
  };
  const checkEffects = (effects: Effect[], where: string, nodeId: string) => {
    for (const e of effects) {
      if (!varKeys.has(e.var)) issues.push({ level: 'error', message: `${where} changes unknown variable "${e.var}".`, nodeId });
      if (typeof e.value !== 'number' && !varKeys.has(e.value.var)) {
        issues.push({ level: 'error', message: `${where} reads unknown variable "${e.value.var}".`, nodeId });
      }
    }
  };
  const checkTransitions = (ts: Transition[], where: string, nodeId: string) => {
    ts.forEach((t, i) => {
      if (!nodeIds.has(t.to)) issues.push({ level: 'error', message: `${where} transition #${i + 1} points to missing node "${t.to}".`, nodeId });
      checkCondition(t.when, `${where} transition #${i + 1}`, nodeId);
      if (!t.when && i < ts.length - 1) {
        issues.push({ level: 'warning', message: `${where} transition #${i + 1} is unconditional, so the ones after it never run.`, nodeId });
      }
    });
  };
  const hasFallback = (ts: Transition[]) => ts.some((t) => !t.when);

  for (const node of tree.nodes) {
    const id = node.id;
    checkEffects(node.onEnter, 'On-enter effect', id);
    checkTransitions(node.transitions, 'Node', id);

    if (node.kind === 'router') {
      if (node.transitions.length === 0) issues.push({ level: 'error', message: 'Router has no transitions.', nodeId: id });
      else if (!hasFallback(node.transitions)) issues.push({ level: 'warning', message: 'Router has no unconditional fallback transition – it may dead-end.', nodeId: id });
      if (node.choices.length) issues.push({ level: 'warning', message: 'Router choices are ignored.', nodeId: id });
    }
    if (node.kind === 'question' && node.choices.length === 0) {
      issues.push({ level: 'error', message: 'Question has no choices.', nodeId: id });
    }

    node.choices.forEach((choice, ci) => {
      const where = `Choice "${choice.label || `#${ci + 1}`}"`;
      checkCondition(choice.showIf, where, id);
      checkEffects(choice.effects, where, id);
      checkTransitions(choice.transitions, where, id);
      if (!hasFallback(choice.transitions) && !hasFallback(node.transitions)) {
        const msg =
          choice.transitions.length + node.transitions.length === 0
            ? `${where} leads nowhere (no choice or node transitions).`
            : `${where} has only conditional transitions and no fallback – it may dead-end.`;
        issues.push({ level: choice.transitions.length + node.transitions.length === 0 ? 'error' : 'warning', message: msg, nodeId: id });
      }
    });
  }

  const reachable = reachableNodes(tree);
  for (const node of tree.nodes) {
    if (!reachable.has(node.id)) issues.push({ level: 'warning', message: 'Node is not reachable from the start node.', nodeId: node.id });
  }

  return issues;
}
