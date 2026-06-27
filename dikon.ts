/**
 * Creates a dikon when called without arguments.
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
export function dikon(): dikon.Dikon<{}, {}> {
  return createDikon([]);
}

/**
 * Iterates already-created service instances, starting from the given
 * container and then walking parent Dikon containers through the prototype
 * chain. It does not initialize unread lazy services, and it does not include
 * required build values supplied to `build(...)`.
 *
 * ```ts
 * const rootDi = dikon()
 *     .provide({
 *         rootService() {
 *             return { id: 'root' };
 *         },
 *     })
 *     .build();
 *
 * const routeDi = dikon()
 *     .require<typeof rootDi>()
 *     .provide({
 *         routeService({ rootService }) {
 *             return { rootId: rootService.id };
 *         },
 *     })
 *     .build(undefined, rootDi);
 *
 * routeDi.routeService;
 *
 * for (const [key, instance, ownerDi] of dikon.instances(routeDi)) {
 *     // Stop before root services so route-only handling does not touch app-scoped instances.
 *     if (ownerDi === rootDi) {
 *         break;
 *     }
 *
 *     // Handle route-owned instances only.
 * }
 * ```
 */
dikon.instances = function instances(container: object): IterableIterator<dikon.InstanceEntry> {
  return iterateInstances(container);
};

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
  export type InstanceEntry = readonly [key: PropertyKey, instance: unknown, di: object];

  /**
   * Extracts the built container type from a composed dikon.
   *
   * Use this when you export a reusable dikon builder and want a matching
   * container type without exporting the internal type ledgers.
   *
   * ```ts
   * export const appDiModule = dikon()
   *     .require<{ config: { readonly baseUrl: string } }>()
   *     .provide({
   *         url({ config }) {
   *             return `${config.baseUrl}/posts`;
   *         },
   *     });
   *
   * export type AppDi = dikon.Of<typeof appDiModule>;
   *
   * const getPostsUrl = (di: AppDi) => di.url;
   * ```
   */
  export type Of<T extends Dikon<any, any>> = Built<T[typeof __dikonTypes]['existingDeps']>;

  /**
   * A composable DI module builder.
   *
   * The generic parameters are internal type ledgers:
   *
   * - `TExistingDeps` is what factories can read and what `build()` returns.
   * - `TRequires` is what still must be supplied by `build()`, a parent, or a
   *   later layer.
   *
   * Dikon declares these parameters invariant so TypeScript does not
   * recalculate variance through every fluent step, which matters for long
   * `.use(...)` chains.
   *
   * ```ts
   * const appDiModule = dikon()
   *     .require<{ config: { readonly baseUrl: string } }>()
   *     .provide({
   *         url({ config }) {
   *             return `${config.baseUrl}/posts`;
   *         },
   *     });
   *
   * const di = appDiModule.build({ config: { baseUrl: 'https://api.test' } });
   *
   * di.url; // 'https://api.test/posts'
   * ```
   */
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
     * Merges another standalone DI module into this one. That DI module is authored
     * as its own `dikon()` chain with concrete types, so its services and
     * requirements are type-checked once, in isolation, instead of being
     * re-instantiated against this dikon's generic type parameters.
     *
     * Its services become available here and satisfy any matching
     * requirements. Requirements it declares that this dikon does not
     * already supply bubble up and must be provided at build time. Collisions
     * resolve last-wins, matching later `provide`/`override` layers.
     *
     * ```ts
     * const createHttpClient = (baseUrl: string) => ({
     *     get: <T>(path: string) => fetch(`${baseUrl}${path}`).then((r) => r.json() as Promise<T>),
     * });
     *
     * const httpClientDiModule = dikon()
     *     .require<{ config: { readonly baseUrl: string } }>()
     *     .provide({ httpClient: ({ config }) => createHttpClient(config.baseUrl) });
     *
     * const di = dikon()
     *     .use(httpClientDiModule)
     *     .build({ config: { baseUrl: 'https://api.example.com' } });
     *
     * await di.httpClient.get<readonly { id: number; title: string }[]>('/posts');
     * ```
     */
    use<TOther extends Dikon<any, any>>(
      other: TOther,
    ): Dikon<
      Merge<TExistingDeps, DikonExistingDeps<TOther>>,
      Merge<
        SimplifyOmit<TRequires, DikonProvidedKeys<TOther>>,
        SimplifyOmit<DikonRequires<TOther>, keyof TExistingDeps>
      >
    >;
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
type InstanceCache = Map<PropertyKey, unknown>;
type AnyDikon = dikon.Dikon<any, any>;

type DikonExistingDeps<T extends AnyDikon> = T[typeof __dikonTypes]['existingDeps'];
type DikonRequires<T extends AnyDikon> = T[typeof __dikonTypes]['requires'];
// Keys a module supplies on its own: everything in its deps that it does not also require.
// Operating on key unions (Exclude) avoids materializing an object type just to read its keys.
type DikonProvidedKeys<T extends AnyDikon> = Exclude<
  keyof DikonExistingDeps<T>,
  keyof DikonRequires<T>
>;

// Build argument types mirror the runtime calling forms:
// - no unsatisfied requirements: build()
// - standalone requirements: build(requires)
// - parent-satisfied requirements: build(undefined, parent)
// - mixed local and parent requirements: build(localRequires, parent)
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

