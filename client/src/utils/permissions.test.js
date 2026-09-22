import { describe, it, expect } from 'vitest';
import { PERMISSIONS, ROLES, DEFAULT_ROLE_PERMISSIONS, getEffectivePermissions } from './permissions.js';
// Deliberately importing the server's own source of truth, not a hand-copied fixture — this file
// is explicitly commented "Keep these two files in sync by hand," so the whole point of this test
// is to catch drift automatically rather than rely on a second manually-maintained copy that could
// itself go stale the same way the two app files already can.
import {
  PERMISSIONS as SERVER_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS as SERVER_DEFAULT_ROLE_PERMISSIONS,
} from '../../../server/src/constants/permissions.js';

describe('client/server permission-matrix drift guard', () => {
  it('PERMISSIONS matches the server exactly', () => {
    expect(PERMISSIONS).toEqual(SERVER_PERMISSIONS);
  });

  it('DEFAULT_ROLE_PERMISSIONS matches the server exactly, role by role', () => {
    for (const role of Object.values(ROLES)) {
      expect([...DEFAULT_ROLE_PERMISSIONS[role]].sort()).toEqual([...SERVER_DEFAULT_ROLE_PERMISSIONS[role]].sort());
    }
  });
});

describe('getEffectivePermissions', () => {
  it('is additive-only: extra permissions never remove anything from the role default', () => {
    const effective = getEffectivePermissions(ROLES.EMPLOYEE, [PERMISSIONS.EVENT_UPDATE]);
    expect(effective.has(PERMISSIONS.EVENT_UPDATE)).toBe(true);
    expect(effective.has(PERMISSIONS.EVENT_READ)).toBe(true);
  });

  it('returns an empty set for an unknown role rather than throwing', () => {
    const effective = getEffectivePermissions('NOT_A_REAL_ROLE');
    expect(effective.size).toBe(0);
  });
});
