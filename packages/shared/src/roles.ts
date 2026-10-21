/**
 * Who a role is for: `internal` members who handle issues, or `client`s (customers, other
 * departments) who report them. A client role never administers anything nor reads internal notes.
 */
export const ROLE_AUDIENCES = ['internal', 'client'] as const;

export type RoleAudience = (typeof ROLE_AUDIENCES)[number];

/** Colors of role badges, from the design tokens' status palette. */
export const ROLE_COLORS = ['gray', 'blue', 'green', 'amber', 'violet', 'cyan'] as const;

export type RoleColor = (typeof ROLE_COLORS)[number];
