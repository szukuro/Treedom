/**
 * Fixed UI strings of the player and viewer (everything the tree author does not
 * write). Hardcoded for the supported languages; tree content is translated via
 * the tree's own `translations` (see src/core/i18n.ts).
 */
import type { Locale } from '../core';

export interface PlayerStrings {
  step: (n: number) => string;
  finished: string;
  back: string;
  startOver: string;
  recommendation: string;
  errorTitle: string;
  ctaFallback: string;
  language: string;
  loading: string;
  notAvailable: string;
  expectsFile: string;
  configProblems: (n: number) => string;
  theme: { auto: string; light: string; dark: string; label: string };
}

export const PLAYER_STRINGS: Record<Locale, PlayerStrings> = {
  en: {
    step: (n) => `Step ${n}`,
    finished: 'finished',
    back: '← Back',
    startOver: '↺ Start over',
    recommendation: 'Recommendation',
    errorTitle: "Sorry, this questionnaire can't continue",
    ctaFallback: 'Continue',
    language: 'Language',
    loading: 'Loading…',
    notAvailable: 'This questionnaire is not available',
    expectsFile: 'The viewer expects a decision.json exported from the Treedom editor in the same folder as this page.',
    configProblems: (n) => `This questionnaire has ${n} configuration problem(s); some answers may not lead anywhere.`,
    theme: { auto: 'Auto', light: 'Light', dark: 'Dark', label: 'Theme' },
  },
  hu: {
    step: (n) => `${n}. lépés`,
    finished: 'befejezve',
    back: '← Vissza',
    startOver: '↺ Újrakezdés',
    recommendation: 'Javaslatunk',
    errorTitle: 'Sajnáljuk, a kérdőív nem folytatható',
    ctaFallback: 'Tovább',
    language: 'Nyelv',
    loading: 'Betöltés…',
    notAvailable: 'Ez a kérdőív nem érhető el',
    expectsFile: 'A megjelenítő a Treedom szerkesztőből exportált decision.json fájlt várja ugyanabban a mappában, ahol ez az oldal található.',
    configProblems: (n) => `A kérdőívben ${n} beállítási hiba van, ezért egyes válaszok zsákutcába vezethetnek.`,
    theme: { auto: 'Automatikus', light: 'Világos', dark: 'Sötét', label: 'Téma' },
  },
  de: {
    step: (n) => `Schritt ${n}`,
    finished: 'abgeschlossen',
    back: '← Zurück',
    startOver: '↺ Neu starten',
    recommendation: 'Empfehlung',
    errorTitle: 'Dieser Fragebogen kann leider nicht fortgesetzt werden',
    ctaFallback: 'Weiter',
    language: 'Sprache',
    loading: 'Wird geladen…',
    notAvailable: 'Dieser Fragebogen ist nicht verfügbar',
    expectsFile: 'Der Viewer erwartet eine aus dem Treedom-Editor exportierte decision.json im selben Ordner wie diese Seite.',
    configProblems: (n) => `Dieser Fragebogen hat ${n} Konfigurationsproblem(e); manche Antworten führen möglicherweise nicht weiter.`,
    theme: { auto: 'Automatisch', light: 'Hell', dark: 'Dunkel', label: 'Design' },
  },
};
