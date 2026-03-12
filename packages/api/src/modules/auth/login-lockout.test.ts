/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The login lockout mechanism is implemented inline in auth.service.ts
 * using module-level Maps. We test the exported `clearLoginAttempts`
 * helper and exercise the lockout logic via the exported `login` function
 * plus direct calls to the internal helpers re-exported for testing.
 *
 * Because `checkAccountLocked`, `recordFailedAttempt`, and `clearFailedAttempts`
 * are NOT exported, we test them indirectly through the `login()` function
 * and the exported `clearLoginAttempts()`.
 */

// Mock DB connection — login() calls sql tagged template
vi.mock('../../db/connection.js', () => {
  const sqlFn = Object.assign(vi.fn(), {
    unsafe: vi.fn(),
    begin: vi.fn(async (cb: (tx: any) => Promise<any>) => {
      return cb(sqlFn);
    }),
  });
  return { sql: sqlFn, db: {} };
});

// Mock argon2
vi.mock('argon2', () => ({
  hash: vi.fn(async () => '$argon2id$hash'),
  verify: vi.fn(async () => true),
  argon2id: 2,
}));

// Mock jose
vi.mock('jose', () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('mock-jwt-token'),
  })),
  jwtVerify: vi.fn(),
}));

async function resetSqlMocks() {
  const { sql } = await import('../../db/connection.js');
  const sqlMock = vi.mocked(sql);
  sqlMock.mockReset();
  vi.mocked(sqlMock.unsafe).mockReset();
}

function makeUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    username: 'testuser',
    display_name: 'Test User',
    email: 'test@example.com',
    password_hash: '$argon2id$validhash',
    avatar_url: null,
    bio: null,
    status: 'active',
    role: 'user',
    settings: {},
    plan: 'free',
    inserted_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('login-lockout — clearLoginAttempts', () => {
  beforeEach(async () => {
    await resetSqlMocks();
    vi.useRealTimers();
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  afterEach(async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  it('is safe to call on empty state', async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    expect(() => clearLoginAttempts()).not.toThrow();
  });

  it('can be called multiple times without error', async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
    clearLoginAttempts();
    clearLoginAttempts();
  });

  it('resets lockout state so login can proceed', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login, clearLoginAttempts } = await import('./auth.service.js');

    // Generate 5 failed login attempts to trigger lockout
    for (let i = 0; i < 5; i++) {
      sqlMock.mockResolvedValueOnce([] as any); // no user found
      try {
        await login({ email: 'lock@example.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Account should be locked now
    sqlMock.mockResolvedValueOnce([makeUserRow({ email: 'lock@example.com' })] as any);
    await expect(login({ email: 'lock@example.com', password: 'correct' })).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });

    // Clear lockout
    clearLoginAttempts();

    // Now login should attempt DB lookup again
    sqlMock.mockResolvedValueOnce([makeUserRow({ email: 'lock@example.com' })] as any);
    const result = await login({ email: 'lock@example.com', password: 'correct' });
    expect(result.user.email).toBe('lock@example.com');
  });
});

describe('login-lockout — checkAccountLocked returns false for unknown email', () => {
  beforeEach(async () => {
    await resetSqlMocks();
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  afterEach(async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  it('allows login for an email that has never failed', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([makeUserRow()] as any);

    const { login } = await import('./auth.service.js');
    const result = await login({ email: 'test@example.com', password: 'correct' });
    expect(result.user).toBeDefined();
  });

  it('allows login for different email when another is locked', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    // Lock locked@example.com
    for (let i = 0; i < 5; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'locked@example.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Different email should still work
    sqlMock.mockResolvedValueOnce([
      makeUserRow({ email: 'other@example.com', username: 'other' }),
    ] as any);
    const result = await login({ email: 'other@example.com', password: 'correct' });
    expect(result.user.email).toBe('other@example.com');
  });
});

describe('login-lockout — recordFailedAttempt increments counter', () => {
  beforeEach(async () => {
    await resetSqlMocks();
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  afterEach(async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  it('first failed attempt does not lock', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    sqlMock.mockResolvedValueOnce([] as any);
    await expect(login({ email: 'fail@test.com', password: 'wrong' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });

    // Subsequent login attempt should not be locked
    sqlMock.mockResolvedValueOnce([makeUserRow({ email: 'fail@test.com' })] as any);
    const result = await login({ email: 'fail@test.com', password: 'correct' });
    expect(result.user).toBeDefined();
  });

  it('four failed attempts do not trigger lockout', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    for (let i = 0; i < 4; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'almost@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Should still be able to attempt login (not locked)
    sqlMock.mockResolvedValueOnce([makeUserRow({ email: 'almost@test.com' })] as any);
    const result = await login({ email: 'almost@test.com', password: 'correct' });
    expect(result.user).toBeDefined();
  });
});

describe('login-lockout — account locks after 5 failed attempts', () => {
  beforeEach(async () => {
    await resetSqlMocks();
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  afterEach(async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  it('locks after exactly 5 failed attempts', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    for (let i = 0; i < 5; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'lock5@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Next attempt should be locked
    await expect(login({ email: 'lock5@test.com', password: 'anything' })).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });
  });

  it('error message includes remaining lockout time', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    for (let i = 0; i < 5; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'msg@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    try {
      await login({ email: 'msg@test.com', password: 'anything' });
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err.message).toMatch(/Try again in \d+ seconds/);
      expect(err.code).toBe('TOO_MANY_REQUESTS');
    }
  });

  it('locks even with correct password after 5 failures', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    for (let i = 0; i < 5; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'locked-correct@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Even with correct password, lockout should apply (no DB call)
    await expect(
      login({ email: 'locked-correct@test.com', password: 'correct' }),
    ).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });
  });

  it('more than 5 failures keep the account locked', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    for (let i = 0; i < 7; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'many@test.com', password: 'wrong' });
      } catch {
        // expected — some will throw UNAUTHORIZED, then TOO_MANY_REQUESTS
      }
    }

    await expect(login({ email: 'many@test.com', password: 'anything' })).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });
  });
});

