import { dikon } from '../../../../dikon.ts';
import type { RootDi } from '../di';
import { createFeatureFlagsPlugin } from '../shared/featureFlags';
import type { IssueSummary, RepositoryConfig } from '../shared/githubTypes';
import type { HttpClient } from '../shared/httpClient';

interface GithubIssueResponse {
  readonly number: number;
  readonly title: string;
  readonly html_url: string;
  readonly user: {
    readonly login: string;
  } | null;
  readonly pull_request?: unknown;
}

const withIssuesFlags = createFeatureFlagsPlugin({
  namespace: 'issues',
  flags: {
    showAuthor: true,
  },
});

async function loadIssues(
  httpClient: HttpClient,
  repository: RepositoryConfig,
): Promise<readonly IssueSummary[]> {
  const data = await httpClient.get<readonly GithubIssueResponse[]>(
    `/repos/${repository.owner}/${repository.repo}/issues?state=open&per_page=5`,
  );

  return data
    .filter((issue) => issue.pull_request === undefined)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      authorLogin: issue.user?.login ?? 'unknown',
      htmlUrl: issue.html_url,
    }));
}

export function createIssuesDi() {
  return dikon()
    .require<RootDi>()
    .pipe(withIssuesFlags)
    .provide({
      routeMetadata() {
        return {
          emptyText: 'No open issues returned for this repository.',
          title: 'Open issues',
        };
      },
      loadIssues({ httpClient, repositoryConfig }) {
        return () => loadIssues(httpClient, repositoryConfig);
      },
    });
}

type IssuesDiBuilder = ReturnType<typeof createIssuesDi>;
export type IssuesDi = dikon.Of<IssuesDiBuilder>;
