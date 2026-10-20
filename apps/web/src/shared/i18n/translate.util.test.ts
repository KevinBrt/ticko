import { describe, expect, it } from 'vitest';
import { en } from './en.messages.ts';
import { fr } from './fr.messages.ts';
import type { PlainMessageKey, Translate } from './i18n.types.ts';
import { createTranslator, detectLocale } from './translate.util.ts';

function keysOf(tree: object, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : keysOf(value, `${prefix}${key}.`),
  );
}

function placeholdersOf(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();
}

describe('createTranslator', () => {
  it('translates a key', () => {
    expect(createTranslator('en')('nav.issues')).toBe('Issues');
    expect(createTranslator('fr')('nav.issues')).toBe('Tickets');
  });

  it('interpolates parameters', () => {
    expect(createTranslator('en')('app.pageTitle', { page: 'Issues' })).toBe('Issues · Ticko');
  });

  it('throws on a missing parameter instead of showing a raw placeholder', () => {
    const t = createTranslator('en') as unknown as (key: string, params?: object) => string;
    expect(() => t('app.pageTitle', {})).toThrow('Missing parameter "page"');
  });

  it('throws on an unknown key', () => {
    const t = createTranslator('en') as Translate;
    expect(() => t('nav.nope' as PlainMessageKey)).toThrow('Unknown message key "nav.nope"');
    expect(() => t('nav' as PlainMessageKey)).toThrow('Unknown message key "nav"');
  });
});

describe('catalogs', () => {
  function messageAt(tree: object, key: string): string {
    const value = key
      .split('.')
      .reduce<unknown>((node, segment) => Reflect.get(Object(node), segment), tree);
    return String(value);
  }

  it('French defines exactly the English keys', () => {
    expect(keysOf(fr).sort()).toStrictEqual(keysOf(en).sort());
  });

  it.each(keysOf(en))('%s uses the same placeholders in every locale', (key) => {
    expect(placeholdersOf(messageAt(fr, key))).toStrictEqual(placeholdersOf(messageAt(en, key)));
  });

  it('has no empty message', () => {
    for (const key of keysOf(en)) {
      expect(messageAt(en, key).trim(), key).not.toBe('');
      expect(messageAt(fr, key).trim(), key).not.toBe('');
    }
  });
});

describe('detectLocale', () => {
  it.each([
    [['fr-FR', 'en-US'], 'fr'],
    [['FR'], 'fr'],
    [['de-DE', 'fr-CA'], 'fr'],
    [['en-GB'], 'en'],
    [['de-DE', 'es'], 'en'],
    [[], 'en'],
  ] as const)('%j → %s', (preferred, expected) => {
    expect(detectLocale(preferred)).toBe(expected);
  });
});
