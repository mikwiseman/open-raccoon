export type ApiErrorPayload = {
  error?:
    | string
    | {
        code?: string;
        message?: string;
        details?: unknown;
      };
  message?: string;
  code?: string;
  details?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, options: { status: number; code?: string; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function parseApiError(status: number, payload: unknown): ApiError {
  if (!isRecord(payload)) {
    return new ApiError(`Request failed with status ${status}`, { status, details: payload });
  }

  const typedPayload = payload as ApiErrorPayload;
  const nestedError = isRecord(typedPayload.error)
    ? (typedPayload.error as { code?: unknown; message?: unknown; details?: unknown })
    : null;

  const message =
    toNonEmptyString(typedPayload.message) ??
    toNonEmptyString(typedPayload.error) ??
    toNonEmptyString(nestedError?.message) ??
    `Request failed with status ${status}`;

  const code =
    toNonEmptyString(typedPayload.code) ?? toNonEmptyString(nestedError?.code) ?? undefined;
  const details = typedPayload.details ?? nestedError?.details;

  return new ApiError(message, {
    status,
    code,
    details,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
