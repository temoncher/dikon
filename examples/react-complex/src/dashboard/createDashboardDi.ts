import { dikon } from '../../../../dikon.ts';
import type { RootDi } from '../di';
import type { RepositoryConfig, RepositorySummary } from '../shared/githubTypes';
import type { HttpClient } from '../shared/httpClient';

interface GithubRepositoryResponse {
  readonly full_name: string;
  readonly description: string | null;
  readonly stargazers_count: number;
  readonly forks_count: number;
  readonly open_issues_count: number;
  readonly html_url: string;
}

function loadRepository(
  httpClient: HttpClient,
  repository: RepositoryConfig,
): Promise<RepositorySummary> {
  return httpClient
    .get<GithubRepositoryResponse>(`/repos/${repository.owner}/${repository.repo}`)
    .then((data) => ({
      fullName: data.full_name,
      description: data.description ?? 'No description provided.',
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      htmlUrl: data.html_url,
    }));
}

export function createDashboardDi() {
  return dikon()
    .require<RootDi>()
    .provide({
      routeMetadata() {
        return {
          title: 'Repository overview',
        };
      },
      loadRepository({ httpClient, repositoryConfig }) {
        return () => loadRepository(httpClient, repositoryConfig);
      },
    });
}

export type DashboardDi = dikon.Of<ReturnType<typeof createDashboardDi>>;
