/** Tells, chunk by chunk, whether a file is text. */
export interface TextScan {
  /** Reads the next bytes of the file. */
  push(chunk: Uint8Array): void;
  /** Whether everything read is text. */
  end(): boolean;
}

const UTF16_BYTE_ORDER_MARKS = [
  [0xff, 0xfe],
  [0xfe, 0xff],
] as const;

/**
 * Reads a file as it arrives to tell whether it is text: no NUL byte, which binary formats are
 * full of; or, after a UTF-16 byte order mark (Windows tools write logs so), no NUL character
 * and whole characters. Any 8-bit encoding passes, so that a CSV saved by Excel in Windows-1252
 * is text too: only the extension then tells a CSV from plain text.
 */
export function createTextScan(): TextScan {
  let start: Uint8Array = new Uint8Array(0);
  let encoding: 'pending' | '8-bit' | 'utf-16' = 'pending';
  let text = true;
  let utf16Length = 0;
  let unitFirstByte = 0;

  function scanUtf16(chunk: Uint8Array): void {
    for (const byte of chunk) {
      if (utf16Length % 2 === 0) {
        unitFirstByte = byte;
      } else if (unitFirstByte === 0 && byte === 0) {
        text = false;
      }
      utf16Length += 1;
    }
  }

  function scan(chunk: Uint8Array): void {
    if (encoding === 'utf-16') {
      scanUtf16(chunk);
    } else if (chunk.includes(0)) {
      text = false;
    }
  }

  return {
    push(chunk) {
      if (!text) {
        return;
      }
      if (encoding !== 'pending') {
        scan(chunk);
        return;
      }
      // The first two bytes say whether a byte order mark starts the file.
      start = start.length === 0 ? chunk : new Uint8Array([...start, ...chunk]);
      if (start.length < 2) {
        return;
      }
      encoding = UTF16_BYTE_ORDER_MARKS.some(([first, second]) => {
        return start[0] === first && start[1] === second;
      })
        ? 'utf-16'
        : '8-bit';
      scan(start);
      start = new Uint8Array(0);
    },
    end() {
      if (encoding === 'pending') {
        scan(start);
      }
      return text && (encoding !== 'utf-16' || utf16Length % 2 === 0);
    },
  };
}
