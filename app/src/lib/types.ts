/**
 * Utility type to make all properties of a type optional, recursively.
 */
export type DeepPartial<T> =
  T extends (...args: never[]) => unknown
    ? T
    : T extends readonly unknown[]
      ? T
      : T extends object
        ? { [P in keyof T]?: DeepPartial<T[P]> }
        : T;