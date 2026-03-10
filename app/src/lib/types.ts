/**
 * Utility type to make all properties of a type optional, recursively.
 * - Does not turn tuple values into nullable
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};