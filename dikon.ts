/**
 * Creates a DI builder when called without arguments.
 *
 * ```ts
 * const createHttpClient = (baseUrl: string) => ({
 *     get: <T>(path: string) => fetch(`${baseUrl}${path}`).then((r) => r.json() as Promise<T>),
 * });
 *
 * const di = dikon()
 *     .require<{ config: { readonly baseUrl: string } }>()
 *     .provide({ httpClient: ({ config }) => createHttpClient(config.baseUrl) })
 *     .build({ config: { baseUrl: 'https://api.example.com' } });
 *
 * await di.httpClient.get<readonly { id: number; title: string }[]>('/posts');
 * ```
 */
export function dikon(): Dikon<{}, {}>;
/**
 * Defines a reusable Dikon plugin when called with a callback. Pass the
 * returned function to builder `.pipe(...)`.
 *
 * ```ts
 * const createHttpClient = (baseUrl: string) => ({
 *     get: <T>(path: string) => fetch(`${baseUrl}${path}`).then((r) => r.json() as Promise<T>),
 * });
 *
 * const withHttpClient = dikon((builder) =>
 *     builder
 *         .require<{ config: { readonly baseUrl: string } }>()
 *         .provide({ httpClient: ({ config }) => createHttpClient(config.baseUrl) }),
 * );
 *
 * const di = dikon()
 *     .pipe(withHttpClient)
 *     .build({ config: { baseUrl: 'https://api.example.com' } });
 *
 * await di.httpClient.get<readonly { id: number; title: string }[]>('/posts');
 * ```
 */
export function dikon<TPlugin extends DikonPlugin>(fn: TPlugin): TPlugin;
export function dikon(fn?: DikonPlugin): Dikon<{}, {}> | DikonPlugin {
  return fn ?? createBuilder();
}

export type Dikon<TExistingDeps, TRequires> = dikon.Dikon<TExistingDeps, TRequires>;
export type Of<T extends Dikon<any, any>> = dikon.Of<T>;

/**
 * The single runtime export for Dikon.
 *
 * ```ts
 * import { dikon } from './dikon';
 *
 * const di = dikon()
 *     .require<{ config: { readonly num: number } }>()
 *     .provide({
 *         value({ config }) {
 *             return config.num + 2;
 *         },
 *     })
 *     .build({ config: { num: 40 } });
 *
 * console.log(di.value); // 42
 * ```
 */
export namespace dikon {
  export type Of<T extends Dikon<any, any>> = Built<T[typeof __dikonTypes]['existingDeps']>;

