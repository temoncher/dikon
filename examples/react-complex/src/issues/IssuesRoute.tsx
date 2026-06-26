import { use, useMemo } from 'react';

import { RootDiContext } from '../di';
import { useAsyncValue } from '../shared/useAsyncValue';
import { issuesDikon } from './issuesDi';

export default function IssuesRoute() {
  const rootDi = use(RootDiContext);
  const di = useMemo(() => issuesDikon.build(undefined, rootDi), [rootDi]);
  const issues = useAsyncValue(di.loadIssues);

  return (
    <section className='repo-lens__panel' data-testid='route-panel'>
      <p className='repo-lens__section-title'>{di.routeMetadata.title}</p>
      {issues.loading ? <p>Loading issues...</p> : null}
      {issues.error === null ? null : <p role='alert'>{issues.error}</p>}
      {issues.value?.length === 0 ? <p>{di.routeMetadata.emptyText}</p> : null}
      <ul className='repo-lens__list'>
        {issues.value?.map((issue) => (
          <li key={issue.number}>
            <a href={issue.htmlUrl}>
              #{issue.number} {issue.title}
            </a>
            {di.featureFlags.showAuthor ? <span>opened by {issue.authorLogin}</span> : null}
          </li>
        ))}
      </ul>
      <div className='repo-lens__actions'>
        <button onClick={() => rootDi.router.navigate({ id: 'dashboard' })} type='button'>
          Back to overview
        </button>
        <button onClick={() => rootDi.router.navigate({ id: 'commits' })} type='button'>
          View commits
        </button>
      </div>
    </section>
  );
}
