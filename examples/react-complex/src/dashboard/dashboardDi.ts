import { dikon } from '../../../../dikon.ts';
import type { RepositoryConfig, RepositorySummary } from '../shared/githubTypes';
import type { HttpClient } from '../shared/httpClient';

export interface DashboardDeps {
  readonly httpClient: HttpClient;
  readonly repositoryConfig: RepositoryConfig;
}

interface GithubRepositoryResponse {
  readonly full_name: string;
  readonly description: string | null;
  readonly stargazers_count: number;
  readonly forks_count: number;
  readonly open_issues_count: number;
  readonly html_url: string;
}

function createLoadRepository({ httpClient, repositoryConfig }: DashboardDeps) {
  return async (options?: { signal: AbortSignal }) => {
    const data = await httpClient.get<GithubRepositoryResponse>(
      `/repos/${repositoryConfig.owner}/${repositoryConfig.repo}`,
      {
        operation: 'dashboard.loadRepository',
        signal: options?.signal,
      },
    );

    return {
      fullName: data.full_name,
      description: data.description ?? 'No description provided.',
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      htmlUrl: data.html_url,
    } satisfies RepositorySummary;
  };
}

export const dashboardDiModule = dikon()
  .require<DashboardDeps>()
  .provide({
    routeMetadata() {
      return {
        title: 'Repository overview',
      };
    },
    loadRepository: createLoadRepository,
  });
