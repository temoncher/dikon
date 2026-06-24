type AnyFunction = (...args: any[]) => any;
type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};
type SimplifyOmit<T, K extends PropertyKey> = Simplify<{
  [P in keyof T as P extends K ? never : P]: T[P];
}>;
type Merge<A, B> = Simplify<SimplifyOmit<A, keyof B> & B>;
type ToInstances<T> = Simplify<{
  [K in keyof T]: T[K] extends AnyFunction ? ReturnType<T[K]> : never;
}>;

type FactoryMap = Record<PropertyKey, (di: unknown) => unknown>;
type RequireMap = Record<PropertyKey, unknown>;
type HasNoKeys<T> = keyof T extends never ? true : false;
type StandaloneBuildArgs<TRequires> =
  HasNoKeys<TRequires> extends true ? [] : [requires: TRequires];
type UnsatisfiedParentRequires<TRequires, TParentDeps extends object> = SimplifyOmit<
  TRequires,
  keyof TParentDeps
>;
type ParentBuildArgsWithUnsatisfied<TRequires, TParentDeps extends object, TUnsatisfiedRequires> =
  HasNoKeys<TUnsatisfiedRequires> extends true
    ? [requires: Merge<TUnsatisfiedRequires, Partial<TRequires>> | undefined, parent: TParentDeps]
    : [requires: Merge<TUnsatisfiedRequires, Partial<TRequires>>, parent: TParentDeps];
type ParentBuildArgs<TRequires, TParentDeps extends object> = ParentBuildArgsWithUnsatisfied<
  TRequires,
  TParentDeps,
  UnsatisfiedParentRequires<TRequires, TParentDeps>
>;
type BuildArgs<TRequires, TParentDeps> = TParentDeps extends undefined
  ? StandaloneBuildArgs<TRequires>
  : ParentBuildArgs<TRequires, TParentDeps & object>;
interface Layer {
  deps: FactoryMap;
  kind: 'override' | 'provide';
}

declare const __dikonTypes: unique symbol;

type AnyDikon = Dikon<any, any, any>;

/**
 * We use symbol to avoid conflicts with the __instances key,
 * which can be declared by the user
 */
const __instances = Symbol('__instances');

function getOwnEnumerableKeys(obj: object): PropertyKey[] {
  return Reflect.ownKeys(obj).filter((key) => Object.prototype.propertyIsEnumerable.call(obj, key));
}

function formatServiceName(serviceName: PropertyKey): string {
  return String(serviceName);
}

function createEagerLayers(layers: Layer[]): FactoryMap[] {
  const eagerLayers: FactoryMap[] = [];
  const serviceLayerIndexes = new Map<PropertyKey, number>();

  for (const layer of layers) {
    if (layer.kind === 'provide') {
      const copiedDeps = { ...layer.deps };
      eagerLayers.push(copiedDeps);

      const copiedLayerIndex = eagerLayers.length - 1;

      for (const serviceName of getOwnEnumerableKeys(copiedDeps)) {
        serviceLayerIndexes.set(serviceName, copiedLayerIndex);
      }
      continue;
    }

    const missingOverrideDeps = {} as FactoryMap;

    for (const serviceName of getOwnEnumerableKeys(layer.deps)) {
      const targetLayerIndex = serviceLayerIndexes.get(serviceName);

      if (targetLayerIndex === undefined) {
        missingOverrideDeps[serviceName] = layer.deps[serviceName];
        continue;
      }

      eagerLayers[targetLayerIndex][serviceName] = layer.deps[serviceName];
    }

    const missingOverrideKeys = getOwnEnumerableKeys(missingOverrideDeps);

    if (missingOverrideKeys.length > 0) {
      eagerLayers.push(missingOverrideDeps);

      const missingOverrideLayerIndex = eagerLayers.length - 1;

      for (const serviceName of missingOverrideKeys) {
        serviceLayerIndexes.set(serviceName, missingOverrideLayerIndex);
      }
    }
  }

  return eagerLayers;
}

function createNotProvidedServices(requires: RequireMap[], di: object): Set<PropertyKey> {
  const notProvidedServices = new Set<PropertyKey>();

  for (const requireObj of requires) {
    for (const service of getOwnEnumerableKeys(requireObj)) {
      if (!(service in di)) {
        notProvidedServices.add(service);
      }
    }
  }

  return notProvidedServices;
}

function reportNotProvidedServices(notProvidedServices: Set<PropertyKey>): void {
  if (notProvidedServices.size > 0) {
    console.error(
      `[DI] Services without implementation: ${[...notProvidedServices].map(formatServiceName).join(',')}`,
    );
  }
}

