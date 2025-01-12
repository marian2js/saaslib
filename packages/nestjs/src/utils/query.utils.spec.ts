import { buildUpdateQuery, buildUpdateQueryWithMapping, buildUpdateQueryWithoutReplace } from './query.utils'

describe('buildUpdateQuery', () => {
  it('should add fields to $set if they are different in updateData', () => {
    const doc = { a: 1, b: 2, c: 3 }
    const updateData = { a: 10, b: 2, d: 4 }

    const result = buildUpdateQuery(doc, updateData)

    expect(result).toEqual({
      $set: { a: 10, d: 4 },
    })
  })

  it('should add fields to $unset if they are undefined in updateData and defined in doc', () => {
    const doc = { a: 1, b: 2, c: 3 }
    const updateData = { a: undefined, b: 2, c: undefined }

    const result = buildUpdateQuery(doc, updateData)

    expect(result).toEqual({
      $unset: { a: '', c: '' },
    })
  })

  it('should handle mixed $set and $unset operations', () => {
    const doc = { a: 1, b: 2, c: 3, d: 4 }
    const updateData = { a: 10, b: undefined, c: 3, e: 5 }

    const result = buildUpdateQuery(doc, updateData)

    expect(result).toEqual({
      $set: { a: 10, e: 5 },
      $unset: { b: '' },
    })
  })

  it('should not add fields to $set if they are the same in doc and updateData', () => {
    const doc = { a: 1, b: 2, c: 3 }
    const updateData = { a: 1, b: 2, c: 3 }

    const result = buildUpdateQuery(doc, updateData)

    expect(result).toEqual(null)
  })

  it('should not add fields to $unset if they are undefined in both doc and updateData', () => {
    const doc = { a: 1, b: 2, c: undefined }
    const updateData = { a: 1, b: 2, c: undefined }

    const result = buildUpdateQuery(doc, updateData)

    expect(result).toEqual(null)
  })

  it('should handle Date fields correctly', () => {
    const date1 = new Date('2023-01-01')
    const date2 = new Date('2023-01-01')
    const date3 = new Date('2023-01-02')

    const doc = { dateField: date1 }
    const updateDataSame = { dateField: date2 }
    const updateDataDifferent = { dateField: date3 }

    const resultSame = buildUpdateQuery(doc, updateDataSame)
    const resultDifferent = buildUpdateQuery(doc, updateDataDifferent)

    expect(resultSame).toEqual(null)

    expect(resultDifferent).toEqual({
      $set: { dateField: date3 },
    })
  })

  it('should handle empty doc and updateData gracefully', () => {
    const doc = {}
    const updateData = {}

    const result = buildUpdateQuery(doc, updateData)

    expect(result).toEqual(null)
  })

  it('should ignore null values when ignoreNullValues is true', () => {
    const doc = { a: 1, b: 2, c: 3 }
    const updateData = { a: 10, b: null, c: null }

    const result = buildUpdateQuery(doc, updateData, { ignoreNullValues: true })

    expect(result).toEqual({
      $set: { a: 10 },
    })
  })

  it('should merge nested objects when mergeDeepObjects is true', () => {
    const doc = {
      settings: {
        theme: 'dark',
        notifications: true,
        display: { color: 'blue', size: 'large' },
      },
    }
    const updateData = {
      settings: {
        theme: 'light',
        display: { size: 'small' },
      },
    }

    const result = buildUpdateQuery(doc, updateData as any, { mergeDeepObjects: true })

    expect(result).toEqual({
      $set: {
        settings: {
          theme: 'light',
          notifications: true,
          display: { color: 'blue', size: 'small' },
        },
      },
    })
  })

  it('should not merge objects when mergeDeepObjects is false', () => {
    const doc = {
      settings: {
        theme: 'dark',
        notifications: true,
      },
    }
    const updateData = {
      settings: {
        theme: 'light',
      },
    }

    const result = buildUpdateQuery(doc, updateData as any)

    expect(result).toEqual({
      $set: {
        settings: {
          theme: 'light',
        },
      },
    })
  })

  it('should handle arrays as non-mergeable values when mergeDeepObjects is true', () => {
    const doc = {
      items: [1, 2, 3],
      config: { items: [{ id: 1 }] },
    }
    const updateData = {
      items: [4, 5],
      config: { items: [{ id: 2 }] },
    }

    const result = buildUpdateQuery(doc, updateData, { mergeDeepObjects: true })

    expect(result).toEqual({
      $set: {
        items: [4, 5],
        config: { items: [{ id: 2 }] },
      },
    })
  })
})

