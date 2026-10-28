# Treedom

A TypeScript/React toolkit for building **stateful, non-linear decision trees**. It works like a "choose your own adventure" book with a form-builder editor on top.

Unlike a linear wizard (for example the [RxJS operator decision tree](https://rxjs.dev/operator-decision-tree)), a Treedom tree keeps **state**. You define numeric variables (counters and flags). Choices change those variables, and each transition can check them, so the next step depends on everything answered so far, not only on the latest answer. Loops, skipped questions, re-entry from a result screen and hidden scoring steps are all supported.

Treedom has two separate apps that share one engine:

| App | Who it's for | What it does |
| --- | --- | --- |
| **Editor** (`apps/editor`) | Authors, behind a login | Build trees, try them out in **Preview**, then **Export `decision.json`**. Drafts are stored in the browser's localStorage. |
| **Viewer** (`apps/viewer`) | Visitors | Read-only. Fetches `decision.json` from the folder it is hosted in and plays it. It contains no editor, login or storage code. |

```bash
npm install
npm run dev          # editor  → http://localhost:5173  (login: editor / treedom)
npm run dev:viewer   # viewer  → http://localhost:5174  (serves apps/viewer/public/decision.json)
npm test             # engine, API layer, URL resolution, example
npm run build        # → dist/editor/ and dist/viewer/, each a self-contained static folder
```

### Publishing a tree (no server code needed)

1. Sign in to the editor, build the tree and check it in the **Preview** tab.
2. Click **⬇ Export decision.json**.
3. Upload `dist/viewer/` to any static host, together with your `decision.json`:

```
example.com/decision/index.html      ← dist/viewer/index.html
example.com/decision/assets/…        ← dist/viewer/assets/
example.com/decision/decision.json   ← the exported file (replaces the bundled example)
```

The viewer resolves `decision.json` relative to its own page. `…/decision/index.html`, `…/decision/` and `…/decision` (no trailing slash) all load `…/decision/decision.json`. See `src/viewer/resolveDecisionUrl.ts`. All asset URLs are relative, so the folder can live under any path. The file is fetched with `cache: no-cache`, so re-uploading it takes effect immediately.

### Editor login

The credentials are hardcoded in `src/api/local/credentials.ts`: `editor` / `treedom` by default. You can override them at build time with `VITE_EDITOR_USERNAME` and `VITE_EDITOR_PASSWORD`. **This is a UX gate, not security.** The values ship inside the JavaScript bundle, so don't deploy the editor anywhere it must be protected. The login lasts for the browser tab (sessionStorage).

### Look & feel

- **Font:** [Poppins](https://fonts.google.com/specimen/Poppins), loaded from Google Fonts in both `index.html` files.
- **Themes:** light and dark. Both apps have a toggle that cycles **Auto** (follow the OS setting) → **Light** → **Dark**. The choice is stored per browser and applied before first paint, so there's no flash of the wrong theme. See `src/shared/theme.ts`.
- **Palette:** each mode has its own shade of each colour. All colours are CSS variables in `src/shared/base.css`.

| Role | Light | Dark |
| --- | --- | --- |
| Accent and outcomes (green) | jade `#0b7a62` | sea glass `#4fd6ad` |
| Questions (blue) | lapis `#2a4b9b` | periwinkle `#8fa7ff` |
| Danger and negative (red) | cardinal `#b3213f` | watermelon `#ff6f87` |
| Routers (violet) | byzantium `#7b2d7e` | orchid `#d290ef` |
| Warnings and play-through (amber) | saffron `#b0700a` | marigold `#f2b544` |

## Localization

Trees can be played in **English** (the main language), **Hungarian** and **German**. These three are hardcoded, and no other languages can be added at runtime. The editor itself is always in English.

**Author-written texts** carry their translations in the JSON. English stays in the plain field. Each element with player-visible text gets a `translations` node, keyed by field, then by language:

```json
{
  "id": "start",
  "title": "What brings you here today?",
  "body": "Answer a few quick questions…",
  "translations": {
    "title": { "hu": "Mi hozott ma ide?", "de": "Was führt Sie heute zu uns?" },
    "body":  { "hu": "Válaszoljon néhány gyors kérdésre…", "de": "Beantworten Sie ein paar kurze Fragen…" }
  }
}
```

| Element | Translatable fields |
| --- | --- |
| tree | `title`, `description` |
| question / outcome node | `title`, `body`, `ctaLabel` (the call-to-action button's label) |
| choice | `label`, `description` |

Router titles, transition notes and variable labels are editor-only and are not translated. A missing or blank translation falls back to English. `{{variable}}` placeholders work in every language, and renaming a variable updates them everywhere. Files without `translations` are still valid.

**Fixed player texts** ("Step 2", "← Back", "Start over", "Recommendation", loading and error messages, the theme switch) are hardcoded per language in `src/player/strings.ts`.

**In the editor**, each player-visible input is a set of tabs. The first tab is the field itself ("Title", "Text", "Choice", …) and the next two are **Hungarian** and **German**. A dot on a tab shows whether that translation is done (filled) or missing (hollow). The translation tabs show the English text underneath for reference. **Tree settings → Translations** shows coverage per language and links to every node with gaps.

**In the player**, an EN / HU / DE switch appears above the questions. Switching keeps the current progress. The starting language is chosen in this order:

1. The `language` parameter of the player component (`<DecisionTreePlayer language="hu" />`, `<DecisionTreeViewer language="de" />`). The standalone viewer page maps `?lang=hu` to this parameter.
2. The browser's preferred languages (`navigator.languages`), if the tree is translated into one of them.
3. English.

A language counts as "available" once at least one text in the tree is translated into it. The bundled example is fully translated into both languages.

## Project structure

```
apps/
  editor/ index.html, main.tsx        editor entry point
  viewer/ index.html, main.tsx        viewer entry point
          public/decision.json        default tree the viewer serves (the example)
src/
  core/      engine, types, conditions, validation, (de)serialisation (no React, no I/O)
  api/       every call that will eventually go to a backend (see below)
  player/    DecisionTreePlayer: the presentational player shared by viewer and Preview
  viewer/    DecisionTreeViewer: fetches the published tree and renders the player
  editor/    EditorApp (login gate), EditorStudio, editor forms, graph, Preview, JSON tab
  examples/  the IT services example tree
```

## API layer: swapping in a real backend

Everything that will eventually talk to a server is in `src/api/`, behind async interfaces (`src/api/types.ts`):

| Interface | Used by | MVP implementation | Template for a real API |
| --- | --- | --- | --- |
| `AuthApi`: `login`, `logout`, `currentSession` | editor login gate | `local/localAuthApi.ts` (hardcoded credentials, sessionStorage) | `http/httpAuthApi.ts` (token-based REST) |
| `TreeRepository`: `list`, `load`, `save`, `remove` | editor library and autosave | `local/localTreeRepository.ts` (localStorage) | `http/httpTreeRepository.ts` (`/trees/:id` REST) |
| `PublishedTreeSource`: `load(url)` | viewer | `http/fetchPublishedTreeSource.ts` (static `decision.json`) | same, pointed at an API endpoint |

The components never import an implementation directly. They get one from a single wiring file per app, `src/api/editorApi.ts` or `src/api/viewerApi.ts`. To move to a backend, implement or adapt the HTTP templates and change those wiring files. `editorApi.ts` contains a commented example. The interfaces are async even where localStorage is synchronous, so call sites don't change. The HTTP templates compile but are not wired in or tested against a real server. Browser-only concerns stay in the editor and are not part of the API layer: file download/import (`src/editor/fileIO.ts`) and the "last opened tree" preference (`src/editor/preferences.ts`).

## The model

| Concept | What it does |
| --- | --- |
| **Variable** | A numeric counter with a `key`, an `initial` value and an optional `min`/`max` clamp. A flag is a counter clamped to 0…1. |
| **Question node** | Shows a title and body text (body supports `**bold**`, `*italic*` and `{{variable}}` placeholders) plus a list of choices. |
| **Router node** | Invisible to the player. It applies its on-enter effects, then follows the first matching transition. Use it for branching on state alone, such as a final scoring step. |
| **Outcome node** | A result screen with a tone and an optional call-to-action link. It can still offer choices, for example "I'd still like a consultation", which lead back into the tree. |
| **Choice** | Has a `showIf` condition (the choice is hidden otherwise), a list of **effects** (`set`, `add`, `subtract`, `multiply` by a number or another variable) and its own **transitions**. |
| **Transition** | `{ when?, to }`. Transitions are checked in order and the first match wins. A transition with no `when` always matches, so it works as the "else". |
| **Condition** | `compare` (variable or number against variable or number), `all` (AND), `any` (OR), `not`, and `visited` (has this node been entered before?). |

### What happens when a choice is picked

1. The choice's effects are applied to the state.
2. The choice's own transitions are checked. If none matches, the node's **default routing** is checked instead. This lets several choices that differ only in their effects share one set of routing rules.
3. The target node is entered: its visit count goes up and its on-enter effects run. A router immediately follows its own transitions. This repeats until a question or outcome is reached. Router-only loops are capped at 200 steps and reported as an error.

`Back` restores the previous snapshot, and the player keeps a full trace of every step for debugging.

## The editor

- **Editor tab**: the sidebar lists tree settings, state variables and all nodes. Unreachable nodes are dimmed and nodes with problems get a coloured dot. Each node has editors for:
  - its text
  - on-enter effects
  - each choice's show-if condition, effects and transitions
  - its default routing

  The condition builder supports nested AND/OR/NOT groups. Renaming a node id or a variable key updates every reference, including `{{placeholders}}` in text. The **▶ Preview** button on a node starts a preview from that node. A validation bar lists broken references, dead ends, unreachable nodes, transitions shadowed by an earlier unconditional one, and similar problems. Undo/redo is available (Ctrl+Z / Ctrl+Shift+Z).
- **Graph**: an automatic left-to-right layout. Dashed edges are conditional, and the last play-through is highlighted. Click a node to edit it.
- **Preview**: the same player component the viewer uses, next to a live state table (changed values are highlighted) and a step trace that shows which rule fired.
- **JSON**: the exact document that is stored and exported. You can edit it here and apply the changes.

## Using it as a library

```tsx
import { EditorApp, DecisionTreeViewer, DecisionTreePlayer, parseTree, playPath } from './src';

<EditorApp />                                   // login + authoring environment
<DecisionTreeViewer />                          // fetches ./decision.json
<DecisionTreeViewer language="hu" />            // ...starting in Hungarian
<DecisionTreeViewer src="/api/trees/42" />      // ...or any URL returning the JSON
<DecisionTreePlayer tree={parseTree(json)} />   // just the player, for a tree you already have

// Headless: the engine is plain TypeScript with no React dependency
const session = playPath(tree, ['improve', 's3', 'p_release', 'p_done']);
session.nodeId; session.vars; session.trace;
```

## The example: "Kestrel Digital – are we the right partner?"

`src/examples/itServices.ts` (exported as [`examples/it-services.json`](examples/it-services.json)) is a lead-qualification tree for a hypothetical IT services company. The company does architecture, DevOps, development and testing on web and mobile, for upper-mid to extra-large organisations. The tree is deliberately non-linear:

- **The order of questions depends on intent.** "Build something" asks *what* before company size. "Improve a system" and "Get advice" ask size first. "Just exploring" asks size and then jumps into one of the other branches, which skip the size question because `visited size` is already true.
- **Small companies with a simple site** go to a router that sends them straight to *"use WordPress / Webflow / Shopify"*. That outcome still offers a choice that leads to the **ad-hoc consultation** offer.
- **Large companies with a "simple website"** are not turned away. They get the integration, team, budget and compliance questions, because at that size even a website is usually a portal.
- **The pain-point question loops on itself.** Options already picked are hidden, "That's everything" only appears after the first pick, and after three picks the tree moves on by itself.
- **Compliance is only asked of companies with 50+ people**, and never twice. Budget is skipped if it is already known.
- **A final `evaluate` router** picks the recommendation from accumulated counters: `fit`, `size`, `budget`, `complexity` and `need_arch` / `need_devops` / `need_dev` / `need_qa`. Rules can compare two counters, for example *DevOps engagement when `need_devops ≥ need_qa`*. The possible recommendations are full delivery, DevOps, QA, architecture partnership, one-off architecture review, ad-hoc consultation, DIY, a discovery call, or *not a fit* for desktop/embedded work. *Not a fit* still lets the user say "we also have web needs", which resets a flag and goes back into the tree.

The tests in `src/examples/itServices.test.ts` walk these paths. They also run thousands of random walks to check that no path dead-ends and that every outcome can be reached.

## Storage format

A tree is a single JSON document (`schemaVersion: 1`). The editor exports it as `decision.json`. In the MVP, drafts are stored in localStorage under `treedom:tree:<id>`, with an index at `treedom:index`. Import fills in missing optional arrays and ids, so hand-written files can be short:

```json
{
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
}
```
