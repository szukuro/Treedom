/**
 * Contracts for everything that talks (or will eventually talk) to a backend.
 *
 * The UI only ever depends on these interfaces, obtained from `editorApi.ts` /
 * `viewerApi.ts`. For the serverless MVP they are implemented with hardcoded
 * credentials, localStorage and a static `decision.json`; replacing them with a
 * real API means writing another implementation (see `./http/`) and changing
 * one line in the wiring file – no component changes.
 *
 * All methods are async on purpose, even where the local implementation is
 * synchronous, so that switching to the network doesn't change call sites.
 */
import type { DecisionTree } from '../core';

// --- authentication -----------------------------------------------------------

export interface AuthUser {
  username: string;
  displayName: string;
}

export interface AuthSession {
  user: AuthUser;
  /** Bearer token for API calls. Unused by the local implementation. */
  token?: string;
}

export class AuthError extends Error {}

export interface AuthApi {
  /** Resolves with a session, or rejects with `AuthError` for bad credentials. */
  login(username: string, password: string): Promise<AuthSession>;
  logout(): Promise<void>;
  /** The current session if the user is still signed in (e.g. after a reload). */
  currentSession(): Promise<AuthSession | null>;
}

// --- editor: tree library ------------------------------------------------------

export interface TreeSummary {
  id: string;
  title: string;
  updatedAt?: string;
}

/** The editor's working copies (drafts). */
export interface TreeRepository {
  list(): Promise<TreeSummary[]>;
  /** Resolves with `null` if there is no tree with that id. */
  load(id: string): Promise<DecisionTree | null>;
  /** Creates or replaces a tree; resolves with the stored version (e.g. with `updatedAt` set). */
  save(tree: DecisionTree): Promise<DecisionTree>;
  remove(id: string): Promise<void>;
}

// --- viewer: published tree ----------------------------------------------------

export interface PublishedTree {
  tree: DecisionTree;
  /** Validation errors (warnings are dropped – visitors can't act on them). */
  errors: import('../core').Issue[];
}

export class TreeLoadError extends Error {}

/** Where the viewer gets the published tree from. */
export interface PublishedTreeSource {
  /** Rejects with `TreeLoadError` when the tree can't be fetched or parsed. */
  load(url: string, signal?: AbortSignal): Promise<PublishedTree>;
}