describe('buildUpdateQueryWithMapping', () => {
  it('should add fields to $set if they are different in updateData', () => {
    const doc = { a: 1, b: 2, c: 3 }
    const updateData = { a: 10, b: 2, d: 4 }
    const mapping = { a: 'a', b: 'b', d: 'd' }

    const result = buildUpdateQueryWithMapping(doc, updateData, mapping)

    expect(result).toEqual({
      $set: { a: 10, d: 4 },
    })
  })

  it('should add fields to $unset if they are undefined in updateData and defined in doc', () => {
    const doc = { a: 1, b: 2, c: 3 }
    const updateData = { a: undefined, b: 2, c: undefined }
    const mapping = { a: 'a', b: 'b', c: 'c' }

    const result = buildUpdateQueryWithMapping(doc, updateData, mapping)

    expect(result).toEqual({
      $unset: { a: '', c: '' },
    })
  })

  it('should handle mixed $set and $unset operations', () => {
    const doc = { a: 1, b: 2, c: 3, d: 4 }
    const updateData = { a: 10, b: undefined, c: 3, e: 5 }
    const mapping = { a: 'a', b: 'b', c: 'c', e: 'e' }

    const result = buildUpdateQueryWithMapping(doc, updateData, mapping)

    expect(result).toEqual({
      $set: { a: 10, e: 5 },
      $unset: { b: '' },
    })
  })

  it('should not add fields to $set if they are the same in doc and updateData', () => {
    const doc = { a: 1, b: 2, c: 3 }
    const updateData = { a: 1, b: 2, c: 3 }
    const mapping = { a: 'a', b: 'b', c: 'c' }

    const result = buildUpdateQueryWithMapping(doc, updateData, mapping)

    expect(result).toEqual(null)
  })

  it('should handle Date fields correctly', () => {
    const date1 = new Date('2023-01-01')
    const date2 = new Date('2023-01-01')
    const date3 = new Date('2023-01-02')

    const doc = { dateField: date1 }
    const updateDataSame = { dateField: date2 }
    const updateDataDifferent = { dateField: date3 }
    const mapping = { dateField: 'dateField' }

    const resultSame = buildUpdateQueryWithMapping(doc, updateDataSame, mapping)
    const resultDifferent = buildUpdateQueryWithMapping(doc, updateDataDifferent, mapping)

    expect(resultSame).toEqual(null)

    expect(resultDifferent).toEqual({
      $set: { dateField: date3 },
    })
  })

  it('should handle empty doc, updateData, and mapping gracefully', () => {
    const doc = {}
    const updateData = {}
    const mapping = {}

    const result = buildUpdateQueryWithMapping(doc, updateData, mapping)

    expect(result).toEqual(null)
  })

  it('should ignore null values when ignoreNullValues is true', () => {
    const doc = { a: 1, b: 2, c: 3 }
    const updateData = { a: 10, b: null, c: null }
    const mapping = { a: 'a', b: 'b', c: 'c' }

    const result = buildUpdateQueryWithMapping(doc, updateData, mapping, { ignoreNullValues: true })

    expect(result).toEqual({
      $set: { a: 10 },
    })
  })

  it('should merge nested objects with mapping when mergeDeepObjects is true', () => {
    const doc = {
      userConfig: {
        theme: 'dark',
        notifications: true,
      },
    }
    const updateData = {
      config: {
        theme: 'light',
      },
    }
    const mapping = {
      userConfig: 'config',
    }

    const result = buildUpdateQueryWithMapping(doc, updateData, mapping, { mergeDeepObjects: true })

    expect(result).toEqual({
      $set: {
        userConfig: {
          theme: 'light',
          notifications: true,
        },
      },
    })
  })
})

describe('buildUpdateQueryWithoutReplace', () => {
  it('should add fields to $set if they are null or undefined in doc', () => {
    const doc = { a: 1, b: null, c: undefined }
    const updateData = { a: 10, b: 2, c: 3, d: 4 }

    const result = buildUpdateQueryWithoutReplace(doc, updateData)

    expect(result).toEqual({
      $set: { b: 2, c: 3, d: 4 },
    })
  })

  it('should not add fields to $set if they are already defined in doc', () => {
    const doc = { a: 1, b: 2, c: 3 }
    const updateData = { a: 10, b: 20, c: 30, d: 40 }

    const result = buildUpdateQueryWithoutReplace(doc, updateData)

    expect(result).toEqual({
      $set: { d: 40 },
    })
  })

  it('should return null if no fields need to be updated', () => {
    const doc = { a: 1, b: 2, c: 3 }
    const updateData = { a: 10, b: 20, c: 30 }

    const result = buildUpdateQueryWithoutReplace(doc, updateData)

    expect(result).toEqual(null)
  })

  it('should handle Date fields correctly', () => {
    const date1 = new Date('2023-01-02')

    const doc = { dateField: null }
    const updateData = { dateField: date1 }

    const result = buildUpdateQueryWithoutReplace(doc, updateData)

    expect(result).toEqual({
      $set: { dateField: date1 },
    })
  })

  it('should not update Date fields if already set in doc', () => {
    const date1 = new Date('2023-01-01')
    const date2 = new Date('2023-01-02')

    const doc = { dateField: date1 }
    const updateData = { dateField: date2 }

    const result = buildUpdateQueryWithoutReplace(doc, updateData)

    expect(result).toEqual(null)
  })

  it('should handle empty doc and updateData gracefully', () => {
    const doc = {}
    const updateData = {}

    const result = buildUpdateQueryWithoutReplace(doc, updateData)

    expect(result).toEqual(null)
  })

  it('should handle mixed scenarios correctly', () => {
    const doc = { a: 1, b: null, c: undefined, d: 4 }
    const updateData = { a: 10, b: 2, c: 3, d: 40, e: 5 }

    const result = buildUpdateQueryWithoutReplace(doc, updateData)

    expect(result).toEqual({
      $set: { b: 2, c: 3, e: 5 },
    })
  })

  it('should ignore null values when ignoreNullValues is true', () => {
    const doc = { a: 1, b: null, c: undefined }
    const updateData = { a: 10, b: null, c: null }

    const result = buildUpdateQueryWithoutReplace(doc, updateData, { ignoreNullValues: true })

    expect(result).toEqual(null)
  })
})
