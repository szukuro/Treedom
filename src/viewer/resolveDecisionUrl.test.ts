import { describe, expect, it } from 'vitest';
import { resolveDecisionUrl } from './resolveDecisionUrl';

describe('resolveDecisionUrl', () => {
  it.each([
    ['https://example.com/decision/index.html', 'https://example.com/decision/decision.json'],
    ['https://example.com/decision/', 'https://example.com/decision/decision.json'],
    ['https://example.com/decision', 'https://example.com/decision/decision.json'],
    ['https://example.com/decision/index.html?x=1#top', 'https://example.com/decision/decision.json'],
    ['https://example.com/', 'https://example.com/decision.json'],
    ['https://example.com/a/b/c/page.htm', 'https://example.com/a/b/c/decision.json'],
    ['file:///home/me/site/viewer/index.html', 'file:///home/me/site/viewer/decision.json'],
  ])('%s → %s', (page, expected) => {
    expect(resolveDecisionUrl(page)).toBe(expected);
  });
  it('accepts a custom file name', () => {
    expect(resolveDecisionUrl('https://example.com/x/', 'other.json')).toBe('https://example.com/x/other.json');
  });
});
