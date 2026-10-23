/** Characters RFC 5987 lets through unencoded besides letters and digits; `encodeURIComponent` keeps a few more. */
const NOT_ATTR_CHAR = /['()*]/g;

/**
 * The `Content-Disposition` of a file sent as `type`: its name in full, encoded, for every current
 * browser (RFC 6266), and in plain ASCII for the others, every character that could end or bend
 * the quoted value replaced.
 */
export function contentDisposition(type: 'attachment' | 'inline', fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]|["\\%]/g, '_');
  const encoded = encodeURIComponent(fileName).replace(
    NOT_ATTR_CHAR,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
