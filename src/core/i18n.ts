/**
 * Localization of tree content (texts written by the author). The player's own
 * fixed UI strings ("Back", "Step 2"…) are in `src/player/strings.ts`.
 */
import type {
  Choice,
  DecisionTree,
  Locale,
  LocalizedText,
  TranslationLocale,
  Translations,
  TreeNode,
} from './types';
import { DEFAULT_LOCALE, LOCALES, TRANSLATION_LOCALES } from './types';

export const LOCALE_NAMES: Record<Locale, { english: string; native: string }> = {
  en: { english: 'English', native: 'English' },
  hu: { english: 'Hungarian', native: 'Magyar' },
  de: { english: 'German', native: 'Deutsch' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Maps a BCP 47 tag ("hu-HU", "de_AT", "EN") to a supported locale, or undefined. */
export function matchLocale(tag: string | undefined | null): Locale | undefined {
  if (!tag) return undefined;
  const base = tag.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : undefined;
}

/**
 * Picks the language a player starts in:
 *  1. `requested` (explicit parameter), if it is a supported language;
 *  2. the first of the browser's preferred languages that the tree is available in;
 *  3. English.
 */
export function resolveInitialLocale(
  requested: string | undefined,
  browserLanguages: readonly string[],
  available: readonly Locale[] = LOCALES,
): Locale {
  const fromParam = matchLocale(requested);
  if (fromParam) return fromParam;
  for (const tag of browserLanguages) {
    const match = matchLocale(tag);
    if (match && available.includes(match)) return match;
  }
  return DEFAULT_LOCALE;
}

/** The browser's preferred languages, most preferred first (empty outside a browser). */
export function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : navigator.language ? [navigator.language] : [];
}

/**
 * Returns the text of `field` in `locale`, falling back to the main (English)
 * text when there is no translation.
 */
export function localize<F extends string>(
  base: string | undefined,
  translations: Translations<F> | undefined,
  field: F,
  locale: Locale,
): string {
  if (locale !== DEFAULT_LOCALE) {
    const t = translations?.[field]?.[locale as TranslationLocale];
    if (t && t.trim()) return t;
  }
  return base ?? '';
}

export const nodeText = (node: TreeNode, field: 'title' | 'body', locale: Locale) => localize(node[field], node.translations, field, locale);
export const ctaText = (node: TreeNode, locale: Locale) => localize(node.outcome?.cta?.label, node.translations, 'ctaLabel', locale);
export const choiceText = (choice: Choice, field: 'label' | 'description', locale: Locale) =>
  localize(choice[field], choice.translations, field, locale);
export const treeText = (tree: DecisionTree, field: 'title' | 'description', locale: Locale) =>
  localize(tree[field], tree.translations, field, locale);

/** Returns `translations` with one value changed; empty values and empty groups are dropped. */
export function setTranslation<F extends string>(
  translations: Translations<F> | undefined,
  field: F,
  locale: TranslationLocale,
  value: string,
): Translations<F> | undefined {
  const fieldTexts: LocalizedText = { ...(translations?.[field] ?? {}) };
  if (value) fieldTexts[locale] = value;
  else delete fieldTexts[locale];
  const next = { ...(translations ?? {}) } as Translations<F>;
  if (Object.keys(fieldTexts).length) next[field] = fieldTexts;
  else delete next[field];
  return Object.keys(next).length ? next : undefined;
}

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

export interface TranslatableText {
  /** Node id, or undefined for tree-level texts. */
  nodeId?: string;
  choiceId?: string;
  field: string;
  base: string;
  translations?: LocalizedText;
}

/** Every player-visible, non-empty text in the tree (router titles and editor notes are excluded). */
export function translatableTexts(tree: DecisionTree): TranslatableText[] {
  const out: TranslatableText[] = [];
  const push = (t: TranslatableText) => t.base.trim() && out.push(t);
  push({ field: 'title', base: tree.title, translations: tree.translations?.title });
  push({ field: 'description', base: tree.description, translations: tree.translations?.description });
  for (const n of tree.nodes) {
    if (n.kind === 'router') continue;
    push({ nodeId: n.id, field: 'title', base: n.title, translations: n.translations?.title });
    push({ nodeId: n.id, field: 'body', base: n.body, translations: n.translations?.body });
    if (n.outcome?.cta) push({ nodeId: n.id, field: 'ctaLabel', base: n.outcome.cta.label, translations: n.translations?.ctaLabel });
    for (const c of n.choices) {
      push({ nodeId: n.id, choiceId: c.id, field: 'label', base: c.label, translations: c.translations?.label });
      if (c.description) push({ nodeId: n.id, choiceId: c.id, field: 'description', base: c.description, translations: c.translations?.description });
    }
  }
  return out;
}

export interface Coverage {
  locale: TranslationLocale;
  translated: number;
  total: number;
  /** Nodes with at least one missing text (`''` = tree-level texts). */
  incompleteNodes: string[];
}

export function translationCoverage(tree: DecisionTree): Coverage[] {
  const texts = translatableTexts(tree);
  return TRANSLATION_LOCALES.map((locale) => {
    const missing = texts.filter((t) => !t.translations?.[locale]?.trim());
    return {
      locale,
      translated: texts.length - missing.length,
      total: texts.length,
      incompleteNodes: [...new Set(missing.map((t) => t.nodeId ?? ''))],
    };
  });
}

/** Languages the tree can be offered in: English plus every language with at least one translation. */
export function availableLocales(tree: DecisionTree): Locale[] {
  const texts = translatableTexts(tree);
  return [DEFAULT_LOCALE, ...TRANSLATION_LOCALES.filter((l) => texts.some((t) => t.translations?.[l]?.trim()))];
}
