import type { SessionUser } from './state/session-store';

export function toSessionUser(user: {
  id: string;
  username: string;
  display_name: string | null;
  email?: string;
  avatar_url: string | null;
  bio: string | null;
}): SessionUser {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    email: user.email,
    avatar_url: user.avatar_url,
    bio: user.bio,
  };
}

export function getErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'reason' in error) {
    return String((error as { reason: unknown }).reason);
  }
  return fallback;
}

export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  const timestamp = Date.now().toString(16);
  const random = Math.random().toString(16).slice(2, 14);
  return `${timestamp}-${random}`;
}

export function asTextContent(content: unknown): string {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === 'string') {
          return block;
        }

        if (
          typeof block === 'object' &&
          block !== null &&
          typeof (block as { text?: unknown }).text === 'string'
        ) {
          return (block as { text: string }).text;
        }

        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  if (typeof content === 'object' && content !== null) {
    const text = (content as { text?: unknown }).text;
    return typeof text === 'string' ? text : '';
  }

  return '';
}

export function toIsoLocal(dateIso?: string | null): string {
  if (!dateIso) {
    return '';
  }

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString();
}
