export const assertNever = (x: never): never => {
  throw new Error(`[assertNever] Unexpected object: ${x}`)
}

/**
 * Conditional type that checks if two types, X and Y, are equal.
 * It returns A if they are equal, and B otherwise.
 */
type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B

/**
 * Type that extracts the keys of an object T which are not methods.
 * It uses the IfEquals utility type to determine if a property type is the same as its writable version.
 * If the types are equal, the property is likely not a method.
 */
type NonMethodKeys<T> = {
  [P in keyof T]: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P>
}[keyof T]

/**
 * Utility type that picks only the properties from type T that are not methods.
 * It uses NonMethodKeys to identify and select these properties.
 */
export type OmitMethods<T> = Pick<T, NonMethodKeys<T>>