  // Explicit invariance avoids TypeScript recalculating variance for the fluent builder type.
  export interface Dikon<in out TExistingDeps, in out TRequires> {
    [__dikonTypes]: {
      existingDeps: TExistingDeps;
      requires: TRequires;
    };
    __layers: Layer[];
    /**
     * Declares dependencies that must be supplied to build this container, or
     * provided by earlier layers.
     *
     * ```ts
     * interface Config {
     *     readonly baseUrl: string;
     * }
     *
     * const di = dikon()
     *     .require<{ config: Config }>()
     *     .provide({
     *         url({ config }) {
     *             return `${config.baseUrl}/posts`;
     *         },
     *     })
     *     .build({ config: { baseUrl: 'https://api.test' } });
     *
     * di.url; // 'https://api.test/posts'
     * ```
     */
    require<TNewRequires extends object>(): Dikon<
      Merge<TExistingDeps, TNewRequires>,
      Merge<TRequires, SimplifyOmit<TNewRequires, keyof TExistingDeps>>
    >;
    /**
     * Adds a layer of services. Factories can read dependencies that existed
     * before this layer, including required values and parent services.
     *
     * ```ts
     * const createHttpClient = (baseUrl: string) => ({
     *     get: <T>(path: string) => fetch(`${baseUrl}${path}`).then((r) => r.json() as Promise<T>),
     * });
     *
     * const di = dikon()
     *     .require<{ config: { readonly baseUrl: string } }>()
     *     .provide({ httpClient: ({ config }) => createHttpClient(config.baseUrl) })
     *     .build({ config: { baseUrl: 'https://api.example.com' } });
     *
     * await di.httpClient.get<readonly { id: number; title: string }[]>('/posts');
     * ```
     */
    provide<TNewDeps extends { [K in keyof TNewDeps]: (di: Built<TExistingDeps>) => unknown }>(
      newDeps: TNewDeps,
    ): Dikon<Merge<TExistingDeps, ToInstances<TNewDeps>>, SimplifyOmit<TRequires, keyof TNewDeps>>;
    /**
     * Replaces an existing service while preserving its public type.
     * It behaves like a later provider layer, but only existing keys can be replaced.
     *
     * ```ts
     * const di = dikon()
     *     .provide({
     *         clock() {
     *             return { now: () => Date.now() };
     *         },
     *     })
     *     .override({
     *         clock: () => ({ now: () => 0 }),
     *     })
     *     .build();
     *
     * di.clock.now(); // 0
     * ```
     */
    override<
      TOverrideDeps extends Partial<{
        [K in keyof TExistingDeps]: (di: Built<SimplifyOmit<TExistingDeps, K>>) => TExistingDeps[K];
      }>,
    >(
      newDeps: TOverrideDeps,
    ): Dikon<TExistingDeps, SimplifyOmit<TRequires, keyof TOverrideDeps>>;
    /**
     * Builds a container with lazy services. Each service factory runs only when
     * the service is first read, then the instance is cached on that container.
     * Choose this when startup should stay cheap or some services may never be
     * used. Factory side effects and errors happen on first read.
     *
     * ```ts
     * const parent = dikon()
     *     .provide({
     *         config() {
     *             return { baseUrl: 'https://api.test' };
     *         },
     *     })
     *     .build();
     *
     * const child = dikon()
     *     .require<typeof parent>()
     *     .provide({
     *         url({ config }) {
     *             return `${config.baseUrl}/posts`;
     *         },
     *     })
     *     .build(undefined, parent);
     *
     * child.url; // 'https://api.test/posts'
     * ```
     *
     * Pass `undefined` as the first argument when the child has no local
     * required values and only needs a parent container.
     *
     * When a parent object is passed, the container uses it as its prototype.
     * Local required values and services shadow parent values. If the parent
     * is another Dikon container, inherited lazy services stay cached on that
     * parent.
     */
    build<TParent extends object>(
      ...args: ParentBuildArgs<TRequires, TParent>
    ): Built<TExistingDeps>;
    build(...args: StandaloneBuildArgs<TRequires>): Built<TExistingDeps>;
    /**
     * Builds a container eagerly, resolving each dependency layer before moving
     * to the next layer. Services in the same layer cannot see each other.
     * Choose this when services should be constructed upfront, factory errors
     * should surface during build, or initialization order should follow layers.
     *
     * ```ts
     * const di = dikon()
     *     .provide({
     *         value() {
     *             return 'previous';
     *         },
     *     })
     *     .provide({
     *         value() {
     *             return 'current';
     *         },
     *         label({ value }) {
     *             return `${value}-label`;
     *         },
     *     })
     *     .buildEager();
     *
     * di.value; // 'current'
     * di.label; // 'previous-label'
     * ```
     */
    buildEager<TParent extends object>(
      ...args: ParentBuildArgs<TRequires, TParent>
    ): Built<TExistingDeps>;
    buildEager(...args: StandaloneBuildArgs<TRequires>): Built<TExistingDeps>;
    /**
     * Passes the current builder to a function and returns that function's
     * result. Use this to compose reusable builder plugins.
     *
     * ```ts
     * const createHttpClient = (baseUrl: string) => ({
     *     get: <T>(path: string) => fetch(`${baseUrl}${path}`).then((r) => r.json() as Promise<T>),
     * });
     *
     * const withHttpClient = <TExistingDeps, TRequires>(
     *     builder: Dikon<TExistingDeps, TRequires>,
     * ) =>
     *     builder
     *         .require<{ config: { readonly baseUrl: string } }>()
     *         .provide({ httpClient: ({ config }) => createHttpClient(config.baseUrl) });
     *
     * const di = dikon()
     *     .pipe(withHttpClient)
     *     .build({ config: { baseUrl: 'https://api.example.com' } });
     *
     * await di.httpClient.get<readonly { id: number; title: string }[]>('/posts');
     * ```
     */
    pipe<TResult>(fn: (builder: Dikon<TExistingDeps, TRequires>) => TResult): TResult;
  }
}

export default dikon;

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
type Built<T> = Readonly<T>;

type FactoryMap = Record<PropertyKey, (di: unknown) => unknown>;
type DikonPlugin = <TExistingDeps, TRequires>(builder: Dikon<TExistingDeps, TRequires>) => unknown;
type AnyDikon = Dikon<any, any>;

type HasNoKeys<T> = keyof T extends never ? true : false;
type StandaloneBuildArgs<TRequires> =
  HasNoKeys<TRequires> extends true ? [] : [requires: TRequires];
