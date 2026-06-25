import type { HttpClient } from '../shared/httpClient';

const repository = {
  description: 'A coding agent that helps developers work in their local projects.',
  forks_count: 16,
  full_name: 'temoncher/dikon',
  html_url: 'https://github.com/temoncher/dikon',
  open_issues_count: 9,
  stargazers_count: 128,
};

const commits = [
  {
    sha: 'abc1234abcd',
    html_url: 'https://github.com/temoncher/dikon/commit/abc1234',
    commit: {
      message: 'Add repository lens example\n\nBody',
      author: {
        name: 'Mira',
      },
    },
  },
  {
    sha: 'def5678abcd',
    html_url: 'https://github.com/temoncher/dikon/commit/def5678',
    commit: {
      message: 'Split route containers',
      author: {
        name: 'Niko',
      },
    },
  },
];

const issues = [
  {
    number: 42,
    title: 'Document root service handoff',
    html_url: 'https://github.com/temoncher/dikon/issues/42',
    user: {
      login: 'temoncher',
    },
  },
];

function pending<T>(): Promise<T> {
  return Promise.race([]) as Promise<T>;
}

export function createFakeHttpClient(): HttpClient {
  return {
    get<T>(path: string) {
      if (path.endsWith('/commits?per_page=5')) {
        return Promise.resolve(commits as T);
      }

      if (path.endsWith('/issues?state=open&per_page=5')) {
        return Promise.resolve(issues as T);
      }

      return Promise.resolve(repository as T);
    },
  };
}

export function createEmptyHttpClient(): HttpClient {
  return {
    get<T>(path: string) {
      if (path.endsWith('/commits?per_page=5') || path.endsWith('/issues?state=open&per_page=5')) {
        return Promise.resolve([] as T);
      }

      return Promise.resolve({
        ...repository,
        forks_count: 0,
        open_issues_count: 0,
        stargazers_count: 0,
      } as T);
    },
  };
}

export function createErrorHttpClient(message: string): HttpClient {
  const error = new Error(message);

  return {
    get: () => Promise.reject(error),
  };
}

export function createLoadingHttpClient(): HttpClient {
  return {
    get: () => pending(),
  };
}
