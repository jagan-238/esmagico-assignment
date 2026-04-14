import { describe, it, expect } from '@jest/globals';
import { validateTaskVersion } from '../src/services/optimisticLock.js';

describe('validateTaskVersion', () => {
  it('throws 400 when version missing', () => {
    expect(() => validateTaskVersion(undefined, 1)).toThrow(/versionNumber is required/);
    try {
      validateTaskVersion(undefined, 1);
    } catch (e) {
      expect(e.status).toBe(400);
    }
  });

  it('throws 409 when stale', () => {
    try {
      validateTaskVersion(1, 2);
      expect(true).toBe(false);
    } catch (e) {
      expect(e.status).toBe(409);
    }
  });

  it('passes when versions match', () => {
    expect(() => validateTaskVersion(3, 3)).not.toThrow();
  });
});
