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

Declare required values with `.require<T>()`, provide services in layers, and call `build()` with the
required values.

```ts
import { dikon } from './dikon';

interface Config {
  readonly baseUrl: string;
}

const di = dikon()
  .require<{ config: Config }>()
  .provide({
    httpClient({ config }) {
      return {
        get(path: string) {
          return `${config.baseUrl}${path}`;
        },
      };
    },
  })
  .provide({
    getPosts({ httpClient }) {
      return () => httpClient.get('/posts');
    },
  })
  .build({ config: { baseUrl: 'https://api.test' } });

di.getPosts(); // "https://api.test/posts"
```

Providers are lazy by default. A provider factory runs the first time its service is read, then the
result is cached on that container.

Use `buildEager()` when you want all providers constructed during the build step.

Built containers expose local build values and services as own enumerable properties. Those
properties are shallow readonly: you cannot replace `di.service`, but the service object can still
manage its own state. Spreading a lazy container reads its enumerable services, so it initializes
them.

## Parent Containers

A container can read from a parent container. Local build values and local providers take
precedence, then missing values fall through to the parent through the prototype chain. Inherited
lazy services stay cached on the parent that defined them.

```ts
const rootDi = dikon()
  .provide({
    config() {
      return { baseUrl: 'https://root.test' };
    },
  })
  .build();

const app = dikon()
  .require<typeof rootDi>()
  .require<{ path: string }>()
  .provide({
    url({ config, path }) {
      return `${config.baseUrl}${path}`;
    },
  })
  .build({ path: '/posts' }, rootDi);

app.url; // "https://root.test/posts"
```

Calling `.require<T>()` is type-only. Use it when a parent container, test builder, or earlier
provider will satisfy those values.

## Overrides

Use `.override(...)` to replace a service that already exists while preserving its public type.

```ts
const di = dikon()
  .provide({
    clock() {
      return { now: () => Date.now() };
    },
  })
  .override({
    clock: () => ({ now: () => 0 }),
  })
  .build();

di.clock.now(); // 0
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

## Symbol Keys

Dikon uses normal JavaScript property keys, so symbol-keyed services also work. Reach for this only
when a string key would be too easy to collide with.

```ts
const CONFIG = Symbol('config');
const URL = Symbol('url');

const di = dikon()
  .require<{ [CONFIG]: { readonly baseUrl: string } }>()
  .provide({
    [URL]({ [CONFIG]: config }) {
      return `${config.baseUrl}/posts`;
    },
  })
  .build({ [CONFIG]: { baseUrl: 'https://api.test' } });

di[URL]; // "https://api.test/posts"
```

## Plugins

Use `dikon(...)` to package reusable builder steps, then pass the plugin to `.pipe(...)`.

```ts
const withHttpClient = dikon((builder) =>
  builder.require<{ config: { readonly baseUrl: string } }>().provide({
    httpClient({ config }) {
      return {
        get(path: string) {
          return `${config.baseUrl}${path}`;
        },
      };
    },
  }),
);

const di = dikon()
  .pipe(withHttpClient)
  .build({ config: { baseUrl: 'https://api.test' } });
```

## If You Really Need Disposal

Dikon does not manage lifetimes. Most frontend, Storybook, and test containers can just let normal
garbage collection handle unused instances. If a backend request container opens something that must
be closed deterministically, keep cleanup as ordinary services instead of adding lifecycle rules to
every provider.

```ts
const withDisposal = dikon((builder) =>
  builder
    .provide({
      disposables(): Array<() => void | Promise<void>> {
        return [];
      },
    })
    .provide({
      defer({ disposables }) {
        return (dispose: () => void | Promise<void>) => {
          disposables.push(dispose);
        };
      },
      dispose({ disposables }) {
        return async () => {
          for (const dispose of [...disposables].reverse()) {
            await dispose();
          }
        };
      },
    }),
);

const requestDi = dikon()
  .pipe(withDisposal)
  .provide({
    connection({ defer }) {
      const connection = openConnection();

      defer(() => connection.close());

      return connection;
    },
  })
  .build({ request }, app);

try {
  await handleRequest(requestDi);
} finally {
  await requestDi.dispose();
}
```

Lazy providers only register cleanup if they are actually read. If you need a different disposal
order or error policy, keep that policy in this local recipe.
