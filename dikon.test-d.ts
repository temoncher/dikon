import { assertType, expectTypeOf, test } from 'vitest';

import { dikon } from './dikon';

test('types reusable standalone DI modules through use', () => {
  const parent = dikon()
    .provide({
      config() {
        return 10;
      },
    })
    .build();
  const fortyTwoDiModule = dikon()
    .require<{ config: number }>()
    .provide({
      fortyTwo(di) {
        return di.config + 32;
      },
    });

  const child = dikon().require<typeof parent>().use(fortyTwoDiModule).build(undefined, parent);

  assertType<number>(child.fortyTwo);
});

test('returns readonly build output', () => {
  const appDiModule = dikon().provide({
    value() {
      return 'ready';
    },
  });

  type Dependencies = dikon.Of<typeof appDiModule>;
  const deps = appDiModule.build();

  assertType<Readonly<{ value: string }>>(deps);
  assertType<Readonly<{ value: string }>>({} as Dependencies);

  // @ts-expect-error build output is readonly
  deps.value = 'changed';
});

test('keeps required build values readonly in build output', () => {
  const di = dikon().require<{ config: number }>().build({ config: 10 });

  // @ts-expect-error required build values are readonly on the container
  di.config = 11;
});

test('types instance iterator entries without making containers iterable', () => {
  const di = dikon()
    .provide({
      value() {
        return 1;
      },
    })
    .build();

  const entries = dikon.instances(di);

  assertType<IterableIterator<dikon.InstanceEntry>>(entries);

  for (const [key, instance, ownerDi] of entries) {
    assertType<PropertyKey>(key);
    assertType<unknown>(instance);
    assertType<object>(ownerDi);
  }

  // @ts-expect-error built containers are plain objects, not iterables
  assertType<Iterable<unknown>>(di);
});

test('passes readonly dependencies to providers and overrides', () => {
  dikon()
    .provide({
      config() {
        return 10;
      },
      other() {
        return 1;
      },
    })
    .provide({
      badProvider(di) {
        // @ts-expect-error provider dependencies are readonly
        di.config = 11;

        return di.config;
      },
    })
    .override({
      config: (di) => {
        // @ts-expect-error override dependencies are readonly
        di.other = 2;

        return di.other;
      },
    });
});

test('infers required and provided dependencies', () => {
  const createHttpClient = (baseUrl: string) => ({
    get: <T>(path: string) => fetch(`${baseUrl}${path}`).then((r) => r.json() as Promise<T>),
  });
  const createPostsApi = (httpClient: ReturnType<typeof createHttpClient>) => ({
    list: () => httpClient.get<readonly { id: number; title: string }[]>('/posts'),
  });

  const appDiModule = dikon()
    .require<{ config: { readonly baseUrl: string } }>()
    .provide({
      httpClient: ({ config }) => createHttpClient(config.baseUrl),
    })
    .provide({
      postsApi: ({ httpClient }) => createPostsApi(httpClient),
    });

  type Dependencies = dikon.Of<typeof appDiModule>;

  expectTypeOf<Dependencies['config']>().toEqualTypeOf<{ readonly baseUrl: string }>();
  expectTypeOf<Dependencies['httpClient']>().toEqualTypeOf<{
    get<T>(path: string): Promise<T>;
  }>();
  expectTypeOf<Dependencies['postsApi']>().toEqualTypeOf<{
    list(): Promise<readonly { id: number; title: string }[]>;
  }>();

  // @ts-expect-error config is required
  appDiModule.build();

  const di = appDiModule.build({ config: { baseUrl: 'https://api.example.com' } });

  assertType<Promise<readonly { id: number; title: string }[]>>(di.postsApi.list());
});

test('does not add requirements for values that were already provided', () => {
  const di = dikon()
    .provide({
      config() {
        return { baseUrl: 'https://api.test' };
      },
    })
    .require<{ config: { readonly baseUrl: string } }>()
    .provide({
      url({ config }) {
        return `${config.baseUrl}/posts`;
      },
    })
    .build();

  assertType<string>(di.url);
});

test('types parent containers with dikon methods', () => {
  const parent = dikon()
    .provide({
      config() {
        return { baseUrl: 'https://parent.test' };
      },
    })
    .build();

  const childDiModule = dikon()
    .require<typeof parent>()
    .provide({
      url({ config }) {
        return `${config.baseUrl}/posts`;
      },
    });
  const child = childDiModule.build(undefined, parent);

  assertType<string>(child.url);
  expectTypeOf(child.config).toEqualTypeOf<typeof parent.config>();

  // @ts-expect-error parent is required when type-only deps are not provided
  childDiModule.build();
});

test('keeps local requirements in the first build argument', () => {
  const parent = dikon()
    .provide({
      config() {
        return { baseUrl: 'https://parent.test' };
      },
    })
    .build();

  const childDiModule = dikon()
    .require<typeof parent>()
    .require<{ seed: string }>()
    .provide({
      url({ config, seed }) {
        return `${config.baseUrl}/${seed}`;
      },
    });

  childDiModule.build({ seed: 'posts' }, parent);
  childDiModule.buildEager({ seed: 'posts' }, parent);

  // @ts-expect-error seed is still required even when a parent is passed
  childDiModule.build(undefined, parent);
});