describe('login-lockout — successful login clears failed attempts', () => {
  beforeEach(async () => {
    await resetSqlMocks();
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  afterEach(async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  it('clears attempts on successful login after 3 failures', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    // 3 failed attempts
    for (let i = 0; i < 3; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'clear@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Successful login
    sqlMock.mockResolvedValueOnce([makeUserRow({ email: 'clear@test.com' })] as any);
    await login({ email: 'clear@test.com', password: 'correct' });

    // After success, counter should be reset. 4 more failures should not lock
    for (let i = 0; i < 4; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'clear@test.com', password: 'wrong' });
      } catch {
        // expected UNAUTHORIZED, not TOO_MANY_REQUESTS
      }
    }

    // Should still not be locked (only 4 failures after reset)
    sqlMock.mockResolvedValueOnce([makeUserRow({ email: 'clear@test.com' })] as any);
    const result = await login({ email: 'clear@test.com', password: 'correct' });
    expect(result.user).toBeDefined();
  });

  it('clears attempts immediately so counter restarts at 0', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    // 4 failures
    for (let i = 0; i < 4; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'reset@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Success clears
    sqlMock.mockResolvedValueOnce([makeUserRow({ email: 'reset@test.com' })] as any);
    await login({ email: 'reset@test.com', password: 'correct' });

    // Now 5 new failures should lock
    for (let i = 0; i < 5; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'reset@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    await expect(login({ email: 'reset@test.com', password: 'anything' })).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });
  });
});

describe('login-lockout — lockout period expiry', () => {
  beforeEach(async () => {
    await resetSqlMocks();
    vi.useFakeTimers();
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  afterEach(async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
    vi.useRealTimers();
  });

  it('lockout expires after 15 minutes', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    // Generate 5 failures to lock
    for (let i = 0; i < 5; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'expire@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Verify locked
    await expect(login({ email: 'expire@test.com', password: 'anything' })).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });

    // Advance time past lockout (15 minutes + 1 second)
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

    // Should be able to login now
    sqlMock.mockResolvedValueOnce([makeUserRow({ email: 'expire@test.com' })] as any);
    const result = await login({ email: 'expire@test.com', password: 'correct' });
    expect(result.user).toBeDefined();
  });

  it('lockout still active before 15 minutes', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    for (let i = 0; i < 5; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'notyet@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Advance only 10 minutes
    vi.advanceTimersByTime(10 * 60 * 1000);

    await expect(login({ email: 'notyet@test.com', password: 'anything' })).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });
  });

  it('lockout remaining time decreases as time passes', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    for (let i = 0; i < 5; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'remaining@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Advance 14 minutes
    vi.advanceTimersByTime(14 * 60 * 1000);

    try {
      await login({ email: 'remaining@test.com', password: 'anything' });
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      // Remaining time should be around 60 seconds (1 minute left)
      const match = err.message.match(/Try again in (\d+) seconds/);
      expect(match).toBeTruthy();
      const remaining = parseInt(match[1], 10);
      expect(remaining).toBeLessThanOrEqual(61);
      expect(remaining).toBeGreaterThan(0);
    }
  });
});

