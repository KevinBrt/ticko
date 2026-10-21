const DAY_MS = 24 * 60 * 60 * 1000;

/** How long an invitation link stays valid. */
export const INVITATION_LIFETIME_DAYS = 7;

export function invitationExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + INVITATION_LIFETIME_DAYS * DAY_MS);
}

/** Whether an invitation can no longer be accepted; the administrator can renew it. */
export function isInvitationExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}
