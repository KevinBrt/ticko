import { acceptInvitationRequestSchema } from '@toppo/shared';
import type { z } from 'zod';

/** What the invited person types; the token comes from the link. */
export const acceptInvitationFormSchema = acceptInvitationRequestSchema.omit({ token: true });

export type AcceptInvitationFormValues = z.input<typeof acceptInvitationFormSchema>;

export const EMPTY_ACCEPT_INVITATION_FORM: AcceptInvitationFormValues = { name: '', password: '' };
