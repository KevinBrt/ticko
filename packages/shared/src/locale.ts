import { z } from 'zod';

/** Languages of the interface. English is the source language and the fallback. */
export const SUPPORTED_LOCALES = ['en', 'fr'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const localeSchema = z.enum(SUPPORTED_LOCALES);
