/**
 * Public entry point for using Treedom as a library.
 *
 * - `core`: framework-agnostic model, engine, validation and (de)serialisation.
 * - `api`: backend contracts (auth, tree repository, published tree source) and their implementations.
 * - `EditorApp` / `EditorStudio`: the login-gated authoring environment.
 * - `DecisionTreeViewer`: standalone viewer that fetches `decision.json` next to the page.
 * - `DecisionTreePlayer`: the presentational player used by both.
 */
export * from './core';
export * from './api';
export { editorApi, type EditorApi } from './api/editorApi';
export { viewerApi, type ViewerApi } from './api/viewerApi';
export { EditorApp } from './editor/EditorApp';
export { EditorStudio, type EditorStudioProps } from './editor/EditorStudio';
export { DecisionTreeViewer, type DecisionTreeViewerProps } from './viewer/DecisionTreeViewer';
export { resolveDecisionUrl } from './viewer/resolveDecisionUrl';
export { DecisionTreePlayer, type DecisionTreePlayerProps } from './player/DecisionTreePlayer';
export { createItServicesTree } from './examples/itServices';
