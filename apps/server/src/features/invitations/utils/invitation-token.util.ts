import { createHash, randomBytes } from 'node:crypto';

/** 256 random bits, base64url: impossible to guess, and safe in a URL. */
export function newInvitationToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * What the database keeps instead of the token. A fast hash is enough: the token is random,
 * not a password someone could guess.
 */
export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** The link to pass on. After `#`, the token never reaches a server log or a Referer header. */
export function invitationLink(publicUrl: URL, token: string): string {
  const link = new URL('/invitation', publicUrl);
  link.hash = token;
  return link.toString();
}
