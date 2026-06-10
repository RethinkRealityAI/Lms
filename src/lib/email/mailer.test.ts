import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveEmailFrom } from './mailer';

describe('resolveEmailFrom', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.SMTP_FROM;
    delete process.env.SMTP_FROM_GANSID;
    delete process.env.SMTP_FROM_SCAGO;
    delete process.env.SMTP_USER;
  });

  afterEach(() => {
    process.env = env;
  });

  it('uses per-tenant env override when set', () => {
    process.env.SMTP_FROM_SCAGO = 'SCAGO Learning <hcp@sicklecellanemia.ca>';
    expect(resolveEmailFrom('scago')).toBe('SCAGO Learning <hcp@sicklecellanemia.ca>');
  });

  it('falls back to generic SMTP_FROM', () => {
    process.env.SMTP_FROM = 'E-Learning Admin <no-reply@example.com>';
    expect(resolveEmailFrom('gansid')).toBe('E-Learning Admin <no-reply@example.com>');
  });

  it('uses branding default when no env vars are set', () => {
    expect(resolveEmailFrom('gansid')).toBe(
      'GANSID Learning <admin@inheritedblooddisorders.world>',
    );
    expect(resolveEmailFrom('scago')).toBe('SCAGO Learning <hcp@sicklecellanemia.ca>');
  });

  it('prefers per-tenant override over generic SMTP_FROM', () => {
    process.env.SMTP_FROM = 'E-Learning Admin <no-reply@example.com>';
    process.env.SMTP_FROM_GANSID = 'GANSID Learning <no-reply@inheritedblooddisorders.world>';
    expect(resolveEmailFrom('gansid')).toBe('GANSID Learning <no-reply@inheritedblooddisorders.world>');
  });
});
