export const dispose = Symbol('dispose');

export interface Disposable {
  [dispose](): void | Promise<void>;
}

export function isDisposable(value: unknown): value is Disposable {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    return false;
  }

  const candidate = value as Partial<Disposable>;

  return typeof candidate[dispose] === 'function';
}
