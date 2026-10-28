/**
 * Hardcoded editor credentials for the serverless MVP.
 *
 * ⚠️ This is a UX gate, NOT security: the values end up in the JavaScript
 * bundle and anyone can read them. Real protection needs a server (see
 * `../http/httpAuthApi.ts`). They can be changed at build time with the
 * `VITE_EDITOR_USERNAME` / `VITE_EDITOR_PASSWORD` environment variables.
 */
export const EDITOR_CREDENTIALS = {
  username: import.meta.env?.VITE_EDITOR_USERNAME || 'editor',
  password: import.meta.env?.VITE_EDITOR_PASSWORD || 'treedom',
  displayName: 'Editor',
};
