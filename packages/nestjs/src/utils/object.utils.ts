export function getNestedValue(obj: any, path: string): any {
  return path
    .split('.')
    .reduce((current, key) => (current && typeof current === 'object' ? current[key] : undefined), obj)
}

export const isEmptyObj = (obj: Record<string, any>): boolean => Object.keys(obj).length === 0
