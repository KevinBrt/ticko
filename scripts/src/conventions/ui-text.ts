import { parse } from '@babel/parser';

/** Attributes read aloud or displayed to users. Their literal values must be translated. */
const TEXT_ATTRIBUTES = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'label',
  'placeholder',
  'title',
]);

const HAS_LETTER = /\p{L}/u;

interface Node {
  type: string;
  loc?: { start: { line: number } } | null;
  [key: string]: unknown;
}

function isNode(value: unknown): value is Node {
  return (
    typeof value === 'object' && value !== null && typeof Reflect.get(value, 'type') === 'string'
  );
}

/** Returns the line of every JSX text or text attribute written as a literal instead of `t()`. */
export function findHardcodedUiText(source: string): number[] {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  const lines: number[] = [];

  const visit = (node: Node): void => {
    if (isHardcodedText(node) && node.loc) {
      lines.push(node.loc.start.line + leadingLineBreaks(node));
    }
    for (const child of childrenOf(node)) {
      visit(child);
    }
  };

  visit(ast.program as unknown as Node);
  return lines;
}

const POSITION_KEYS = new Set(['loc', 'start', 'end']);

function childrenOf(node: Node): Node[] {
  return Object.entries(node)
    .filter(([key]) => !POSITION_KEYS.has(key))
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
    .filter(isNode);
}

/** JSX text often starts with the line break after the opening tag; point at the words instead. */
function leadingLineBreaks(node: Node): number {
  if (node.type !== 'JSXText') {
    return 0;
  }
  const text = String(node['value']);
  const firstLetter = text.search(HAS_LETTER);
  return text.slice(0, firstLetter).split('\n').length - 1;
}

function isHardcodedText(node: Node): boolean {
  if (node.type === 'JSXText') {
    return HAS_LETTER.test(String(node['value']));
  }
  if (node.type !== 'JSXAttribute') {
    return false;
  }
  const name = node['name'];
  const value = node['value'];
  const attribute = isNode(name) ? String(name['name']) : '';
  return (
    TEXT_ATTRIBUTES.has(attribute) &&
    isNode(value) &&
    value.type === 'StringLiteral' &&
    HAS_LETTER.test(String(value['value']))
  );
}
