import { afterEach, describe, expect, test, vi } from 'vitest';

import { dikon } from './dikon';

describe('dikon', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('creates independent dikons by calling dikon directly', () => {
    const firstDikon = dikon().provide({
      value() {
        return 'first';
      },
    });
    const secondDikon = dikon().provide({
      value() {
        return 'second';
      },
    });

    expect(firstDikon.build().value).toBe('first');
    expect(secondDikon.build().value).toBe('second');
  });

  test('merges a standalone dikon through use', () => {
    const urlDikon = dikon()
      .require<{ config: { readonly baseUrl: string } }>()
      .provide({
        url({ config }) {
          return `${config.baseUrl}/posts`;
        },
      });

    const dataDi = dikon()
      .use(urlDikon)
      .build({ config: { baseUrl: 'https://api.test' } });

    expect(dataDi.url).toBe('https://api.test/posts');
  });

  test('satisfies a requirement from an earlier dikon', () => {
    const baseDikon = dikon().provide({
      base() {
        return 'base';
      },
    });
    const labelDikon = dikon()
      .require<{ base: string }>()
      .provide({
        label({ base }) {
          return `${base}-label`;
        },
      });

    const di = dikon().use(baseDikon).use(labelDikon).build();

    expect(di.base).toBe('base');
    expect(di.label).toBe('base-label');
  });

  test('lets a used dikon satisfy a previously required service', () => {
    const clockDikon = dikon().provide({
      clock() {
        return { now: () => 0 };
      },
    });

    const di = dikon()
      .require<{ clock: { now(): number } }>()
      .provide({
        time({ clock }) {
          return clock.now();
        },
      })
      .use(clockDikon)
      .build();

    expect(di.time).toBe(0);
  });

  test('snapshots layers so use does not share later mutations', () => {
    const baseDikon = dikon().provide({
      base() {
        return 'base';
      },
    });
    const consumer = dikon()
      .use(baseDikon)
      .provide({
        extra() {
          return 'extra';
        },
      });

    // Extending the consumer must not leak services back into the source dikon.
    expect(Object.keys(baseDikon.build())).toEqual(['base']);

    const consumerDi = consumer.build();

    expect(consumerDi.base).toBe('base');
    expect(consumerDi.extra).toBe('extra');
  });

  test('composes layers for eager builds', () => {
    const baseDikon = dikon().provide({
      base() {
        return 'base';
      },
    });

    const di = dikon()
      .use(baseDikon)
      .provide({
        label({ base }) {
          return `${base}-label`;
        },
      })
      .buildEager();

    expect(di).toMatchObject({ base: 'base', label: 'base-label' });
  });

  test('provide returns a new dikon and leaves the source unchanged', () => {
    const base = dikon().provide({
      shared() {
        return 'shared';
      },
    });
    const withFirst = base.provide({
      first() {
        return 'first';
      },
    });
    const withSecond = base.provide({
      second() {
        return 'second';
      },
    });

    expect(Object.keys(base.build())).toEqual(['shared']);
    expect(Object.keys(withFirst.build())).toEqual(['shared', 'first']);
    expect(Object.keys(withSecond.build())).toEqual(['shared', 'second']);
  });

  test('override branches independently from a shared dikon', () => {
    const base = dikon().provide({
      value() {
        return 'base';
      },
    });
    const overridden = base.override({
      value: () => 'overridden',
    });

    // The shared dikon must not be polluted by overrides applied to a branch.
    expect(base.build().value).toBe('base');
    expect(overridden.build().value).toBe('overridden');
  });

  test('use branches independently from a shared dikon', () => {
    const base = dikon().provide({
      shared() {
        return 'shared';
      },
    });
    const extra = dikon().provide({
      added() {
        return 'added';
      },
    });
    const composed = base.use(extra);

    expect(Object.keys(base.build())).toEqual(['shared']);
    expect(Object.keys(composed.build())).toEqual(['shared', 'added']);
  });

  test('defines lazy services as enumerable readonly own properties', () => {
    const di = dikon()
      .provide({
        service() {
          return 'ready';
        },
      })
      .build();

    expect(Object.keys(di)).toEqual(['service']);
    expect(Object.getOwnPropertyDescriptor(di, 'service')).toMatchObject({
      configurable: true,
      enumerable: true,
      set: undefined,
    });
    expect(() => {
      (di as { service: string }).service = 'changed';
    }).toThrow(TypeError);
    expect(di.service).toBe('ready');
  });

  test('spreading a lazy container initializes enumerable services', () => {
    let factoryCalls = 0;
    const di = dikon()
      .provide({
        service() {
          factoryCalls += 1;

          return { id: factoryCalls };
        },
      })
      .build();

    expect(Object.keys(di)).toEqual(['service']);
    expect(factoryCalls).toBe(0);

    const copy = { ...di };

    expect(copy).toEqual({ service: { id: 1 } });
    expect(factoryCalls).toBe(1);
  });

  test('defines eager services as enumerable readonly own properties', () => {
    const di = dikon()
      .provide({
        service() {
          return 'ready';
        },
      })
      .buildEager();

    expect(Object.getOwnPropertyDescriptor(di, 'service')).toEqual({
      configurable: true,
      enumerable: true,
      value: 'ready',
      writable: false,
    });
    expect(() => {
      (di as { service: string }).service = 'changed';
    }).toThrow(TypeError);
    expect(di.service).toBe('ready');
  });

  test('defines required build values as enumerable readonly own properties', () => {
    const di = dikon().require<{ config: number }>().build({ config: 10 });

    expect(Object.getOwnPropertyDescriptor(di, 'config')).toEqual({
      configurable: true,
      enumerable: true,
      value: 10,
      writable: false,
    });
    expect(() => {
      (di as { config: number }).config = 11;
    }).toThrow(TypeError);
    expect(di.config).toBe(10);
  });

  test('builds required and provided dependencies', () => {
    const fetchMock = vi.fn<(path: string) => Promise<{ json: () => Promise<unknown> }>>(() =>
      Promise.resolve({
        json: () => Promise.resolve([{ id: 1, title: 'Hello' }]),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const createHttpClient = (baseUrl: string) => ({
      get: <T>(path: string) => fetch(`${baseUrl}${path}`).then((r) => r.json() as Promise<T>),
    });
    const createPostsApi = (httpClient: ReturnType<typeof createHttpClient>) => ({
      list: () => httpClient.get<readonly { id: number; title: string }[]>('/posts'),
    });

    const di = dikon()
      .require<{ config: { readonly baseUrl: string } }>()
      .provide({
        httpClient: ({ config }) => createHttpClient(config.baseUrl),
      })
      .provide({
        postsApi: ({ httpClient }) => createPostsApi(httpClient),
      })
      .build({ config: { baseUrl: 'https://api.example.com' } });

    return expect(di.postsApi.list())
      .resolves.toEqual([{ id: 1, title: 'Hello' }])
      .then(() => expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/posts'));
  });

  test('creates provided services lazily and reuses the same instance', () => {
    let factoryCalls = 0;
    const di = dikon()
      .provide({
        service() {
          factoryCalls += 1;

          return { id: factoryCalls };
        },
      })
      .build();

    expect(factoryCalls).toBe(0);

    const firstService = di.service;
    const secondService = di.service;

    expect(firstService).toBe(secondService);
    expect(firstService).toEqual({ id: 1 });
    expect(factoryCalls).toBe(1);
  });

  test('builds provided services eagerly with readonly data properties', () => {
    let factoryCalls = 0;
    const di = dikon()
      .provide({
        service() {
          factoryCalls += 1;

          return { id: factoryCalls };
        },
      })
      .buildEager();

    expect(factoryCalls).toBe(1);
    expect(Object.getOwnPropertyDescriptor(di, 'service')).toEqual({
      configurable: true,
      enumerable: true,
      value: { id: 1 },
      writable: false,
    });

    expect(di.service).toEqual({ id: 1 });
    expect(factoryCalls).toBe(1);
  });

  test('builds services eagerly layer by layer', () => {
    const calls: string[] = [];
    const di = dikon()
      .provide({
        first() {
          calls.push('first');

          return 'first';
        },
      })
      .provide({
        second({ first }) {
          calls.push(`second:${first}`);

          return `${first}-second`;
        },
      })
      .buildEager();

    expect(di).toMatchObject({
      first: 'first',
      second: 'first-second',
    });
    expect(calls).toEqual(['first', 'second:first']);
  });

  test('publishes eager services only after the whole layer is built', () => {
    const di = dikon()
      .provide({
        value() {
          return 'previous';
        },
      })
      .provide({
        value() {
          return 'current';
        },
        sibling({ value }) {
          return `${value}-sibling`;
        },
      })
      .buildEager();

    expect(di.value).toBe('current');
    expect(di.sibling).toBe('previous-sibling');
  });

  test('uses overrides for dependencies declared by earlier layers', () => {
    let originalCalls = 0;
    let overrideCalls = 0;
    const di = dikon()
      .provide({
        base() {
          originalCalls += 1;

          return 'base';
        },
      })
      .provide({
        label({ base }) {
          return `${base}-label`;
        },
      })
      .override({
        base: () => {
          overrideCalls += 1;

          return 'override';
        },
      })
      .build();

    expect(di.base).toBe('override');
    expect(di.label).toBe('override-label');
    expect(originalCalls).toBe(0);
    expect(overrideCalls).toBe(1);
  });

  test('builds eager dependencies with overrides replacing original factories first', () => {
    const calls: string[] = [];
    const di = dikon()
      .provide({
        base() {
          calls.push('original');

          return 'original';
        },
      })
      .provide({
        label({ base }) {
          calls.push(`label:${base}`);

          return `${base}-label`;
        },
      })
      .override({
        base: () => {
          calls.push('override');

          return 'override';
        },
      })
      .provide({
        later({ base, label }) {
          return `${base}:${label}`;
        },
      })
      .buildEager();

    expect(di).toMatchObject({
      base: 'override',
      label: 'override-label',
      later: 'override:override-label',
    });
    expect(calls).toEqual(['override', 'label:override']);
  });

  test('builds a container with parent dependencies on its prototype', () => {
    const parent = dikon()
      .provide({
        config() {
          return { baseUrl: 'https://parent.test' };
        },
      })
      .build();
    const child = dikon()
      .require<typeof parent>()
      .provide({
        httpClient({ config }) {
          return {
            get(path: string) {
              return `${config.baseUrl}${path}`;
            },
          };
        },
      })
      .build(undefined, parent);

    expect(Object.getPrototypeOf(child)).toBe(parent);
    expect(Object.prototype.hasOwnProperty.call(child, 'config')).toBe(false);
    expect(child.config).toBe(parent.config);
    expect(child.httpClient.get('/posts')).toBe('https://parent.test/posts');
  });

  test('keeps inherited lazy parent instances cached on the parent container', () => {
    let parentCalls = 0;
    const parent = dikon()
      .provide({
        config() {
          parentCalls += 1;

          return { id: parentCalls };
        },
      })
      .build();
    const child = dikon()
      .require<typeof parent>()
      .provide({
        label({ config }) {
          return `config-${config.id}`;
        },
      })
      .build(undefined, parent);

    expect(child.label).toBe('config-1');
    expect(parent.config).toEqual({ id: 1 });
    expect(child.config).toBe(parent.config);
    expect(parentCalls).toBe(1);
  });

  test('lets providers override parent dependencies', () => {
    const parent = dikon()
      .provide({
        config() {
          return { baseUrl: 'https://parent.test' };
        },
      })
      .build();
    const child = dikon()
      .require<typeof parent>()
      .provide({
        config() {
          return { baseUrl: 'https://child.test' };
        },
      })
      .provide({
        url({ config }) {
          return `${config.baseUrl}/posts`;
        },
      })
      .build(undefined, parent);

    expect(Object.getPrototypeOf(child)).toBe(parent);
    expect(child.config).toEqual({ baseUrl: 'https://child.test' });
    expect(parent.config).toEqual({ baseUrl: 'https://parent.test' });
    expect(child.url).toBe('https://child.test/posts');
  });

  test('builds eager services from a parent without copying parent values', () => {
    const parent = dikon()
      .provide({
        config() {
          return { baseUrl: 'https://parent.test' };
        },
      })
      .build();
    const child = dikon()
      .require<typeof parent>()
      .provide({
        url({ config }) {
          return `${config.baseUrl}/posts`;
        },
      })
      .buildEager({}, parent);

    expect(Object.getPrototypeOf(child)).toBe(parent);
    expect(Object.prototype.hasOwnProperty.call(child, 'config')).toBe(false);
    expect(child.url).toBe('https://parent.test/posts');
  });

  test('builds containers with a parent from used dikons', () => {
    const parent = dikon()
      .provide({
        config() {
          return { baseUrl: 'https://parent.test' };
        },
      })
      .build();

    const httpClientDikon = dikon()
      .require<{ config: { readonly baseUrl: string } }>()
      .provide({
        httpClient({ config }) {
          return {
            get(path: string) {
              return `${config.baseUrl}${path}`;
            },
          };
        },
      });

    const child = dikon().require<typeof parent>().use(httpClientDikon).build(undefined, parent);

    expect(Object.getPrototypeOf(child)).toBe(parent);
    expect(child.httpClient.get('/posts')).toBe('https://parent.test/posts');
  });

  test('keeps a user __instances dependency separate from the internal cache', () => {
    const di = dikon()
      .require<{ __instances: string }>()
      .provide({
        reflected({ __instances }) {
          return __instances.toUpperCase();
        },
      })
      .build({ __instances: 'external' });

    expect(di.__instances).toBe('external');
    expect(di.reflected).toBe('EXTERNAL');
  });

  test('reports non-function factories when providing or overriding services', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const invalidProvidedFactory = 'not a function' as unknown as () => unknown;
    const invalidOverrideFactory = 'also not a function' as unknown as (di: {
      readonly first: string;
    }) => string;

    dikon().provide({ broken: invalidProvidedFactory });
    dikon()
      .provide({
        first() {
          return 'first';
        },
      })
      .provide({
        service({ first }) {
          return first;
        },
      })
      .override({ service: invalidOverrideFactory });

    expect(consoleError).toHaveBeenCalledWith('[DI] Provided broken factory is not a function');
    expect(consoleError).toHaveBeenCalledWith('[DI] Provided service factory is not a function');
  });
});
