export function getNestedValue(obj: any, path: string): any {
  return path
    .split('.')
    .reduce((current, key) => (current && typeof current === 'object' ? current[key] : undefined), obj)
}

/**
 * Checks if a value is a plain object (not an array, date, null, etc)
 */
export function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Date)
}

export const isEmptyObj = (obj: Record<string, any>): boolean => Object.keys(obj).length === 0

/**
 * Merges two objects deeply, creating a new object without modifying either input
 */
export function mergeDeep<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result: Record<string, any> = { ...target }

  Object.keys(source).forEach((key) => {
    if (source[key] !== undefined) {
      if (isObject(source[key]) && isObject(target[key])) {
        result[key] = mergeDeep(target[key], source[key])
      } else {
        result[key] = source[key]
      }
    }
  })

  return result as T
}