test('types parent containers alongside used DI modules', () => {
  const parent = dikon()
    .provide({
      config() {
        return { baseUrl: 'https://parent.test' };
      },
    })
    .build();

  const urlDiModule = dikon()
    .require<{ config: { baseUrl: string } }>()
    .provide({
      url({ config }) {
        return `${config.baseUrl}/posts`;
      },
    });

  const child = dikon().require<typeof parent>().use(urlDiModule).build(undefined, parent);

  assertType<string>(child.url);
  expectTypeOf(child.config).toEqualTypeOf<typeof parent.config>();
});

test('provided values satisfy requirements', () => {
  interface RootDeps {
    readonly currentUser: { readonly name: string };
    readonly theme: { readonly name: string };
  }

  const appDiModule = dikon()
    .require<RootDeps>()
    .require<{ appConfig: { readonly title: string } }>()
    .provide({
      currentUser() {
        return { name: 'Test User' };
      },
      theme() {
        return { name: 'Test Theme' };
      },
      title({ appConfig, currentUser, theme }) {
        return `${appConfig.title}:${currentUser.name}:${theme.name}`;
      },
    });

  const di = appDiModule.build({ appConfig: { title: 'Board' } });

  assertType<string>(di.title);
});

test('overridden values satisfy requirements', () => {
  interface RootDeps {
    readonly currentUser: { readonly name: string };
    readonly theme: { readonly name: string };
  }

  const appDiModule = dikon()
    .require<RootDeps>()
    .require<{ appConfig: { readonly title: string } }>()
    .override({
      currentUser: () => ({ name: 'Test User' }),
      theme: () => ({ name: 'Test Theme' }),
    })
    .provide({
      title({ appConfig, currentUser, theme }) {
        return `${appConfig.title}:${currentUser.name}:${theme.name}`;
      },
    });

  const di = appDiModule.build({ appConfig: { title: 'Board' } });

  assertType<string>(di.title);
});

test('partially overridden values leave other requirements in place', () => {
  interface RootDeps {
    readonly currentUser: { readonly name: string };
    readonly theme: { readonly name: string };
  }

  const appDiModule = dikon()
    .require<RootDeps>()
    .override({
      currentUser: () => ({ name: 'Test User' }),
    });

  // @ts-expect-error theme is still required when only currentUser is overridden
  appDiModule.build();

  appDiModule.build({ theme: { name: 'Test Theme' } });
});

test('bubbles up requirements from a used DI module', () => {
  const httpClientDiModule = dikon()
    .require<{ config: { readonly baseUrl: string } }>()
    .provide({
      url({ config }) {
        return `${config.baseUrl}/posts`;
      },
    });

  const appDiModule = dikon().use(httpClientDiModule);

  // @ts-expect-error config is required by the used DI module
  appDiModule.build();

  const di = appDiModule.build({ config: { baseUrl: 'https://api.test' } });

  assertType<string>(di.url);
});

test('types service instances contributed by a used DI module', () => {
  const createHttpClient = (baseUrl: string) => ({
    get: <T>(path: string) => fetch(`${baseUrl}${path}`).then((r) => r.json() as Promise<T>),
  });

  const httpClientDiModule = dikon()
    .require<{ config: { readonly baseUrl: string } }>()
    .provide({
      httpClient: ({ config }) => createHttpClient(config.baseUrl),
    });

  const appDiModule = dikon()
    .require<{ config: { readonly baseUrl: string } }>()
    .use(httpClientDiModule);

  const di = appDiModule.build({ config: { baseUrl: 'https://api.example.com' } });

  assertType<Promise<readonly { id: number; title: string }[]>>(
    di.httpClient.get<readonly { id: number; title: string }[]>('/posts'),
  );
});

test('satisfies requirements from earlier DI modules without bubbling them up', () => {
  const configDiModule = dikon().provide({
    config() {
      return { baseUrl: 'https://api.test' };
    },
  });
  const urlDiModule = dikon()
    .require<{ config: { readonly baseUrl: string } }>()
    .provide({
      url({ config }) {
        return `${config.baseUrl}/posts`;
      },
    });

  const di = dikon().use(configDiModule).use(urlDiModule).build();

  assertType<string>(di.url);
});

test('lets a used DI module satisfy a previously required service', () => {
  const clockDiModule = dikon().provide({
    clock() {
      return { now: () => 0 };
    },
  });

  const appDiModule = dikon()
    .require<{ clock: { now(): number } }>()
    .provide({
      time({ clock }) {
        return clock.now();
      },
    })
    .use(clockDiModule);

  const di = appDiModule.build();

  assertType<number>(di.time);
});

test('restricts overrides to existing services with the existing service type', () => {
  const appDiModule = dikon().provide({
    count() {
      return 1;
    },
    label() {
      return 'ready';
    },
  });

  appDiModule.override({
    count: () => 2,
    label: ({ count }) => `count:${count}`,
  });

  // @ts-expect-error missing was never provided
  appDiModule.override({ missing: () => true });

  appDiModule.override({
    // @ts-expect-error count must remain a number
    count: () => 'two',
  });
});
