/**
 * A text file's words, whatever tool wrote it: UTF-16 when a byte order mark says so, UTF-8
 * when every byte reads as such, else Windows-1252, as Excel saves a CSV in Western Europe.
 */
export function decodeText(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  if (view[0] === 0xff && view[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(view);
  }
  if (view[0] === 0xfe && view[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(view);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(view);
  } catch {
    // Not UTF-8: the one 8-bit encoding a file's bytes always read in.
    return new TextDecoder('windows-1252').decode(view);
  }
}
