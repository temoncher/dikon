export interface HttpClient {
  get<T>(path: string): Promise<T>;
}

export function createHttpClient(apiBaseUrl = 'https://api.github.com'): HttpClient {
  return {
    async get<T>(path: string) {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub request failed: ${response.status}`);
      }

      return (await response.json()) as T;
    },
  };
}
