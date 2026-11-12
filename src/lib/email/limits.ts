/** Client-safe email limits (bulk-send.ts imports nodemailer and is server-only). */

/** Plain email addresses (no account) per admin send — for follow-ups, not mailing lists. */
export const MAX_EXTERNAL_RECIPIENTS = 50;
