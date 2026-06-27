import { dikon } from '../../../../dikon.ts';

export interface FeatureFlagClient {
  isEnabled(key: string): boolean | undefined;
}

type FlagDefaults = Record<string, boolean>;
type DeclaredFlags<T extends FlagDefaults> = {
  readonly [Key in keyof T]: boolean;
};

interface FeatureFlagsDiModuleConfig<T extends FlagDefaults> {
  readonly namespace: string;
  readonly flags: T;
}

export type StaticFeatureFlagValues = Readonly<Record<string, boolean>>;

export function createStaticFeatureFlagClient(flags: StaticFeatureFlagValues): FeatureFlagClient {
  return {
    isEnabled: (key: string) => flags[key],
  } satisfies FeatureFlagClient;
}

/**
 * Routes `use` this standalone DI module when they want typed feature flags backed by a parent flag service.
 */
export function createFeatureFlagsDiModule<const T extends FlagDefaults>(
  config: FeatureFlagsDiModuleConfig<T>,
) {
  return dikon()
    .require<{ featureFlagClient: FeatureFlagClient }>()
    .provide({
      featureFlags({ featureFlagClient }): DeclaredFlags<T> {
        return Object.fromEntries(
          Object.entries(config.flags).map(([key, fallback]) => [
            key,
            featureFlagClient.isEnabled(`${config.namespace}.${key}`) ?? fallback,
          ]),
        ) as DeclaredFlags<T>;
      },
    });
}
