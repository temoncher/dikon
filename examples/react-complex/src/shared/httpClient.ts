import type { CreateRequestContext, RequestObserver } from './requestTracking';

interface HttpRequestOptions {
  readonly operation?: string;
  readonly signal?: AbortSignal;
}

export interface HttpClient {
  get<T>(path: string, options?: HttpRequestOptions): Promise<T>;
}

export interface HttpClientConfig {
  readonly apiBaseUrl: string;
}

export function createHttpClient({ apiBaseUrl }: HttpClientConfig): HttpClient {
  return {
    async get<T>(path: string, options?: HttpRequestOptions) {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: options?.signal,
      });

      if (!response.ok) {
        throw new Error(`GitHub request failed: ${response.status}`);
      }

      return (await response.json()) as T;
    },
  };
}

interface ObservedHttpClientConfig {
  readonly baseHttpClient: HttpClient;
  readonly createRequestContext: CreateRequestContext;
  readonly requestObservers: readonly RequestObserver[];
}

export function createObservedHttpClient({
  baseHttpClient,
  createRequestContext,
  requestObservers,
}: ObservedHttpClientConfig): HttpClient {
  return {
    async get<T>(path: string, options?: HttpRequestOptions) {
      const context = createRequestContext(options?.operation ?? `GET ${path}`);

      for (const observer of requestObservers) {
        observer.requestStarted?.(context);
      }

      try {
        const result = await baseHttpClient.get<T>(path, options);

        for (const observer of requestObservers) {
          observer.requestFinished?.(context);
        }

        return result;
      } catch (error) {
        for (const observer of requestObservers) {
          observer.requestFailed?.(context, error);
        }

        throw error;
      }
    },
  };
}
