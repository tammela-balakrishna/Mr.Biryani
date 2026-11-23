import { API_BASE_URL } from '../config/env';

/** Error shape returned by the backend (`{ error: { code, message, requestId, details? } }`), or a local network error. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type SessionHandlers = {
  /** Exchanges the stored refresh token for a new access token. Returns null when the session is gone. */
  refresh: () => Promise<string | null>;
  /** Called when the session cannot be recovered; the app returns to the sign-in screen. */
  onSessionLost: () => void;
};

let accessToken: string | null = null;
let handlers: SessionHandlers | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

/** The current access token, for the realtime socket's connect header only. Never persisted. */
export const getAccessToken = (): string | null => accessToken;

export const setSessionHandlers = (next: SessionHandlers | null) => {
  handlers = next;
};

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Internal: set after one refresh attempt so a failing request cannot loop. */
  retried?: boolean;
};

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Typed request helper. Always sends `X-Client-Type: native` so the backend returns refresh tokens in the
 * JSON body (stored in secure storage) rather than as a browser cookie.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'X-Client-Type': 'native',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the restaurant. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  // One silent refresh and retry when the access token has expired. Auth endpoints never trigger it.
  if (response.status === 401 && !options.retried && accessToken && !path.startsWith('/api/v1/auth/') && handlers) {
    const fresh = await handlers.refresh();
    if (fresh) {
      accessToken = fresh;
      return request<T>(path, { ...options, retried: true });
    }
    handlers.onSessionLost();
  }

  const text = await response.text();
  const json = text ? safeJson(text) : null;

  if (!response.ok) {
    const error = (json as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? `HTTP_${response.status}`,
      error?.message ?? 'Something went wrong. Please try again.',
      error?.details,
    );
  }

  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** A fresh idempotency key per checkout attempt; retries of the same attempt must reuse it. */
export function newIdempotencyKey(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    try {
      return globalThis.crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