function createContainer(
  requires: object | undefined,
  parent: object | undefined,
): Record<PropertyKey, unknown> {
  const container = Object.create(parent ?? Object.prototype) as Record<PropertyKey, unknown>;

  if (requires !== undefined) {
    Object.assign(container, requires);
  }

  return container;
}

type DikonPlugin = <TExistingDeps, TRequires, TParentDeps>(
  builder: Dikon<TExistingDeps, TRequires, TParentDeps>,
) => unknown;

function reportNonFunctionFactories(deps: FactoryMap): void {
  for (const serviceName of getOwnEnumerableKeys(deps)) {
    if (typeof deps[serviceName] !== 'function') {
      console.error(`[DI] Provided ${formatServiceName(serviceName)} factory is not a function`);
    }
  }
}

function createBuilder<TParentDeps extends object>():
  | Dikon<{}, {}, undefined>
  | Dikon<TParentDeps, {}, TParentDeps> {
  const builder = {
    __layers: [] as Layer[],
    __requires: [] as RequireMap[],
  };
  Object.setPrototypeOf(builder, dikonMethods);

  return builder as unknown as Dikon<{}, {}, undefined> | Dikon<TParentDeps, {}, TParentDeps>;
}

function buildContainer<TExistingDeps, TRequires, TParentDeps>(
  builder: Dikon<TExistingDeps, TRequires, TParentDeps>,
  buildRequires: object | undefined,
  parent: object | undefined,
): TExistingDeps {
  const di = createContainer(buildRequires, parent);
  di[__instances] = {} as Record<PropertyKey, unknown>;

  const notProvidedServices = createNotProvidedServices(builder.__requires, di);

  for (const layer of builder.__layers) {
    for (const serviceName of getOwnEnumerableKeys(layer.deps)) {
      Object.defineProperty(di, serviceName, {
        get() {
          const existingInstances = di[__instances] as Record<PropertyKey, unknown>;
          const serviceFactory = layer.deps[serviceName];

          return (existingInstances[serviceName] ??= serviceFactory?.(di));
        },
        configurable: true, // needed so that existing keys can be overwritten
      });
      notProvidedServices.delete(serviceName);
    }
  }

  reportNotProvidedServices(notProvidedServices);

  return di as TExistingDeps;
}

function buildEagerContainer<TExistingDeps, TRequires, TParentDeps>(
  builder: Dikon<TExistingDeps, TRequires, TParentDeps>,
  buildRequires: object | undefined,
  parent: object | undefined,
): TExistingDeps {
  const di = createContainer(buildRequires, parent);

  const notProvidedServices = createNotProvidedServices(builder.__requires, di);

  for (const layer of createEagerLayers(builder.__layers)) {
    const serviceNames = getOwnEnumerableKeys(layer);
    const layerInstances = {} as Record<PropertyKey, unknown>;

    for (const serviceName of serviceNames) {
      const serviceFactory = layer[serviceName];
      layerInstances[serviceName] = serviceFactory?.(di);
      notProvidedServices.delete(serviceName);
    }

    for (const serviceName of serviceNames) {
      di[serviceName] = layerInstances[serviceName];
    }
  }

  reportNotProvidedServices(notProvidedServices);

  return di as TExistingDeps;
}

const dikonMethods = {
  requires(this: AnyDikon, requireObj: RequireMap) {
    this.__requires.push(requireObj);

    return this;
  },
  provide(this: AnyDikon, layerObj: FactoryMap) {
    this.__layers.push({ deps: layerObj, kind: 'provide' });
    reportNonFunctionFactories(layerObj);

    return this;
  },
  override(this: AnyDikon, overrideObj: FactoryMap) {
    this.__layers.push({ deps: overrideObj, kind: 'override' });
    reportNonFunctionFactories(overrideObj);

    return this;
  },
  pipe(this: AnyDikon, fn: (builder: unknown) => unknown) {
    return fn(this);
  },
  build(this: AnyDikon, buildRequires?: object, parent?: object) {
    return buildContainer(this, buildRequires, parent);
  },
  buildEager(this: AnyDikon, buildRequires?: object, parent?: object) {
    return buildEagerContainer(this, buildRequires, parent);
  },
};

