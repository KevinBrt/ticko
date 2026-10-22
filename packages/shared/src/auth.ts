import { z } from 'zod';

/** Long passphrases beat complex short passwords; no composition rules (NIST SP 800-63B). */
export const PASSWORD_MIN_LENGTH = 12;
/** Bounds hashing cost and blocks oversized payloads. */
export const PASSWORD_MAX_LENGTH = 128;

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);

export const displayNameSchema = z.string().trim().min(1).max(100);

export const currentUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  /**
   * Instance permissions, by catalog name (`@toppo/core`), so the web app can hide what the user
   * cannot do. Plain strings on the wire: the server stays the only judge.
   */
  permissions: z.array(z.string()),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;

/** Body of `GET /api/v1/me`: `user` is `null` when nobody is signed in. */
export const meResponseSchema = z.object({
  user: currentUserSchema.nullable(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

/** Body of `PATCH /api/v1/me`: what one changes of one's own account. */
export const updateAccountRequestSchema = z.object({
  name: displayNameSchema,
});

export type UpdateAccountRequest = z.infer<typeof updateAccountRequestSchema>;

/** Body of `POST /api/auth/change-password`. Every other device is signed out, always. */
export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  newPassword: passwordSchema,
});

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
