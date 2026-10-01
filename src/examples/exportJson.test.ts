import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTree, serializeTree } from '../core';
import { createItServicesTree } from './itServices';

const FILE = resolve(import.meta.dirname, '../../examples/it-services.json');

/** Keeps examples/it-services.json in sync. Regenerate with `npm run export-example`. */
describe('examples/it-services.json', () => {
  const json = serializeTree(createItServicesTree()) + '\n';
  if (process.env.UPDATE_EXAMPLES) writeFileSync(FILE, json);

  it('matches the TypeScript source', () => {
    expect(readFileSync(FILE, 'utf8')).toBe(json);
  });
  it('can be imported', () => {
    expect(parseTree(readFileSync(FILE, 'utf8'))).toEqual(createItServicesTree());
  });
});