// Phantom type channel used by `dikon.Of` and composition helpers. No runtime
// property with this key is ever written to a dikon object.
declare const __dikonTypes: unique symbol;

/**
 * We use symbol to avoid conflicts with the __instances key,
 * which can be declared by the user
 */
const __instances = Symbol('__instances');

const dikonMethods = {
  require(this: AnyDikon) {
    // Purely a type-level declaration; it adds no layer, so sharing the dikon is safe.
    return this;
  },
  provide(this: AnyDikon, layerObj: FactoryMap) {
    reportNonFunctionFactories(layerObj);

    return createDikon([...this.__layers, { deps: layerObj, kind: 'provide' }]);
  },
  override(this: AnyDikon, overrideObj: FactoryMap) {
    reportNonFunctionFactories(overrideObj);

    return createDikon([...this.__layers, { deps: overrideObj, kind: 'override' }]);
  },
  build(this: AnyDikon, buildRequires?: object, parent?: object) {
    return buildContainer(this, buildRequires, parent);
  },
  buildEager(this: AnyDikon, buildRequires?: object, parent?: object) {
    return buildEagerContainer(this, buildRequires, parent);
  },
  use(this: AnyDikon, other: AnyDikon) {
    return createDikon([...this.__layers, ...other.__layers]);
  },
};

// DI modules are immutable: provide/override/use return a fresh DI module over a new layers array
// rather than mutating in place. A dikon composed once at module scope can be shared and
// built repeatedly without one branch's overrides leaking into another.
function createDikon(layers: Layer[]): dikon.Dikon<{}, {}> {
  const instance = {
    __layers: layers,
  };
  Object.setPrototypeOf(instance, dikonMethods);

  return instance as unknown as dikon.Dikon<{}, {}>;
}

function buildContainer<TExistingDeps, TRequires>(
  instance: dikon.Dikon<TExistingDeps, TRequires>,
  buildRequires: object | undefined,
  parent: object | undefined,
): TExistingDeps {
  const di = createContainer(buildRequires, parent);
  const instanceCache = defineInstanceCache(di);

  for (const layer of instance.__layers) {
    for (const serviceName of getOwnEnumerableKeys(layer.deps)) {
      Object.defineProperty(di, serviceName, {
        get() {
          if (instanceCache.has(serviceName)) {
            return instanceCache.get(serviceName);
          }

          const serviceFactory = layer.deps[serviceName];
          const instance = serviceFactory?.(di);

          // Nullish results are treated as uncached, so factories returning
          // undefined or null will run again on the next read.
          if (instance !== undefined && instance !== null) {
            instanceCache.set(serviceName, instance);
          }

          return instance;
        },
        configurable: true, // needed so that existing keys can be overwritten
        enumerable: true,
      });
    }
  }

  return di as TExistingDeps;
}

function buildEagerContainer<TExistingDeps, TRequires>(
  instance: dikon.Dikon<TExistingDeps, TRequires>,
  buildRequires: object | undefined,
  parent: object | undefined,
): TExistingDeps {
  const di = createContainer(buildRequires, parent);
  const instanceCache = defineInstanceCache(di);

  for (const layer of createEagerLayers(instance.__layers)) {
    const serviceNames = getOwnEnumerableKeys(layer);
    const layerInstances = {} as Record<PropertyKey, unknown>;

    for (const serviceName of serviceNames) {
      const serviceFactory = layer[serviceName];
      layerInstances[serviceName] = serviceFactory?.(di);
    }

    for (const serviceName of serviceNames) {
      const instance = layerInstances[serviceName];

      if (instance !== undefined && instance !== null) {
        instanceCache.set(serviceName, instance);
      }

      defineReadonlyProperty(di, serviceName, instance);
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

function defineInstanceCache(container: Record<PropertyKey, unknown>): InstanceCache {
  const instanceCache: InstanceCache = new Map();

  Object.defineProperty(container, __instances, {
    value: instanceCache,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  return instanceCache;
}

function* iterateInstances(container: object): IterableIterator<dikon.InstanceEntry> {
  let current: object | null = container;

  while (current !== null) {
    const instanceCache = getInstanceCache(current);

    if (instanceCache !== undefined) {
      const entries = [...instanceCache.entries()];

      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const entry = entries[index];

        if (entry === undefined) {
          continue;
        }

        const [key, instance] = entry;

        yield [key, instance, current];
      }
    }

    current = Object.getPrototypeOf(current);
  }
}

function getInstanceCache(container: object): InstanceCache | undefined {
  if (!Object.prototype.hasOwnProperty.call(container, __instances)) {
    return undefined;
  }

  const value = (container as Record<PropertyKey, unknown>)[__instances];

  return value instanceof Map ? value : undefined;
}

// Eager builds resolve providers layer-by-layer, but overrides should replace
// the factory they target before that layer is constructed. This preserves
// same-layer visibility while avoiding construction of the overridden service.
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
      // Keep runtime permissive; TypeScript is the main guardrail, and this
      // warning catches plain JavaScript or `any` misuse without changing flow.
      console.error(`[DI] Provided ${String(serviceName)} factory is not a function`);
    }
  }
}

function getOwnEnumerableKeys(obj: object): PropertyKey[] {
  return Reflect.ownKeys(obj).filter((key) => Object.prototype.propertyIsEnumerable.call(obj, key));
}