/**
 * Defines a reusable Dikon plugin. Pass the returned function to builder
 * `.pipe(...)`.
 *
 * ```ts
 * const withHttpClient = dikon.plugin((builder) =>
 *     builder.requires({ config: dikon.type<{ readonly baseUrl: string }>() }).provide({
 *         httpClient: ({ config }) => ({
 *             get(path: string) {
 *                 return fetch(`${config.baseUrl}${path}`).then((res) => res.json());
 *             },
 *         }),
 *     }),
 * );
 *
 * const di = dikon.container()
 *     .pipe(withHttpClient)
 *     .build({ config: { baseUrl: 'https://api.test' } });
 *
 * di.httpClient.get('/posts'); // fetches https://api.test/posts
 * ```
 */
export function plugin<TPlugin extends DikonPlugin>(fn: TPlugin): TPlugin {
  return fn;
}

/**
 * Needed only for declaring types of requires,
 * in runtime it is not used for anything
 *
 * ```ts
 * const di = dikon.container()
 *     .requires({ config: dikon.type<{ readonly baseUrl: string }>() })
 *     .provide({
 *         url: ({ config }) => `${config.baseUrl}/posts`,
 *     })
 *     .build({ config: { baseUrl: 'https://api.test' } });
 *
 * di.url; // 'https://api.test/posts'
 * ```
 */
export function type<T>(): T {
  return undefined as T;
}

/**
 * Creates a DI builder for method chaining.
 *
 * ```ts
 * const di = dikon.container()
 *     .requires({ config: dikon.type<{ readonly baseUrl: string }>() })
 *     .provide({
 *         httpClient: ({ config }) => ({
 *             get(path: string) {
 *                 return fetch(`${config.baseUrl}${path}`).then((res) => res.json());
 *             },
 *         }),
 *     })
 *     .build({ config: { baseUrl: 'https://api.test' } });
 *
 * di.httpClient.get('/posts'); // fetches https://api.test/posts
 * ```
 */
export function container(): Dikon<{}, {}, undefined>;
export function container<TParentDeps extends object>(): Dikon<TParentDeps, {}, TParentDeps>;

export function container<TParentDeps extends object>():
  | Dikon<{}, {}, undefined>
  | Dikon<TParentDeps, {}, TParentDeps> {
  return createBuilder<TParentDeps>();
}

export type Dikon<TExistingDeps, TRequires, TParentDeps> = dikon.Dikon<
  TExistingDeps,
  TRequires,
  TParentDeps
>;
export type Of<T extends Dikon<any, any, any>> = dikon.Of<T>;

/**
 * The single runtime export for Dikon.
 *
 * ```ts
 * import { dikon } from './dikon';
 *
 * const di = dikon.container()
 *     .requires({ config: dikon.type<{ readonly num: number }>() })
 *     .provide({ value: () => config.num + 2 })
 *     .build({ config: { num: 40 } });
 *
 * console.log(di.value); // 42
 * ```
 */
