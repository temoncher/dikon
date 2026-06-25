import { use, useMemo } from 'react';

import { RootDiContext } from '../di';
import { useAsyncValue } from '../shared/useAsyncValue';
import { createCommitsDi } from './createCommitsDi';

export default function CommitsRoute() {
  const rootDi = use(RootDiContext);
  const di = useMemo(() => createCommitsDi().build(undefined, rootDi), [rootDi]);
  const commits = useAsyncValue(di.loadCommits);

  return (
    <section className='repo-lens__panel' data-testid='route-panel'>
      <p className='repo-lens__section-title'>{di.routeMetadata.title}</p>
      {commits.loading ? <p>Loading commits...</p> : null}
      {commits.error === null ? null : <p role='alert'>{commits.error}</p>}
      {commits.value?.length === 0 ? <p>{di.routeMetadata.emptyText}</p> : null}
      <ul
        className={
          di.featureFlags.compactList ? 'repo-lens__list repo-lens__list--compact' : 'repo-lens__list'
        }
      >
        {commits.value?.map((commit) => (
          <li key={commit.sha}>
            <a href={commit.htmlUrl}>{commit.message}</a>
            <span>
              {commit.sha}
              {di.featureFlags.showAuthor ? ` by ${commit.authorName}` : null}
            </span>
          </li>
        ))}
      </ul>
      <div className='repo-lens__actions'>
        <button onClick={() => rootDi.router.navigate({ id: 'dashboard' })} type='button'>
          Back to overview
        </button>
        <button onClick={() => rootDi.router.navigate({ id: 'issues' })} type='button'>
          View issues
        </button>
      </div>
    </section>
  );
}
