import { describe, expect, it } from 'vitest';
import {
  LoginSchema,
  MagicLinkSchema,
  MagicLinkVerifySchema,
  RefreshSchema,
  RegisterSchema,
  UpdateProfileSchema,
} from './auth.schema.js';

/* ================================================================
 * RegisterSchema
 * ================================================================ */
describe('RegisterSchema', () => {
  it('accepts a valid registration', () => {
    const data = { username: 'alex_dev', email: 'alex@example.com', password: 'securePass1' };
    expect(RegisterSchema.parse(data)).toEqual(data);
  });

  it('rejects username shorter than 3 characters', () => {
    const result = RegisterSchema.safeParse({
      username: 'ab',
      email: 'a@b.com',
      password: '12345678',
    });
    expect(result.success).toBe(false);
  });

  it('rejects username longer than 32 characters', () => {
    const result = RegisterSchema.safeParse({
      username: 'a'.repeat(33),
      email: 'a@b.com',
      password: '12345678',
    });
    expect(result.success).toBe(false);
  });

  it('rejects username with special characters', () => {
    const result = RegisterSchema.safeParse({
      username: 'alex-dev',
      email: 'a@b.com',
      password: '12345678',
    });
    expect(result.success).toBe(false);
  });

  it('rejects username with spaces', () => {
    const result = RegisterSchema.safeParse({
      username: 'alex dev',
      email: 'a@b.com',
      password: '12345678',
    });
    expect(result.success).toBe(false);
  });

  it('accepts username with underscores', () => {
    const data = { username: 'alex_dev_1', email: 'a@b.com', password: '12345678' };
    expect(RegisterSchema.parse(data).username).toBe('alex_dev_1');
  });

  it('accepts username at exactly 3 characters', () => {
    const data = { username: 'abc', email: 'a@b.com', password: '12345678' };
    expect(RegisterSchema.parse(data).username).toBe('abc');
  });

  it('accepts username at exactly 32 characters', () => {
    const data = { username: 'a'.repeat(32), email: 'a@b.com', password: '12345678' };
    expect(RegisterSchema.parse(data).username).toBe('a'.repeat(32));
  });

  it('rejects an invalid email address', () => {
    const result = RegisterSchema.safeParse({
      username: 'alex',
      email: 'not-email',
      password: '12345678',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = RegisterSchema.safeParse({
      username: 'alex',
      email: 'a@b.com',
      password: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password longer than 128 characters', () => {
    const result = RegisterSchema.safeParse({
      username: 'alex',
      email: 'a@b.com',
      password: 'x'.repeat(129),
    });
    expect(result.success).toBe(false);
  });

  it('accepts password at exactly 8 characters', () => {
    const data = { username: 'alex', email: 'a@b.com', password: '12345678' };
    expect(RegisterSchema.parse(data).password).toBe('12345678');
  });

  it('accepts password at exactly 128 characters', () => {
    const data = { username: 'alex', email: 'a@b.com', password: 'x'.repeat(128) };
    expect(RegisterSchema.parse(data).password).toBe('x'.repeat(128));
  });

  it('rejects missing username', () => {
    const result = RegisterSchema.safeParse({ email: 'a@b.com', password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = RegisterSchema.safeParse({ username: 'alex', password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = RegisterSchema.safeParse({ username: 'alex', email: 'a@b.com' });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * LoginSchema
 * ================================================================ */
describe('LoginSchema', () => {
  it('accepts a valid login', () => {
    const data = { email: 'alex@example.com', password: 'secret' };
    expect(LoginSchema.parse(data)).toEqual(data);
  });

  it('rejects invalid email', () => {
    const result = LoginSchema.safeParse({ email: 'invalid', password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = LoginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = LoginSchema.safeParse({ password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = LoginSchema.safeParse({ email: 'a@b.com' });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * RefreshSchema
 * ================================================================ */
describe('RefreshSchema', () => {
  it('accepts a valid refresh token', () => {
    const data = { refresh_token: 'abc123' };
    expect(RefreshSchema.parse(data)).toEqual(data);
  });

  it('rejects empty refresh token', () => {
    const result = RefreshSchema.safeParse({ refresh_token: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing refresh_token', () => {
    const result = RefreshSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * MagicLinkSchema
 * ================================================================ */
describe('MagicLinkSchema', () => {
  it('accepts a valid email', () => {
    expect(MagicLinkSchema.parse({ email: 'a@b.com' })).toEqual({ email: 'a@b.com' });
  });

  it('rejects invalid email', () => {
    const result = MagicLinkSchema.safeParse({ email: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = MagicLinkSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * MagicLinkVerifySchema
 * ================================================================ */
describe('MagicLinkVerifySchema', () => {
  it('accepts a valid token', () => {
    expect(MagicLinkVerifySchema.parse({ token: 'some-token' })).toEqual({ token: 'some-token' });
  });

  it('rejects empty token', () => {
    const result = MagicLinkVerifySchema.safeParse({ token: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing token', () => {
    const result = MagicLinkVerifySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * UpdateProfileSchema
 * ================================================================ */
describe('UpdateProfileSchema', () => {
  it('accepts a valid full update', () => {
    const data = {
      display_name: 'Alex Dev',
      bio: 'Building things',
      avatar_url: 'https://example.com/avatar.png',
      settings: { theme: 'dark' },
    };
    const result = UpdateProfileSchema.parse(data);
    expect(result.display_name).toBe('Alex Dev');
    expect(result.bio).toBe('Building things');
    expect(result.avatar_url).toBe('https://example.com/avatar.png');
    expect(result.settings).toEqual({ theme: 'dark' });
  });

  it('accepts an empty object (all fields optional)', () => {
    expect(UpdateProfileSchema.parse({})).toEqual({});
  });

  it('strips HTML tags from display_name', () => {
    const data = { display_name: '<script>alert("xss")</script>Alex' };
    const result = UpdateProfileSchema.parse(data);
    expect(result.display_name).toBe('alert("xss")Alex');
  });

  it('strips HTML tags from bio', () => {
    const data = { bio: '<b>Bold</b> text with <a href="#">link</a>' };
    const result = UpdateProfileSchema.parse(data);
    expect(result.bio).toBe('Bold text with link');
  });

  it('rejects display_name longer than 128 characters', () => {
    const result = UpdateProfileSchema.safeParse({ display_name: 'a'.repeat(129) });
    expect(result.success).toBe(false);
  });

  it('rejects bio longer than 2000 characters', () => {
    const result = UpdateProfileSchema.safeParse({ bio: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('accepts an empty string for avatar_url', () => {
    const result = UpdateProfileSchema.parse({ avatar_url: '' });
    expect(result.avatar_url).toBe('');
  });

  it('accepts a valid URL for avatar_url', () => {
    const result = UpdateProfileSchema.parse({ avatar_url: 'https://cdn.example.com/img.png' });
    expect(result.avatar_url).toBe('https://cdn.example.com/img.png');
  });

  it('rejects an invalid URL for avatar_url', () => {
    const result = UpdateProfileSchema.safeParse({ avatar_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('accepts arbitrary settings record', () => {
    const data = { settings: { theme: 'dark', language: 'en', nested: { key: 123 } } };
    const result = UpdateProfileSchema.parse(data);
    expect(result.settings).toEqual(data.settings);
  });
});
