# Dikon

Dikon is a tiny TypeScript dependency injection helper for building typed service containers with
almost no runtime machinery.

It is intentionally small enough to copy into a project. There is no npm package to install and no
published package workflow in this repository. Copy [`dikon.ts`](./dikon.ts) into your source tree,
import it from there, and keep the copy close to the application code that uses it.

## Copy Into A Project

1. Copy `dikon.ts` into your project, for example `src/dikon.ts`.
2. Import it with a local path.
3. Commit the copied file with your project.

```ts
import { dikon } from './dikon';
```

## Basic Usage

Declare required values with `dikon.type<T>()`, provide services in layers, and call `build()` with
the required values.

```ts
import { dikon } from './dikon';

interface Config {
  readonly baseUrl: string;
}

const di = dikon
  .container()
  .requires({ config: dikon.type<Config>() })
  .provide({
    httpClient: ({ config }) => ({
      get(path: string) {
        return `${config.baseUrl}${path}`;
      },
    }),
  })
  .provide({
    getPosts:
      ({ httpClient }) =>
      () =>
        httpClient.get('/posts'),
  })
  .build({ config: { baseUrl: 'https://api.test' } });

di.getPosts(); // "https://api.test/posts"
```

Providers are lazy by default. A provider factory runs the first time its service is read, then the
result is cached on that container.

Use `buildEager()` when you want all providers constructed during the build step.

## Plugins

Use `dikon.plugin(...)` to package reusable builder steps, then pass the plugin to `.pipe(...)`.

```ts
const withHttpClient = dikon.plugin((builder) =>
  builder.requires({ config: dikon.type<{ readonly baseUrl: string }>() }).provide({
    httpClient: ({ config }) => ({
      get(path: string) {
        return `${config.baseUrl}${path}`;
      },
    }),
  }),
);

const di = dikon
  .container()
  .pipe(withHttpClient)
  .build({ config: { baseUrl: 'https://api.test' } });
```

## Parent Containers

A container can inherit from a parent container. Child services read their own values first and then
fall back to the parent through the prototype chain.

```ts
const parent = dikon
  .container()
  .provide({
    config: () => ({ baseUrl: 'https://parent.test' }),
  })
  .build();

const child = dikon
  .container<typeof parent>()
  .provide({
    url: ({ config }) => `${config.baseUrl}/posts`,
  })
  .build(undefined, parent);

child.url; // "https://parent.test/posts"
```

## Overrides

Use `.override(...)` to replace a service that already exists while preserving its public type.

```ts
const di = dikon
  .container()
  .provide({
    clock: () => ({ now: () => Date.now() }),
  })
  .override({
    clock: () => ({ now: () => 0 }),
  })
  .build();

di.clock.now(); // 0
```

## Symbol Keys

Dikon supports string, number, and symbol property keys. Symbol keys are useful when you want to
avoid accidental name collisions.

```ts
const CONFIG = Symbol('config');
const URL = Symbol('url');

const di = dikon
  .container()
  .requires({ [CONFIG]: dikon.type<{ readonly baseUrl: string }>() })
  .provide({
    [URL]: ({ [CONFIG]: config }) => `${config.baseUrl}/posts`,
  })
  .build({ [CONFIG]: { baseUrl: 'https://api.test' } });

di[URL]; // "https://api.test/posts"
```

## Development

This repository exists to keep the copyable source tested and formatted.

```sh
pnpm install
pnpm test
pnpm test:types
pnpm typecheck
pnpm lint
pnpm format
```

The package is marked `"private": true` because Dikon is intended to be copied, not published.
