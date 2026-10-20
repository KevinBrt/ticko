import type { en } from './en.messages.ts';

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

/** Shape every locale must implement: same keys as English, any wording. Missing keys fail typecheck. */
export type Messages = Widen<typeof en>;

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Dotted path of a message, e.g. `nav.issues`. */
export type MessageKey = Leaves<typeof en>;

type MessageAt<T, Key extends string> = Key extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? MessageAt<T[Head], Rest>
    : never
  : Key extends keyof T
    ? T[Key]
    : never;

type PlaceholderNames<Message> = Message extends `${string}{${infer Name}}${infer Rest}`
  ? Name | PlaceholderNames<Rest>
  : never;

/** Keys of messages without placeholders: safe to store in data, e.g. navigation labels. */
export type PlainMessageKey = {
  [Key in MessageKey]: [PlaceholderNames<MessageAt<typeof en, Key>>] extends [never] ? Key : never;
}[MessageKey];

type ParamsArgs<Key extends MessageKey> = [PlaceholderNames<MessageAt<typeof en, Key>>] extends [
  never,
]
  ? []
  : [params: Record<PlaceholderNames<MessageAt<typeof en, Key>>, string | number>];

/** `t('nav.issues')`, or `t('app.pageTitle', { page })` when the message has placeholders. */
export type Translate = <Key extends MessageKey>(key: Key, ...params: ParamsArgs<Key>) => string;
