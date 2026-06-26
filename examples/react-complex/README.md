# React Complex Example

This example shows why hierarchical containers can be useful in a real React app.

Repo Lens is split into an eagerly loaded app shell and three lazy route domains:

- `dashboard`
- `commits`
- `issues`

The shell builds root DI immediately. Each route module is downloaded later and builds its own child
container from the root container.

## What It Shows

- React-owned services entering DI from the outside.
- A root container shared by lazy route containers.
- A reusable dikon that turns declared feature flags into typed route services.
- Domain folders that keep components, services, stories, and screenshot tests together.
- Tests and stories replacing the HTTP client through DI.

## Root DI

`src/main.tsx` creates services that are naturally owned by React:

- the `wouter` router adapter,
- the HTTP client used for GitHub API requests,
- the feature flag client,
- static app configuration.

Those values are passed flat into `rootDikon.build(...)`. Root DI then derives
`repositoryConfig`, a stable repository target that child route containers can reuse without
knowing how the root was created.

## Route DI

Each route folder has a `*Di.ts` file that composes and exports a dikon at module scope (for
example `commitsDikon`). Building is pure — the route component calls
`commitsDikon.build(undefined, rootDi)` and the shared dikon is never mutated. A route dikon:

- requires `RootDi`,
- uses plain providers for route metadata,
- `use`s a declared feature flag dikon when the route needs typed flags,
- provides only its domain-specific GitHub request loader.

This keeps route folders independent while still sharing shell services such as routing and the
repository config.

## Reusable Dikon

`src/shared/featureFlags.ts` contains the reusable dikon factory. Each route declares the flags it
consumes:

```ts
const commitsFlagsDikon = createFeatureFlagsDikon({
  namespace: 'commits',
  flags: {
    compactList: false,
    showAuthor: true,
  },
});
```

The dikon requires the root `featureFlagClient` and provides `featureFlags`, with typed boolean
properties from the declaration.

That is the shape where a reusable dikon helps: one configured feature needs root infrastructure
and provides route-local services. Simpler route metadata stays as plain `.provide(...)` calls.

Override-based test doubles live next to the route in `src/commits/commitsDi.test.ts`: a test takes
the real `commitsDikon`, `.override(...)`s the network-backed loader (or the resolved feature
flags), and builds — the exported dikon stays untouched because dikons are immutable.

## Tests And Stories

Stories and screenshot tests live beside each route. They build DI explicitly at the render site so
the example shows exactly which root services are being replaced for loading, error, success, and
empty states.

## Run It

```sh
pnpm install
pnpm dev
pnpm test
pnpm test:screenshot
pnpm storybook
pnpm build
```
