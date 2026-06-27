import { dikon } from '../../../../dikon.ts';
import { dispose, isDisposable } from './disposable';
import type { Disposable } from './disposable';

export async function disposeModuleDisposables(di: object): Promise<void> {
  // Different provider keys can resolve to the same object; dispose each object once.
  const seen = new Set<Disposable>();
  const disposals: Promise<void>[] = [];

  for (const [, instance, ownerDi] of dikon.instances(di)) {
    if (ownerDi !== di || !isDisposable(instance) || seen.has(instance)) {
      continue;
    }

    seen.add(instance);
    // Defer the call itself so cleanup code can finish before disposers run.
    disposals.push(Promise.resolve().then(() => instance[dispose]()));
  }

  await Promise.all(disposals);
}
