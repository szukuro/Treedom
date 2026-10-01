/**
 * Treedom data model.
 *
 * A decision tree is a directed graph (cycles allowed) of nodes. The player walks
 * the graph; every step may change a set of numeric state variables ("counters"),
 * and where to go next is decided by ordered, conditional transitions that can look
 * at that state, not just at the choice that was made.
 *
 * Everything here is plain JSON, so a tree can be stored in localStorage or a file
 * unchanged.
 */

export const SCHEMA_VERSION = 1;

export type NodeId = string;
export type VarKey = string;

/** A numeric operand: a literal number or a reference to a state variable. */
export type Operand = number | { var: VarKey };

export type Comparator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';

export interface CompareCondition {
  type: 'compare';
  left: Operand;
  op: Comparator;
  right: Operand;
}

export interface GroupCondition {
  /** `all` = logical AND, `any` = logical OR. An empty `all` is true, an empty `any` is false. */
  type: 'all' | 'any';
  conditions: Condition[];
}

export interface NotCondition {
  type: 'not';
  condition: Condition;
}

/** True when the given node was entered at least once before (path dependency). */
export interface VisitedCondition {
  type: 'visited';
  node: NodeId;
}

export type Condition = CompareCondition | GroupCondition | NotCondition | VisitedCondition;

export type EffectOp = 'set' | 'add' | 'subtract' | 'multiply';

/** Changes a state variable. Results are clamped to the variable's min/max. */
export interface Effect {
  var: VarKey;
  op: EffectOp;
  value: Operand;
}

/**
 * An edge. Transitions are evaluated in order and the first whose condition holds
 * wins. A transition without `when` always matches (use it as the "else" branch).
 */
export interface Transition {
  id: string;
  when?: Condition;
  to: NodeId;
  /** Optional note shown in the graph and editor. */
  label?: string;
}

export interface Choice {
  id: string;
  label: string;
  description?: string;
  /** The choice is only offered when this holds. */
  showIf?: Condition;
  /** Applied (in order) when the choice is picked, before any transition is evaluated. */
  effects: Effect[];
  /**
   * Choice-specific routing. If none matches, the node's own transitions are used,
   * so choices that only differ in their effects can share the node's routing.
   */
  transitions: Transition[];
}

/**
 * - `question`: shows its body and choices, waits for the user.
 * - `router`: invisible; applies `onEnter` and immediately follows its transitions.
 * - `outcome`: a result screen. May still offer choices (e.g. "I'd still like advice").
 */
export type NodeKind = 'question' | 'router' | 'outcome';

export type OutcomeTone = 'positive' | 'neutral' | 'negative';

export interface TreeNode {
  id: NodeId;
  kind: NodeKind;
  title: string;
  /** Text shown to the user. `{{varKey}}` is replaced with the variable's current value. */
  body: string;
  /** Applied every time the node is entered. */
  onEnter: Effect[];
  choices: Choice[];
  /** Node-level routing, used for routers and as a fallback for choices. */
  transitions: Transition[];
  outcome?: {
    tone: OutcomeTone;
    cta?: { label: string; url: string };
  };
  /** Free-form editor note, never shown to players. */
  notes?: string;
}

export interface Variable {
  /** Identifier used in conditions, effects and `{{ }}` interpolation. */
  key: VarKey;
  label: string;
  description?: string;
  initial: number;
  min?: number;
  max?: number;
}

export interface DecisionTree {
  schemaVersion: number;
  id: string;
  title: string;
  description: string;
  startNodeId: NodeId;
  variables: Variable[];
  nodes: TreeNode[];
  updatedAt?: string;
}
