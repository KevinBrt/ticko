import { describe, expect, it } from 'vitest';
import { contentDisposition } from './content-disposition.ts';

describe('contentDisposition', () => {
  it('names a plain file the same both ways', () => {
    expect(contentDisposition('attachment', 'export-commandes.csv')).toBe(
      `attachment; filename="export-commandes.csv"; filename*=UTF-8''export-commandes.csv`,
    );
  });

  it('encodes every other character in full, and replaces it in the plain fallback', () => {
    expect(contentDisposition('inline', 'capture d’écran (1).png')).toBe(
      `inline; filename="capture d__cran (1).png"; filename*=UTF-8''capture%20d%E2%80%99%C3%A9cran%20%281%29.png`,
    );
  });

  it('never lets a name end the quoted value or add a parameter', () => {
    const header = contentDisposition('attachment', 'a"; filename="evil.html\\%2e.pdf');

    expect(header).toBe(
      `attachment; filename="a_; filename=_evil.html__2e.pdf"; filename*=UTF-8''a%22%3B%20filename%3D%22evil.html%5C%252e.pdf`,
    );
    expect(header.match(/"/g)).toHaveLength(2);
  });
});
