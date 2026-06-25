import { dikon } from '../../../../dikon.ts';
import type { RootDi } from '../di';
import { createFeatureFlagsPlugin } from '../shared/featureFlags';
import type { CommitSummary, RepositoryConfig } from '../shared/githubTypes';
import type { HttpClient } from '../shared/httpClient';

interface GithubCommitResponse {
  readonly sha: string;
  readonly html_url: string;
  readonly commit: {
    readonly message: string;
    readonly author: {
      readonly name: string;
    } | null;
  };
}

const withCommitsFlags = createFeatureFlagsPlugin({
  namespace: 'commits',
  flags: {
    compactList: false,
    showAuthor: true,
  },
});

async function loadCommits(
  httpClient: HttpClient,
  repository: RepositoryConfig,
): Promise<readonly CommitSummary[]> {
  const data = await httpClient.get<readonly GithubCommitResponse[]>(
    `/repos/${repository.owner}/${repository.repo}/commits?per_page=5`,
  );

  return data.map((commit) => ({
    sha: commit.sha.slice(0, 7),
    message: commit.commit.message.split('\n')[0] ?? commit.commit.message,
    authorName: commit.commit.author?.name ?? 'Unknown author',
    htmlUrl: commit.html_url,
  }));
}

export function createCommitsDi() {
  return dikon()
    .require<RootDi>()
    .pipe(withCommitsFlags)
    .provide({
      routeMetadata() {
        return {
          emptyText: 'No commits returned for this repository.',
          title: 'Recent commits',
        };
      },
      loadCommits({ httpClient, repositoryConfig }) {
        return () => loadCommits(httpClient, repositoryConfig);
      },
    });
}

type CommitsDiBuilder = ReturnType<typeof createCommitsDi>;
export type CommitsDi = dikon.Of<CommitsDiBuilder>;
