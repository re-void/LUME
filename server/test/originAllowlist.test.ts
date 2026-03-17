import { describe, expect, it } from 'vitest';
import { buildOriginAllowlist, isOriginAllowed } from '../src/utils/originAllowlist';

describe('origin allowlist', () => {
  it('normalizes origins and hosts', () => {
    const allowlist = buildOriginAllowlist('https://lume.app,app.lume.app');
    expect(allowlist.allowedOrigins.has('https://lume.app')).toBe(true);
    expect(allowlist.allowedHosts.has('app.lume.app')).toBe(true);
  });

  it('blocks disallowed origins', () => {
    const allowlist = buildOriginAllowlist('https://lume.app');
    expect(isOriginAllowed('https://evil.com', allowlist)).toBe(false);
  });

  it('allows subdomains when host matches', () => {
    const allowlist = buildOriginAllowlist('lume.app');
    expect(isOriginAllowed('https://sub.lume.app', allowlist)).toBe(false);
  });
});
