import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTree, serializeTree } from '../core';
import { createItServicesTree } from './itServices';

const ROOT = resolve(import.meta.dirname, '../..');
/** The example as a standalone file, and the copy the viewer serves by default. */
const FILES = ['examples/it-services.json', 'apps/viewer/public/decision.json'];

/** Keeps the JSON copies in sync with the TypeScript source. Regenerate with `npm run export-example`. */
describe.each(FILES)('%s', (file) => {
  const path = resolve(ROOT, file);
  const json = serializeTree(createItServicesTree()) + '\n';
  if (process.env.UPDATE_EXAMPLES) writeFileSync(path, json);

  it('matches the TypeScript source', () => {
    expect(readFileSync(path, 'utf8')).toBe(json);
  });
  it('can be imported', () => {
    expect(parseTree(readFileSync(path, 'utf8'))).toEqual(createItServicesTree());
  });
});
