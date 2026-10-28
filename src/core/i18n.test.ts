import { describe, expect, it } from 'vitest';
import {
  availableLocales,
  localize,
  matchLocale,
  resolveInitialLocale,
  setTranslation,
  translationCoverage,
} from './i18n';
import { newTree, renameVariable, variableUsage } from './mutations';
import { parseTree, serializeTree } from './serialize';
import type { DecisionTree } from './types';

describe('locale resolution', () => {
  it('normalises language tags', () => {
    expect(matchLocale('hu-HU')).toBe('hu');
    expect(matchLocale('DE_at')).toBe('de');
    expect(matchLocale('fr-FR')).toBeUndefined();
    expect(matchLocale(undefined)).toBeUndefined();
  });
  it('1. an explicit parameter wins', () => {
    expect(resolveInitialLocale('de', ['hu-HU'], ['en', 'hu', 'de'])).toBe('de');
  });
  it('1b. an unsupported parameter is ignored', () => {
    expect(resolveInitialLocale('fr', ['hu-HU'], ['en', 'hu'])).toBe('hu');
  });
  it('2. otherwise the first browser language the tree is available in', () => {
    expect(resolveInitialLocale(undefined, ['fr-FR', 'de-DE', 'hu'], ['en', 'hu', 'de'])).toBe('de');
    expect(resolveInitialLocale(undefined, ['de-DE', 'hu'], ['en', 'hu'])).toBe('hu');
  });
  it('3. otherwise English', () => {
    expect(resolveInitialLocale(undefined, ['fr-FR'], ['en', 'hu', 'de'])).toBe('en');
    expect(resolveInitialLocale(undefined, ['hu'], ['en'])).toBe('en');
    expect(resolveInitialLocale(undefined, [])).toBe('en');
  });
});

describe('localize', () => {
  it('falls back to the main text when a translation is missing or blank', () => {
    const tr = { title: { hu: 'Cím', de: '  ' } };
    expect(localize('Title', tr, 'title', 'hu')).toBe('Cím');
    expect(localize('Title', tr, 'title', 'de')).toBe('Title');
    expect(localize('Title', undefined, 'title', 'hu')).toBe('Title');
    expect(localize('Title', tr, 'title', 'en')).toBe('Title');
  });
  it('setTranslation adds, replaces and prunes', () => {
    let tr = setTranslation<'title' | 'body'>(undefined, 'title', 'hu', 'Cím');
    expect(tr).toEqual({ title: { hu: 'Cím' } });
    tr = setTranslation(tr, 'body', 'de', 'Text');
    expect(tr).toEqual({ title: { hu: 'Cím' }, body: { de: 'Text' } });
    tr = setTranslation(tr, 'title', 'hu', '');
    expect(tr).toEqual({ body: { de: 'Text' } });
    expect(setTranslation(tr, 'body', 'de', '')).toBeUndefined();
  });
});

const translated = (): DecisionTree => {
  const tree = newTree('Hello');
  tree.variables = [{ key: 'n', label: 'n', initial: 0 }];
  tree.nodes[0].body = 'n={{n}}';
  tree.nodes[0].translations = { title: { hu: 'Első kérdés' }, body: { hu: 'n értéke {{n}}', de: 'n ist {{n}}' } };
  tree.nodes[0].choices[0].translations = { label: { hu: 'A lehetőség' } };
  return tree;
};

describe('translations in the tree', () => {
  it('survive a JSON round trip, and junk is dropped on import', () => {
    const tree = translated();
    expect(parseTree(serializeTree(tree))).toEqual(tree);
    const messy = JSON.parse(serializeTree(tree));
    messy.nodes[0].translations.title.fr = 'Titre';
    messy.nodes[0].translations.title.de = 42;
    messy.nodes[0].translations.junk = 'x';
    messy.translations = { title: { hu: '' } };
    const parsed = parseTree(messy);
    expect(parsed.nodes[0].translations?.title).toEqual({ hu: 'Első kérdés' });
    expect(parsed.translations).toBeUndefined();
  });
  it('renaming a variable updates placeholders in every language', () => {
    const tree = renameVariable(translated(), 'n', 'count');
    expect(tree.nodes[0].translations?.body).toEqual({ hu: 'n értéke {{count}}', de: 'n ist {{count}}' });
    expect(variableUsage(tree, 'count')).toBe(3);
  });
  it('reports coverage and available languages', () => {
    const tree = translated();
    expect(availableLocales(tree)).toEqual(['en', 'hu', 'de']);
    const [hu, de] = translationCoverage(tree);
    expect(hu.translated).toBe(3);
    expect(de.translated).toBe(1);
    expect(hu.total).toBe(de.total);
    expect(availableLocales(newTree())).toEqual(['en']);
  });
});
