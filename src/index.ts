/**
 * Public entry point for using Treedom as a library.
 *
 * - `core`: framework-agnostic model, engine, validation and (de)serialisation.
 * - `DecisionTreeStudio`: full editor + graph + player + JSON, backed by localStorage.
 * - `DecisionTreePlayer`: embeddable player for a single tree.
 */
export * from './core';
export { DecisionTreeStudio } from './ui/DecisionTreeStudio';
export { DecisionTreePlayer, type DecisionTreePlayerProps } from './ui/Player';
export * as storage from './storage/localStore';
export { createItServicesTree } from './examples/itServices';
