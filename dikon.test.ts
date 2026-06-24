import { afterEach, describe, expect, test, vi } from 'vitest';

import { dikon } from './dikon';

describe('dikon', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('builds required and provided dependencies', () => {
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

    expect(di.getPosts()).toBe('https://api.test/posts');
  });

  test('creates dikon builders with shared methods', () => {
    const firstBuilder = dikon.container();
    const secondBuilder = dikon.container();

    expect(firstBuilder).toMatchObject({ __layers: [], __requires: [] });
    expect(Object.getPrototypeOf(firstBuilder)).toBe(Object.getPrototypeOf(secondBuilder));
    expect(Object.getPrototypeOf(firstBuilder)).not.toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(firstBuilder, 'provide')).toBe(false);
    expect(typeof firstBuilder.provide).toBe('function');
  });

  test('defines reusable transforms with dikon callback', () => {
    const withHttpClient = dikon.plugin((builder) =>
      builder.requires({ config: dikon.type<{ readonly baseUrl: string }>() }).provide({
        url: ({ config }) => `${config.baseUrl}/posts`,
      }),
    );

    const dataDi = dikon
      .container()
      .pipe(withHttpClient)
      .build({ config: { baseUrl: 'https://api.test' } });

    expect(dataDi.url).toBe('https://api.test/posts');
  });

  test('pipes the current builder into a function', () => {
    const di = dikon
      .container()
      .requires({ config: dikon.type<{ readonly baseUrl: string }>() })
      .pipe((builder) =>
        builder.provide({
          httpClient: ({ config }) => ({
            get(path: string) {
              return `${config.baseUrl}${path}`;
            },
          }),
        }),
      )
      .build({ config: { baseUrl: 'https://api.test' } });

    expect(di.httpClient.get('/posts')).toBe('https://api.test/posts');
  });

  test('returns arbitrary pipe results', () => {
    const service = dikon
      .container()
      .provide({
        value: () => 'ready',
      })
      .pipe((builder) => builder.build().value);

    expect(service).toBe('ready');
  });

  test('keeps requirements added by a piped builder', () => {
    interface Config {
      readonly baseUrl: string;
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const missingConfig = {} as { readonly config: Config };

    dikon
      .container()
      .pipe((builder) => builder.requires({ config: dikon.type<Config>() }))
      .build(missingConfig);

    expect(consoleError).toHaveBeenCalledWith('[DI] Services without implementation: config');
  });

  test('creates provided services lazily and reuses the same instance', () => {
    let factoryCalls = 0;
    const di = dikon
      .container()
      .provide({
        service: () => {
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

  test('builds provided services eagerly with data properties', () => {
    let factoryCalls = 0;
    const di = dikon
      .container()
      .provide({
        service: () => {
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
      writable: true,
    });

    expect(di.service).toEqual({ id: 1 });
    expect(factoryCalls).toBe(1);
  });

  test('builds services eagerly layer by layer', () => {
    const calls: string[] = [];
    const di = dikon
      .container()
      .provide({
        first: () => {
          calls.push('first');

          return 'first';
        },
      })
      .provide({
        second: ({ first }) => {
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
    const di = dikon
      .container()
      .provide({
        value: () => 'previous',
      })
      .provide({
        value: () => 'current',
        sibling: ({ value }) => `${value}-sibling`,
      })
      .buildEager();

    expect(di.value).toBe('current');
    expect(di.sibling).toBe('previous-sibling');
  });

  test('uses overrides for dependencies declared by earlier layers', () => {
    let originalCalls = 0;
    let overrideCalls = 0;
    const di = dikon
      .container()
      .provide({
        base: () => {
          originalCalls += 1;

          return 'base';
        },
      })
      .provide({
        label: ({ base }) => `${base}-label`,
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
    const di = dikon
      .container()
      .provide({
        base: () => {
          calls.push('original');

          return 'original';
        },
      })
      .provide({
        label: ({ base }) => {
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
        later: ({ base, label }) => `${base}:${label}`,
      })
      .buildEager();

    expect(di).toMatchObject({
      base: 'override',
      label: 'override-label',
      later: 'override:override-label',
    });
    expect(calls).toEqual(['override', 'label:override']);
  });

  test('builds a child container with parent dependencies on its prototype', () => {
    const parent = dikon
      .container()
      .provide({
        config: () => ({ baseUrl: 'https://parent.test' }),
      })
      .build();
    const child = dikon
      .container<typeof parent>()
      .provide({
        httpClient: ({ config }) => ({
          get(path: string) {
            return `${config.baseUrl}${path}`;
          },
        }),
      })
      .build(undefined, parent);

    expect(Object.getPrototypeOf(child)).toBe(parent);
    expect(Object.prototype.hasOwnProperty.call(child, 'config')).toBe(false);
    expect(child.config).toBe(parent.config);
    expect(child.httpClient.get('/posts')).toBe('https://parent.test/posts');
  });

  test('keeps inherited lazy parent instances cached on the parent container', () => {
    let parentCalls = 0;
    const parent = dikon
      .container()
      .provide({
        config: () => {
          parentCalls += 1;

          return { id: parentCalls };
        },
      })
      .build();
    const child = dikon
      .container<typeof parent>()
      .provide({
        label: ({ config }) => `config-${config.id}`,
      })
      .build(undefined, parent);

    expect(child.label).toBe('config-1');
    expect(parent.config).toEqual({ id: 1 });
    expect(child.config).toBe(parent.config);
    expect(parentCalls).toBe(1);
  });

  test('lets child providers override parent dependencies', () => {
    const parent = dikon
      .container()
      .provide({
        config: () => ({ baseUrl: 'https://parent.test' }),
      })
      .build();
    const child = dikon
      .container<typeof parent>()
      .provide({
        config: () => ({ baseUrl: 'https://child.test' }),
      })
      .provide({
        url: ({ config }) => `${config.baseUrl}/posts`,
      })
      .build(undefined, parent);

    expect(Object.getPrototypeOf(child)).toBe(parent);
    expect(child.config).toEqual({ baseUrl: 'https://child.test' });
    expect(parent.config).toEqual({ baseUrl: 'https://parent.test' });
    expect(child.url).toBe('https://child.test/posts');
  });

  test('builds eager child services from a parent container without copying parent values', () => {
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
      .buildEager(undefined, parent);

    expect(Object.getPrototypeOf(child)).toBe(parent);
    expect(Object.prototype.hasOwnProperty.call(child, 'config')).toBe(false);
    expect(child.url).toBe('https://parent.test/posts');
  });

  test('builds child containers from parent-aware builder pipes', () => {
    const parent = dikon
      .container()
      .provide({
        config: () => ({ baseUrl: 'https://parent.test' }),
      })
      .build();

    const child = dikon
      .container<typeof parent>()
      .pipe((builder) =>
        builder.provide({
          httpClient: ({ config }) => ({
            get(path: string) {
              return `${config.baseUrl}${path}`;
            },
          }),
        }),
      )
      .build(undefined, parent);

    expect(Object.getPrototypeOf(child)).toBe(parent);
    expect(child.httpClient.get('/posts')).toBe('https://parent.test/posts');
  });

  test('treats inherited parent services as satisfying required dependencies', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const parent = dikon
      .container()
      .provide({
        config: () => ({ baseUrl: 'https://parent.test' }),
      })
      .build();

    const child = dikon
      .container<typeof parent>()
      .requires({ config: dikon.type<{ readonly baseUrl: string }>() })
      .build(undefined, parent);

    expect(child.config).toBe(parent.config);
    expect(consoleError).not.toHaveBeenCalled();
  });

  test('keeps a user __instances dependency separate from the internal cache', () => {
    const di = dikon
      .container()
      .requires({ __instances: dikon.type<string>() })
      .provide({
        reflected: ({ __instances }) => __instances.toUpperCase(),
      })
      .build({ __instances: 'external' });

    expect(di.__instances).toBe('external');
    expect(di.reflected).toBe('EXTERNAL');
  });

  test('builds required and provided dependencies keyed by symbols', () => {
    const CONFIG_TOKEN = Symbol('config');
    const HTTP_CLIENT_TOKEN = Symbol('httpClient');
    const GET_POSTS_TOKEN = Symbol('getPosts');

    interface Config {
      readonly baseUrl: string;
    }

    const di = dikon
      .container()
      .requires({ [CONFIG_TOKEN]: dikon.type<Config>() })
      .provide({
        [HTTP_CLIENT_TOKEN]: ({ [CONFIG_TOKEN]: config }) => ({
          get(path: string) {
            return `${config.baseUrl}${path}`;
          },
        }),
      })
      .provide({
        [GET_POSTS_TOKEN]:
          ({ [HTTP_CLIENT_TOKEN]: httpClient }) =>
          () =>
            httpClient.get('/posts'),
      })
      .build({ [CONFIG_TOKEN]: { baseUrl: 'https://symbol-api.test' } });

    expect(di[GET_POSTS_TOKEN]()).toBe('https://symbol-api.test/posts');
  });

  test('builds symbol-keyed dependencies eagerly', () => {
    const CONFIG_TOKEN = Symbol('config');
    const SERVICE_TOKEN = Symbol('service');
    const LABEL_TOKEN = Symbol('label');

    const di = dikon
      .container()
      .requires({ [CONFIG_TOKEN]: dikon.type<{ readonly prefix: string }>() })
      .provide({
        [SERVICE_TOKEN]: ({ [CONFIG_TOKEN]: config }) => `${config.prefix}-service`,
      })
      .provide({
        [LABEL_TOKEN]: ({ [SERVICE_TOKEN]: service }) => `${service}-label`,
      })
      .buildEager({ [CONFIG_TOKEN]: { prefix: 'symbol' } });

    expect(di[SERVICE_TOKEN]).toBe('symbol-service');
    expect(di[LABEL_TOKEN]).toBe('symbol-service-label');
  });

  test('uses overrides keyed by symbols', () => {
    const SERVICE_TOKEN = Symbol('service');
    const LABEL_TOKEN = Symbol('label');
    let originalCalls = 0;
    let overrideCalls = 0;
    const di = dikon
      .container()
      .provide({
        [SERVICE_TOKEN]: (): string => {
          originalCalls += 1;

          return 'original';
        },
      })
      .provide({
        [LABEL_TOKEN]: ({ [SERVICE_TOKEN]: service }) => `${service}-label`,
      })
      .override({
        [SERVICE_TOKEN]: () => {
          overrideCalls += 1;

          return 'override';
        },
      })
      .build();

    expect(di[SERVICE_TOKEN]).toBe('override');
    expect(di[LABEL_TOKEN]).toBe('override-label');
    expect(originalCalls).toBe(0);
    expect(overrideCalls).toBe(1);
  });

  test('reports required services that are not passed or provided', () => {
    interface Config {
      readonly enabled: boolean;
    }
    type Logger = (message: string) => void;

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const missingConfig = {} as { readonly config: Config };

    dikon
      .container()
      .requires({
        config: dikon.type<Config>(),
        logger: dikon.type<Logger>(),
      })
      .provide({
        logger: () => () => undefined,
      })
      .build(missingConfig);

    expect(consoleError).toHaveBeenCalledWith('[DI] Services without implementation: config');
  });

  test('reports symbol-keyed required services that are not passed or provided', () => {
    const SERVICE_TOKEN = Symbol('service');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const missingService = {} as { readonly [SERVICE_TOKEN]: string };

    dikon
      .container()
      .requires({ [SERVICE_TOKEN]: dikon.type<string>() })
      .build(missingService);

    expect(consoleError).toHaveBeenCalledWith(
      '[DI] Services without implementation: Symbol(service)',
    );
  });

  test('reports non-function factories when providing or overriding services', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const invalidProvidedFactory = 'not a function' as unknown as () => unknown;
    const invalidOverrideFactory = 'also not a function' as unknown as (di: {
      readonly first: string;
    }) => string;

    dikon.container().provide({ broken: invalidProvidedFactory });
    dikon
      .container()
      .provide({
        first: () => 'first',
      })
      .provide({
        service: ({ first }) => first,
      })
      .override({ service: invalidOverrideFactory });

    expect(consoleError).toHaveBeenCalledWith('[DI] Provided broken factory is not a function');
    expect(consoleError).toHaveBeenCalledWith('[DI] Provided service factory is not a function');
  });

  test('reports non-function factories keyed by symbols', () => {
    const SERVICE_TOKEN = Symbol('service');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const invalidProvidedFactory = 'not a function' as unknown as () => unknown;

    dikon.container().provide({ [SERVICE_TOKEN]: invalidProvidedFactory });

    expect(consoleError).toHaveBeenCalledWith(
      '[DI] Provided Symbol(service) factory is not a function',
    );
  });
});
