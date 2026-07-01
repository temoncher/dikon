import { dikon } from '../../../../dikon.ts';
import { createFeatureFlagsDiModule } from '../shared/featureFlags';
import type { FeatureFlagClient } from '../shared/featureFlags';
import type { IssueSummary, RepositoryConfig } from '../shared/githubTypes';
import type { HttpClient } from '../shared/httpClient';

export interface IssuesDeps {
  readonly featureFlagClient: FeatureFlagClient;
  readonly httpClient: HttpClient;
  readonly repositoryConfig: RepositoryConfig;
}

interface GithubIssueResponse {
  readonly number: number;
  readonly title: string;
  readonly html_url: string;
  readonly user: {
    readonly login: string;
  } | null;
  readonly pull_request?: unknown;
}

const issuesFlagsDiModule = createFeatureFlagsDiModule({
  namespace: 'issues',
  flags: {
    showAuthor: true,
  },
});

interface LoadIssuesDeps {
  readonly httpClient: HttpClient;
  readonly repositoryConfig: RepositoryConfig;
}

function createLoadIssues({ httpClient, repositoryConfig }: LoadIssuesDeps) {
  return async (options?: { signal: AbortSignal }) => {
    const data = await httpClient.get<readonly GithubIssueResponse[]>(
      `/repos/${repositoryConfig.owner}/${repositoryConfig.repo}/issues?state=open&per_page=5`,
      {
        operation: 'issues.loadIssues',
        signal: options?.signal,
      },
    );

    return data
      .filter((issue) => issue.pull_request === undefined)
      .map(
        (issue): IssueSummary => ({
          number: issue.number,
          title: issue.title,
          authorLogin: issue.user?.login ?? 'unknown',
          htmlUrl: issue.html_url,
        }),
      );
  };
}

export const issuesDiModule = dikon()
  .require<IssuesDeps>()
  .use(issuesFlagsDiModule)
  .provide({
    routeMetadata() {
      return {
        emptyText: 'No open issues returned for this repository.',
        title: 'Open issues',
      };
    },
    loadIssues: createLoadIssues,
  });
