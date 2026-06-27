import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { disposeModuleDisposables } from '../shared/disposeModuleDisposables';
import type { RouterService } from '../shared/routerTypes';
import { useAsyncValue } from '../shared/useAsyncValue';
import { commitsDiModule } from './commitsDi';
import type { CommitsDeps } from './commitsDi';

interface CommitsRouteProps {
  readonly shellDi: CommitsDeps & { readonly router: RouterService };
}

export default function CommitsRoute({ shellDi }: CommitsRouteProps) {
  const di = useMemo(() => commitsDiModule.build(undefined, shellDi), [shellDi]);
  const commits = useAsyncValue(di.loadCommits);
  const secondsUntilRefresh = useSyncExternalStore(
    di.commitsRefreshService.subscribe,
    di.commitsRefreshService.getSnapshot,
  );
  const refreshUnit = secondsUntilRefresh === 1 ? 'second' : 'seconds';
  const listClassName = [
    'repo-lens__list',
    di.featureFlags.compactList ? 'repo-lens__list--compact' : '',
    commits.isRefetching ? 'repo-lens__list--refreshing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    di.commitsRefreshService.start(commits.refresh);

    return () => {
      void disposeModuleDisposables(di);
    };
  }, [commits.refresh, di]);

  return (
    <section className='repo-lens__panel' data-testid='route-panel'>
      <p className='repo-lens__section-title'>{di.routeMetadata.title}</p>
      <p className='repo-lens__meta'>
        {commits.isRefetching
          ? 'Refreshing commits...'
          : `Next refresh in ${secondsUntilRefresh} ${refreshUnit}`}
      </p>
      {commits.isPending ? <p>Loading commits...</p> : null}
      {commits.error === null ? null : <p role='alert'>{commits.error}</p>}
      {commits.value?.length === 0 ? <p>{di.routeMetadata.emptyText}</p> : null}
      <ul className={listClassName}>
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
        <button onClick={() => shellDi.router.navigate({ id: 'dashboard' })} type='button'>
          Back to overview
        </button>
        <button onClick={() => shellDi.router.navigate({ id: 'issues' })} type='button'>
          View issues
        </button>
      </div>
    </section>
  );
}
