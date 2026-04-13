import { describe, it, expect } from 'vitest';
import { getInstitutionBranding } from './branding';

describe('getInstitutionBranding', () => {
  it('returns GANSID branding for gansid slug', () => {
    const b = getInstitutionBranding('gansid');
    expect(b.acronym).toBe('GANSID');
    expect(b.name).toBe('GANSID');
    expect(b.fullName).toContain('Global Action Network');
  });

  it('returns SCAGO branding for scago slug', () => {
    const b = getInstitutionBranding('scago');
    expect(b.acronym).toBe('SCAGO');
    expect(b.name).toBe('SCAGO');
    expect(b.fullName).toContain('Sickle Cell Awareness');
  });

  it('defaults to GANSID for unknown slug', () => {
    const b = getInstitutionBranding('unknown');
    expect(b.acronym).toBe('GANSID');
    expect(b.fullName).toContain('Global Action Network');
  });

  it('defaults to GANSID for null slug', () => {
    const b = getInstitutionBranding(null);
    expect(b.acronym).toBe('GANSID');
  });

  it('defaults to GANSID for undefined slug', () => {
    const b = getInstitutionBranding(undefined);
    expect(b.acronym).toBe('GANSID');
  });

  it('is case insensitive', () => {
    const b = getInstitutionBranding('SCAGO');
    expect(b.acronym).toBe('SCAGO');
  });

  it('returns correct brand colors for gansid', () => {
    const b = getInstitutionBranding('gansid');
    expect(b.primaryColor).toBe('#1A3C6E');
    expect(b.secondaryColor).toBe('#DC2626');
  });

  it('returns correct brand colors for scago', () => {
    const b = getInstitutionBranding('scago');
    expect(b.primaryColor).toBe('#C8262A');
    expect(b.secondaryColor).toBe('#1A1A1A');
  });

  it('includes expected structural fields', () => {
    const b = getInstitutionBranding('gansid');
    expect(b).toHaveProperty('logoUrl');
    expect(b).toHaveProperty('logoDimensions');
    expect(b).toHaveProperty('programTitle');
    expect(b).toHaveProperty('description');
    expect(b).toHaveProperty('highlights');
    expect(b).toHaveProperty('features');
    expect(b).toHaveProperty('contactEmail');
    expect(b).toHaveProperty('copyright');
    expect(b).toHaveProperty('emailPlaceholder');
    expect(b).toHaveProperty('adminEmailPlaceholder');
    expect(b).toHaveProperty('adminDescription');
  });

  it('returns non-empty highlights for both institutions', () => {
    expect(getInstitutionBranding('gansid').highlights.length).toBeGreaterThan(0);
    expect(getInstitutionBranding('scago').highlights.length).toBeGreaterThan(0);
  });

  it('returns non-empty features for both institutions', () => {
    expect(getInstitutionBranding('gansid').features.length).toBeGreaterThan(0);
    expect(getInstitutionBranding('scago').features.length).toBeGreaterThan(0);
  });
});
