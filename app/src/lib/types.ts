/**
 * Recursively makes object properties optional.
 * Leaves functions and arrays/tuples unchanged.
 */
export type DeepPartial<T> =
  T extends (...args: never[]) => unknown
    ? T
    : T extends readonly unknown[]
      ? T
      : T extends object
        ? { [P in keyof T]?: DeepPartial<T[P]> }
        : T;