export const dikon = {
  container,
  plugin,
  type,
};
export namespace dikon {
  export type Of<T extends Dikon<any, any, any>> = T[typeof __dikonTypes]['existingDeps'];
  // Explicit invariance avoids TypeScript recalculating variance for the fluent builder type.
  export interface Dikon<in out TExistingDeps, in out TRequires, in out TParentDeps> {
    [__dikonTypes]: {
      existingDeps: TExistingDeps;
      requires: TRequires;
      parentDeps: TParentDeps;
    };
    __layers: Layer[];
    __requires: RequireMap[];
    /**
     * Builds a container with lazy services. Each service factory runs only when
     * the service is first read, then the instance is cached on that container.
     * Choose this when startup should stay cheap or some services may never be
     * used. Factory side effects and errors happen on first read.
     *
     * ```ts
     * const parent = dikon.container()
     *     .provide({ config: () => ({ baseUrl: 'https://api.test' }) })
     *     .build();
     *
     * const child = dikon.container<typeof parent>()
     *     .provide({
     *         url: ({ config }) => `${config.baseUrl}/posts`,
     *     })
     *     .build(undefined, parent);
     *
     * child.url; // 'https://api.test/posts'
     * ```
     *
     * When a parent is passed, the child container reads its own required
     * values and services first, then falls back to the parent. Child services
     * shadow parent services, and parent services stay cached on the parent.
     */
    build(...args: BuildArgs<TRequires, TParentDeps>): TExistingDeps;
    /**
     * Builds a container eagerly, resolving each dependency layer before moving
     * to the next layer. Services in the same layer cannot see each other.
     * Choose this when services should be constructed upfront, factory errors
     * should surface during build, or initialization order should follow layers.
     *
     * ```ts
     * const di = dikon.container()
     *     .provide({ value: () => 'previous' })
     *     .provide({
     *         value: () => 'current',
     *         label: ({ value }) => `${value}-label`,
     *     })
     *     .buildEager();
     *
     * di.value; // 'current'
     * di.label; // 'previous-label'
     * ```
     */
    buildEager(...args: BuildArgs<TRequires, TParentDeps>): TExistingDeps;
    /**
     * Replaces an existing service while preserving its public type.
     * It behaves like a later provider layer, but only existing keys can be replaced.
     *
     * ```ts
     * const di = dikon.container()
     *     .provide({
     *         clock: () => ({ now: () => Date.now() }),
     *     })
     *     .override({
     *         clock: () => ({ now: () => 0 }),
     *     })
     *     .build();
     *
     * di.clock.now(); // 0
     * ```
     */
    override(newDeps: {
      [K in keyof TExistingDeps]?: (di: SimplifyOmit<TExistingDeps, K>) => TExistingDeps[K];
    }): Dikon<TExistingDeps, TRequires, TParentDeps>;
    /**
     * Passes the current builder to a function and returns that function's
     * result. Use this to compose reusable builder plugins.
     *
     * ```ts
     * function withHttpClient<TExistingDeps, TRequires, TParentDeps>(
     *     builder: Dikon<TExistingDeps, TRequires, TParentDeps>,
     * ) {
     *     return builder
     *         .requires({ config: dikon.type<{ readonly baseUrl: string }>() })
     *         .provide({
     *             httpClient: ({ config }) => ({
     *                 get(path: string) {
     *                     return fetch(`${config.baseUrl}${path}`).then((res) => res.json());
     *                 },
     *             }),
     *         });
     * }
     *
     * const di = dikon.container()
     *     .pipe(withHttpClient)
     *     .build({ config: { baseUrl: 'https://api.test' } });
     *
     * di.httpClient.get('/posts'); // fetches https://api.test/posts
     * ```
     */
    pipe<TResult>(fn: (builder: Dikon<TExistingDeps, TRequires, TParentDeps>) => TResult): TResult;
    /**
     * Adds a layer of services. Factories can read dependencies that existed
     * before this layer, including required values and parent-container services.
     *
     * ```ts
     * const di = dikon.container()
     *     .requires({ config: dikon.type<{ readonly baseUrl: string }>() })
     *     .provide({
     *         httpClient: ({ config }) => ({
     *             get(path: string) {
     *                 return fetch(`${config.baseUrl}${path}`).then((res) => res.json());
     *             },
     *         }),
     *     })
     *     .build({ config: { baseUrl: 'https://api.test' } });
     *
     * di.httpClient.get('/posts'); // fetches https://api.test/posts
     * ```
     *
     * Use a symbol token when you want to avoid string-key collisions.
     *
     * ```ts
     * const CONFIG_TOKEN = Symbol('config');
     * const HTTP_CLIENT_TOKEN = Symbol('httpClient');
     *
     * const di = dikon.container()
     *     .requires({ [CONFIG_TOKEN]: dikon.type<{ readonly baseUrl: string }>() })
     *     .provide({
     *         [HTTP_CLIENT_TOKEN]: ({ [CONFIG_TOKEN]: config }) => ({
     *             get(path: string) {
     *                 return fetch(`${config.baseUrl}${path}`).then((res) => res.json());
     *             },
     *         }),
     *     })
     *     .build({ [CONFIG_TOKEN]: { baseUrl: 'https://api.test' } });
     *
     * di[HTTP_CLIENT_TOKEN].get('/posts'); // fetches https://api.test/posts
     * ```
     */
    provide<TNewDeps extends { [K in keyof TNewDeps]: (di: TExistingDeps) => unknown }>(
      newDeps: TNewDeps,
    ): Dikon<
      Merge<TExistingDeps, ToInstances<TNewDeps>>,
      SimplifyOmit<TRequires, keyof TNewDeps>,
      TParentDeps
    >;
    /**
     * Declares dependencies that must be supplied to build this container,
     * unless they are supplied by a parent container.
     *
     * ```ts
     * interface Config {
     *     readonly baseUrl: string;
     * }
     *
     * const di = dikon.container()
     *     .requires({ config: dikon.type<Config>() })
     *     .provide({
     *         url: ({ config }) => `${config.baseUrl}/posts`,
     *     })
     *     .build({ config: { baseUrl: 'https://api.test' } });
     *
     * di.url; // 'https://api.test/posts'
     * ```
     */
    requires<TNewRequires extends object>(
      newRequires: TNewRequires,
    ): Dikon<
      Merge<TExistingDeps, TNewRequires>,
      Merge<TRequires, SimplifyOmit<TNewRequires, keyof TExistingDeps>>,
      TParentDeps
    >;
  }
}

export default dikon;
