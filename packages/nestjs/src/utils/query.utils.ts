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
    if (updateData[keyTyped] === undefined && doc[keyTyped] !== undefined) {
      result.$unset[keyTyped] = ''
    } else if (updateData[keyTyped] !== undefined && doc[keyTyped] !== updateData[keyTyped]) {
      result.$set[keyTyped] = updateData[keyTyped]
    }
  })

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
      if (updateData[mappedKey] === undefined && doc[key] !== undefined) {
        result.$unset[key] = ''
      } else if (updateData[mappedKey] !== undefined && doc[key] !== updateData[mappedKey]) {
        result.$set[key] = updateData[mappedKey]
      }
    }
  })

  return result
}
