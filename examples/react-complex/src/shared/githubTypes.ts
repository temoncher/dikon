export interface RepositoryConfig {
  readonly owner: string;
  readonly repo: string;
  readonly fullName: string;
}

export interface RepositorySummary {
  readonly fullName: string;
  readonly description: string;
  readonly stars: number;
  readonly forks: number;
  readonly openIssues: number;
  readonly htmlUrl: string;
}

export interface CommitSummary {
  readonly sha: string;
  readonly message: string;
  readonly authorName: string;
  readonly htmlUrl: string;
}

export interface IssueSummary {
  readonly number: number;
  readonly title: string;
  readonly authorLogin: string;
  readonly htmlUrl: string;
}
