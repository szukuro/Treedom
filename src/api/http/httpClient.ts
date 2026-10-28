/** Minimal JSON-over-HTTP helper shared by the HTTP implementations. */
export interface HttpClientOptions {
  /** e.g. `https://api.example.com/v1` */
  baseUrl: string;
  /** Returns the bearer token to send, if any. */
  getToken?: () => string | undefined | Promise<string | undefined>;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function createHttpClient({ baseUrl, getToken }: HttpClientOptions) {
  return async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await getToken?.();
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new HttpError(response.status, `${method} ${path} failed with HTTP ${response.status}`);
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  };
}
