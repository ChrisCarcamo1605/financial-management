import type { Session } from '../types';

/** Error de la API con el mensaje legible que devuelve el backend ({ error }). */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  /** Estados no-2xx que se devuelven como datos en lugar de lanzar. */
  acceptStatus?: number[];
}

const AUTH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

function toQueryString(query?: Query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(body: unknown, status: number) {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error;
  if (status === 0) return 'No se pudo conectar con el servidor';
  return `Error ${status}`;
}

/**
 * Cliente HTTP mínimo sobre fetch. El access token vive solo en memoria; el
 * refresh token es una cookie httponly que el navegador envía a /api/auth/*.
 * Ante un 401 se refresca una sola vez (single-flight) y se reintenta.
 */
export function createHttpClient(baseUrl: string) {
  let accessToken: string | null = null;
  let refreshing: Promise<Session | null> | null = null;
  const expiredListeners = new Set<() => void>();

  async function send(method: string, path: string, options: RequestOptions, retry: boolean): Promise<unknown> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}${toQueryString(options.query)}`, {
        method,
        headers,
        credentials: 'include',
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      throw new ApiError(0, errorMessage(null, 0));
    }

    if (response.status === 401 && retry && !AUTH_PATHS.includes(path)) {
      const session = await refresh();
      if (session) return send(method, path, options, false);
      expiredListeners.forEach((listener) => listener());
    }

    const body = await readBody(response);
    if (response.ok || options.acceptStatus?.includes(response.status)) return body;
    throw new ApiError(response.status, errorMessage(body, response.status), body);
  }

  function refresh(): Promise<Session | null> {
    refreshing ??= send('POST', '/api/auth/refresh', {}, false)
      .then((session) => {
        accessToken = (session as Session).access_token;
        return session as Session;
      })
      .catch(() => {
        accessToken = null;
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
    return refreshing;
  }

  const request = <T>(method: string, path: string, options: RequestOptions = {}) =>
    send(method, path, options, true) as Promise<T>;

  return {
    get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
    post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) =>
      request<T>('POST', path, { ...options, body: body ?? {} }),
    put: <T>(path: string, body: unknown) => request<T>('PUT', path, { body }),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, { body }),
    delete: <T = void>(path: string) => request<T>('DELETE', path),
    refresh,
    setAccessToken(token: string | null) {
      accessToken = token;
    },
    onExpired(listener: () => void) {
      expiredListeners.add(listener);
      return () => {
        expiredListeners.delete(listener);
      };
    },
  };
}

export type HttpClient = ReturnType<typeof createHttpClient>;
