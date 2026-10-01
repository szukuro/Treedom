# Treedom

A TypeScript/React toolkit for building **stateful, non-linear decision trees**. It works like a "choose your own adventure" book with a form-builder editor on top.

Unlike a linear wizard (for example the [RxJS operator decision tree](https://rxjs.dev/operator-decision-tree)), a Treedom tree keeps **state**. You define numeric variables (counters and flags). Choices change those variables, and each transition can check them, so the next step depends on everything answered so far, not only on the latest answer. Loops, skipped questions, re-entry from a result screen and hidden scoring steps are all supported.

```bash
npm install
npm run dev        # open the studio at http://localhost:5173
npm test           # engine + example tests
npm run build      # type-check and build a static bundle into dist/
```

On first launch the studio opens the bundled **IT services example**. Trees are saved to `localStorage` as you edit. Use **Export** and **Import** to move them around as `.json` files.

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

## The studio

- **Editor**: the sidebar lists tree settings, state variables and all nodes. Unreachable nodes are dimmed and nodes with problems get a coloured dot. Each node has editors for:
  - its text
  - on-enter effects
  - each choice's show-if condition, effects and transitions
  - its default routing

  The condition builder supports nested AND/OR/NOT groups. Renaming a node id or a variable key updates every reference, including `{{placeholders}}` in text. The **Play** button on a node starts a play-through from that node. A validation bar lists broken references, dead ends, unreachable nodes, transitions shadowed by an earlier unconditional one, and similar problems. Undo/redo is available (Ctrl+Z / Ctrl+Shift+Z).
- **Graph**: an automatic left-to-right layout. Dashed edges are conditional, and the last play-through is highlighted. Click a node to edit it.
- **Play**: the player as an end user sees it, next to a live state table (changed values are highlighted) and a step trace that shows which rule fired.
- **JSON**: the exact document that is stored and exported. You can edit it here and apply the changes.

## Using it as a library

```tsx
import { DecisionTreeStudio, DecisionTreePlayer, parseTree, playPath } from './src';

// Full authoring environment
<DecisionTreeStudio />

// Just the player, e.g. embedded on a landing page
<DecisionTreePlayer tree={parseTree(json)} />

// Headless: the engine is plain TypeScript with no React dependency
const session = playPath(tree, ['improve', 's3', 'p_release', 'p_done']);
session.nodeId; session.vars; session.trace;
```

The code is laid out as follows:

- `src/core/`: framework-agnostic, pure functions with no side effects.
  - `types.ts`: the JSON schema.
  - `engine.ts`: sessions, choose, back and interpolation.
  - `conditions.ts`: evaluation and descriptions.
  - `validate.ts`: static checks.
  - `mutations.ts`: factories and reference-preserving renames.
  - `serialize.ts`: tolerant JSON import.
- `src/storage/localStore.ts`: the localStorage library plus file import and export.
- `src/ui/`: the React studio, editor, graph and player.

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

A tree is a single JSON document (`schemaVersion: 1`). Each tree is stored under `treedom:tree:<id>` in `localStorage`, with an index at `treedom:index`. Import fills in missing optional arrays and ids, so hand-written files can be short:

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