type UnsatisfiedParentRequires<TRequires, TParent extends object> = SimplifyOmit<
  TRequires,
  keyof TParent
>;
type ParentBuildArgsWithUnsatisfied<TRequires, TParent extends object, TUnsatisfiedRequires> =
  HasNoKeys<TUnsatisfiedRequires> extends true
    ? [requires: Merge<TUnsatisfiedRequires, Partial<TRequires>> | undefined, parent: TParent]
    : [requires: Merge<Partial<TRequires>, TUnsatisfiedRequires>, parent: TParent];
type ParentBuildArgs<TRequires, TParent extends object> = ParentBuildArgsWithUnsatisfied<
  TRequires,
  TParent,
  UnsatisfiedParentRequires<TRequires, TParent>
>;

interface Layer {
  deps: FactoryMap;
  kind: 'override' | 'provide';
}

declare const __dikonTypes: unique symbol;

/**
 * We use symbol to avoid conflicts with the __instances key,
 * which can be declared by the user
 */
const __instances = Symbol('__instances');

const dikonMethods = {
  require(this: AnyDikon) {
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
  build(this: AnyDikon, buildRequires?: object, parent?: object) {
    return buildContainer(this, buildRequires, parent);
  },
  buildEager(this: AnyDikon, buildRequires?: object, parent?: object) {
    return buildEagerContainer(this, buildRequires, parent);
  },
  pipe(this: AnyDikon, fn: (builder: unknown) => unknown) {
    return fn(this);
  },
};

function createBuilder(): Dikon<{}, {}> {
  const builder = {
    __layers: [] as Layer[],
  };
  Object.setPrototypeOf(builder, dikonMethods);

  return builder as unknown as Dikon<{}, {}>;
}

function buildContainer<TExistingDeps, TRequires>(
  builder: Dikon<TExistingDeps, TRequires>,
  buildRequires: object | undefined,
  parent: object | undefined,
): TExistingDeps {
  const di = createContainer(buildRequires, parent);
  Object.defineProperty(di, __instances, {
    value: {} as Record<PropertyKey, unknown>,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  for (const layer of builder.__layers) {
    for (const serviceName of getOwnEnumerableKeys(layer.deps)) {
      Object.defineProperty(di, serviceName, {
        get() {
          const existingInstances = di[__instances] as Record<PropertyKey, unknown>;
          const serviceFactory = layer.deps[serviceName];

          return (existingInstances[serviceName] ??= serviceFactory?.(di));
        },
        configurable: true, // needed so that existing keys can be overwritten
        enumerable: true,
      });
    }
  }

  return di as TExistingDeps;
}

function buildEagerContainer<TExistingDeps, TRequires>(
  builder: Dikon<TExistingDeps, TRequires>,
  buildRequires: object | undefined,
  parent: object | undefined,
): TExistingDeps {
  const di = createContainer(buildRequires, parent);

  for (const layer of createEagerLayers(builder.__layers)) {
    const serviceNames = getOwnEnumerableKeys(layer);
    const layerInstances = {} as Record<PropertyKey, unknown>;

    for (const serviceName of serviceNames) {
      const serviceFactory = layer[serviceName];
      layerInstances[serviceName] = serviceFactory?.(di);
    }

    for (const serviceName of serviceNames) {
      defineReadonlyProperty(di, serviceName, layerInstances[serviceName]);
    }
  }

  return di as TExistingDeps;
}

function createContainer(
  requires: object | undefined,
  parent: object | undefined,
): Record<PropertyKey, unknown> {
  const container = Object.create(parent ?? Object.prototype) as Record<PropertyKey, unknown>;

  if (requires !== undefined) {
    for (const key of getOwnEnumerableKeys(requires)) {
      defineReadonlyProperty(container, key, (requires as Record<PropertyKey, unknown>)[key]);
    }
  }

  return container;
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

function defineReadonlyProperty(
  obj: Record<PropertyKey, unknown>,
  key: PropertyKey,
  value: unknown,
): void {
  Object.defineProperty(obj, key, {
    value,
    configurable: true,
    enumerable: true,
    writable: false,
  });
}

function reportNonFunctionFactories(deps: FactoryMap): void {
  for (const serviceName of getOwnEnumerableKeys(deps)) {
    if (typeof deps[serviceName] !== 'function') {
      console.error(`[DI] Provided ${String(serviceName)} factory is not a function`);
    }
  }
}

function getOwnEnumerableKeys(obj: object): PropertyKey[] {
  return Reflect.ownKeys(obj).filter((key) => Object.prototype.propertyIsEnumerable.call(obj, key));
}
