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
- A plugin factory that turns declared feature flags into typed route services.
- Domain folders that keep components, services, stories, and screenshot tests together.
- Tests and stories replacing the HTTP client through DI.

## Root DI

`src/main.tsx` creates services that are naturally owned by React:

- the `wouter` router adapter,
- the HTTP client used for GitHub API requests,
- the feature flag client,
- static app configuration.

Those values are passed flat into `createRootDi().build(...)`. Root DI then derives
`repositoryConfig`, a stable repository target that child route containers can reuse without
knowing how the root was created.

## Route DI

Each route folder has a `create*Di.ts` file. A route container:

- requires `RootDi`,
- uses plain providers for route metadata,
- pipes a declared feature flag plugin when the route needs typed flags,
- provides only its domain-specific GitHub request loader.

This keeps route modules independent while still sharing shell services such as routing and the
repository config.

## Plugin Factory

`src/shared/featureFlags.ts` contains the plugin factory. Each route declares the flags it consumes:

```ts
const withCommitsFlags = createFeatureFlagsPlugin({
  namespace: 'commits',
  flags: {
    compactList: false,
    showAuthor: true,
  },
});
```

The plugin requires the root `featureFlagClient` and provides `featureFlags`, with typed boolean
properties from the declaration.

That is the shape where a plugin earns its place: one configured feature needs root infrastructure
and provides route-local services. Simpler route metadata stays as plain `.provide(...)` calls.

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
