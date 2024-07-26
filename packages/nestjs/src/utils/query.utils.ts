/**
 * Generates a MongoDB update based on the differences between the original document (doc) and the new
 * update data (updateData). It can be used for both a single update and a bulk update.
 *
 * @param doc - The original document from the database.
 * @param updateData - The new data containing updated values.
 * @returns An object containing $set and $unset properties for MongoDB updates.
 */
export function buildUpdateQuery<T>(
  doc: T,
  updateData: Partial<T>,
): { $set: Partial<T>; $unset: Partial<Record<keyof T, ''>> } {
  const result = {
    $set: {} as Partial<T>,
    $unset: {} as Partial<Record<keyof T, ''>>,
  }

  Object.keys(updateData).forEach((key) => {
    const keyTyped = key as keyof T
    const newValue = updateData[keyTyped]
    const oldValue = doc[keyTyped]

    if (newValue === undefined && oldValue !== undefined) {
      result.$unset[keyTyped] = ''
    } else if (newValue !== undefined && JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      result.$set[keyTyped] = newValue
    }
  })

  if (Object.keys(result.$set).length === 0 && Object.keys(result.$unset).length === 0) {
    return null
  }

  return result
}

/**
 * Generates a MongoDB update based on the differences between the original document (doc) and the new
 * update data (updateData) using a mapping object. It can be used for both a single update and a bulk update.
 *
 * @param doc - The original document from the database.
 * @param updateData - The new data containing updated values.
 * @param mapping - An object mapping the keys of the original document to the keys in the update data.
 * @returns An object containing $set and $unset properties for MongoDB updates.
 */
export function buildUpdateQueryWithMapping<T>(
  doc: T,
  updateData: Record<string, any>,
  mapping: Partial<Record<keyof T, string>>,
): { $set: Partial<T>; $unset: Partial<Record<keyof T, ''>> } {
  const result = {
    $set: {} as Partial<T>,
    $unset: {} as Partial<Record<keyof T, ''>>,
  }

  Object.keys(mapping).forEach((key) => {
    const mappedKey = mapping[key]
    if (mappedKey !== undefined) {
      const newValue = updateData[mappedKey]
      const oldValue = doc[key as keyof T]

      if (newValue === undefined && oldValue !== undefined) {
        result.$unset[key as keyof T] = ''
      } else if (newValue !== undefined && JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        result.$set[key as keyof T] = newValue
      }
    }
  })

  if (Object.keys(result.$set).length === 0 && Object.keys(result.$unset).length === 0) {
    return null
  }

  return result
}
