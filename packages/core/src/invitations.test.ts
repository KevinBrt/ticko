import { describe, expect, it } from 'vitest';
import { invitationExpiry, isInvitationExpired } from './invitations.ts';

describe('invitations', () => {
  const sent = new Date('2026-10-21T10:00:00.000Z');

  it('stay valid for a week', () => {
    expect(invitationExpiry(sent).toISOString()).toBe('2026-10-28T10:00:00.000Z');
  });

  it('expire at the last millisecond of that week', () => {
    const expiresAt = invitationExpiry(sent);

    expect(isInvitationExpired(expiresAt, new Date('2026-10-28T09:59:59.999Z'))).toBe(false);
    expect(isInvitationExpired(expiresAt, expiresAt)).toBe(true);
  });
});