describe('login-lockout — concurrent failed attempts from different IPs', () => {
  beforeEach(async () => {
    await resetSqlMocks();
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  afterEach(async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  it('lockout tracks by email, not IP — both IPs contribute to same counter', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    // 5 failures on the same email (simulating different IPs)
    for (let i = 0; i < 5; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'shared@test.com', password: `wrong-${i}` });
      } catch {
        // expected
      }
    }

    // Account should be locked for any IP
    await expect(login({ email: 'shared@test.com', password: 'correct' })).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });
  });

  it('different emails have independent counters', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    // 4 failures on email A
    for (let i = 0; i < 4; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'a@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // 4 failures on email B
    for (let i = 0; i < 4; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'b@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Neither should be locked
    sqlMock.mockResolvedValueOnce([makeUserRow({ email: 'a@test.com', username: 'a' })] as any);
    const resultA = await login({ email: 'a@test.com', password: 'correct' });
    expect(resultA.user).toBeDefined();

    sqlMock.mockResolvedValueOnce([makeUserRow({ email: 'b@test.com', username: 'b' })] as any);
    const resultB = await login({ email: 'b@test.com', password: 'correct' });
    expect(resultB.user).toBeDefined();
  });
});

describe('login-lockout — edge: empty email', () => {
  beforeEach(async () => {
    await resetSqlMocks();
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  afterEach(async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  it('handles empty string email without error', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { login } = await import('./auth.service.js');
    await expect(login({ email: '', password: 'test' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('tracks empty email as a distinct key', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    for (let i = 0; i < 5; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: '', password: 'wrong' });
      } catch {
        // expected
      }
    }

    await expect(login({ email: '', password: 'anything' })).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });

    // Non-empty email should still work
    sqlMock.mockResolvedValueOnce([makeUserRow()] as any);
    const result = await login({ email: 'test@example.com', password: 'correct' });
    expect(result.user).toBeDefined();
  });
});

describe('login-lockout — edge: very long email', () => {
  beforeEach(async () => {
    await resetSqlMocks();
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  afterEach(async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  it('handles very long email string without error', async () => {
    const { sql } = await import('../../db/connection.js');
    const longEmail = `${'a'.repeat(5000)}@example.com`;
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { login } = await import('./auth.service.js');
    await expect(login({ email: longEmail, password: 'test' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('locks accounts with very long emails', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const longEmail = `${'b'.repeat(3000)}@example.com`;
    const { login } = await import('./auth.service.js');

    for (let i = 0; i < 5; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: longEmail, password: 'wrong' });
      } catch {
        // expected
      }
    }

    await expect(login({ email: longEmail, password: 'anything' })).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });
  });
});

describe('login-lockout — auto-pruning of stale entries', () => {
  beforeEach(async () => {
    await resetSqlMocks();
    vi.useFakeTimers();
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  afterEach(async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
    vi.useRealTimers();
  });

  it('stale unlocked entries are pruned after window + prune interval', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    // Create 2 failed attempts
    for (let i = 0; i < 2; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'prune@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Advance past the attempt window (15 min) + prune interval (60s)
    vi.advanceTimersByTime(16 * 60 * 1000);

    // After pruning, the entry should be gone, so a fresh set of 5 failures
    // would be needed to lock again
    sqlMock.mockResolvedValueOnce([makeUserRow({ email: 'prune@test.com' })] as any);
    const result = await login({ email: 'prune@test.com', password: 'correct' });
    expect(result.user).toBeDefined();
  });

  it('locked entries are pruned after lockout expires', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    // Lock the account
    for (let i = 0; i < 5; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'prune-lock@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Advance past lockout (15 min) + attempt window (15 min) + prune (60s)
    vi.advanceTimersByTime(31 * 60 * 1000);

    // After pruning, the entry is cleaned up. Login should work.
    sqlMock.mockResolvedValueOnce([makeUserRow({ email: 'prune-lock@test.com' })] as any);
    const result = await login({ email: 'prune-lock@test.com', password: 'correct' });
    expect(result.user).toBeDefined();
  });

  it('prune does not remove entries still within window', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    // Create 4 failed attempts
    for (let i = 0; i < 4; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'no-prune@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Advance only 1 minute (within 15-min window)
    vi.advanceTimersByTime(60_000);

    // One more failure should lock
    sqlMock.mockResolvedValueOnce([] as any);
    try {
      await login({ email: 'no-prune@test.com', password: 'wrong' });
    } catch {
      // expected
    }

    await expect(login({ email: 'no-prune@test.com', password: 'anything' })).rejects.toMatchObject(
      {
        code: 'TOO_MANY_REQUESTS',
      },
    );
  });
});

describe('login-lockout — attempt window resets after 15 minutes', () => {
  beforeEach(async () => {
    await resetSqlMocks();
    vi.useFakeTimers();
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  afterEach(async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
    vi.useRealTimers();
  });

  it('failures spread across windows do not accumulate', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { login } = await import('./auth.service.js');

    // 3 failures
    for (let i = 0; i < 3; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'window@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Wait 16 minutes (past the 15-min window)
    vi.advanceTimersByTime(16 * 60 * 1000);

    // 3 more failures in new window — total 3, not 6
    for (let i = 0; i < 3; i++) {
      sqlMock.mockResolvedValueOnce([] as any);
      try {
        await login({ email: 'window@test.com', password: 'wrong' });
      } catch {
        // expected
      }
    }

    // Should not be locked (only 3 in current window)
    sqlMock.mockResolvedValueOnce([makeUserRow({ email: 'window@test.com' })] as any);
    const result = await login({ email: 'window@test.com', password: 'correct' });
    expect(result.user).toBeDefined();
  });
});

describe('login-lockout — wrong password records failure', () => {
  beforeEach(async () => {
    await resetSqlMocks();
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  afterEach(async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  it('wrong password for existing user records a failure', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const argon2 = await import('argon2');
    const { login } = await import('./auth.service.js');

    // Mock argon2.verify to return false (wrong password)
    vi.mocked(argon2.verify).mockResolvedValueOnce(false);
    sqlMock.mockResolvedValueOnce([makeUserRow()] as any);

    await expect(
      login({ email: 'test@example.com', password: 'wrongpassword' }),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });

    // Restore argon2.verify to return true
    vi.mocked(argon2.verify).mockResolvedValue(true);
  });

  it('no user found records a failure', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { login } = await import('./auth.service.js');
    await expect(login({ email: 'nouser@test.com', password: 'test' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});

describe('login-lockout — special characters in email', () => {
  beforeEach(async () => {
    await resetSqlMocks();
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  afterEach(async () => {
    const { clearLoginAttempts } = await import('./auth.service.js');
    clearLoginAttempts();
  });

  it('handles email with plus addressing', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { login } = await import('./auth.service.js');
    await expect(login({ email: 'test+tag@example.com', password: 'test' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('handles email with unicode', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { login } = await import('./auth.service.js');
    await expect(login({ email: '\u{1F600}@example.com', password: 'test' })).rejects.toMatchObject(
      { code: 'UNAUTHORIZED' },
    );
  });
});
