import { dikon } from '../../../../dikon.ts';
import { dispose } from '../shared/disposable';
import type { Disposable } from '../shared/disposable';
import { createFeatureFlagsDiModule } from '../shared/featureFlags';
import type { FeatureFlagClient } from '../shared/featureFlags';
import type { CommitSummary, RepositoryConfig } from '../shared/githubTypes';
import type { HttpClient } from '../shared/httpClient';

export interface CommitsDeps {
  readonly featureFlagClient: FeatureFlagClient;
  readonly httpClient: HttpClient;
  readonly repositoryConfig: RepositoryConfig;
}

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

const commitsFlagsDiModule = createFeatureFlagsDiModule({
  namespace: 'commits',
  flags: {
    compactList: false,
    showAuthor: true,
  },
});

interface LoadCommitsDeps {
  readonly httpClient: HttpClient;
  readonly repositoryConfig: RepositoryConfig;
}

type CommitsRefreshSubscriber = () => void;

interface CommitsRefreshService extends Disposable {
  getSnapshot(): number;
  start(refresh: () => void): void;
  subscribe(subscriber: CommitsRefreshSubscriber): () => void;
}

const COMMITS_REFRESH_INTERVAL_SECONDS = 5;

function createLoadCommits({ httpClient, repositoryConfig }: LoadCommitsDeps) {
  return async (options?: { signal: AbortSignal }) => {
    // oxlint-disable-next-line no-promise-executor-return promise/avoid-new -- imitate network latency for demo purposes
    await new Promise((resolve) => setTimeout(resolve, 1_000));

    const data = await httpClient.get<readonly GithubCommitResponse[]>(
      `/repos/${repositoryConfig.owner}/${repositoryConfig.repo}/commits?per_page=5`,
      {
        operation: 'commits.loadCommits',
        signal: options?.signal,
      },
    );

    return data.map(
      (commit): CommitSummary => ({
        sha: commit.sha.slice(0, 7),
        message: commit.commit.message.split('\n')[0] ?? commit.commit.message,
        authorName: commit.commit.author?.name ?? 'Unknown author',
        htmlUrl: commit.html_url,
      }),
    );
  };
}

function createCommitsRefreshService(): CommitsRefreshService {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let secondsUntilRefresh = COMMITS_REFRESH_INTERVAL_SECONDS;
  let refresh: (() => void) | null = null;
  const subscribers = new Set<CommitsRefreshSubscriber>();

  function setSecondsUntilRefresh(seconds: number) {
    secondsUntilRefresh = seconds;

    for (const subscriber of subscribers) {
      subscriber();
    }
  }

  return {
    getSnapshot() {
      return secondsUntilRefresh;
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);

      return () => {
        subscribers.delete(subscriber);
      };
    },
    start(nextRefresh) {
      refresh = nextRefresh;

      if (intervalId !== null) {
        clearInterval(intervalId);
      }

      intervalId = setInterval(() => {
        if (secondsUntilRefresh <= 1) {
          refresh?.();
          setSecondsUntilRefresh(COMMITS_REFRESH_INTERVAL_SECONDS);
          return;
        }

        setSecondsUntilRefresh(secondsUntilRefresh - 1);
      }, 1_000);
    },
    [dispose]() {
      if (intervalId === null) {
        return;
      }

      clearInterval(intervalId);
      intervalId = null;
      refresh = null;
    },
  };
}

export const commitsDiModule = dikon()
  .require<CommitsDeps>()
  .use(commitsFlagsDiModule)
  .provide({
    routeMetadata() {
      return {
        emptyText: 'No commits returned for this repository.',
        title: 'Recent commits',
      };
    },
    loadCommits: createLoadCommits,
    commitsRefreshService: createCommitsRefreshService,
  });

export type CommitsDi = dikon.Of<typeof commitsDiModule>;
