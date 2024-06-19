import { buildUpdateQuery, buildUpdateQueryWithMapping } from './query.utils'

describe('buildUpdateQuery', () => {
  it('should add fields to $set if they are different in updateData', () => {
    const doc = { a: 1, b: 2, c: 3 }
    const updateData = { a: 10, b: 2, d: 4 }

    const result = buildUpdateQuery(doc, updateData)

    expect(result).toEqual({
      $set: { a: 10, d: 4 },
      $unset: {},
    })
  })

  it('should add fields to $unset if they are undefined in updateData and defined in doc', () => {
    const doc = { a: 1, b: 2, c: 3 }
    const updateData = { a: undefined, b: 2, c: undefined }

    const result = buildUpdateQuery(doc, updateData)

    expect(result).toEqual({
      $set: {},
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

    expect(result).toEqual({
      $set: {},
      $unset: {},
    })
  })

  it('should not add fields to $unset if they are undefined in both doc and updateData', () => {
    const doc = { a: 1, b: 2, c: undefined }
    const updateData = { a: 1, b: 2, c: undefined }

    const result = buildUpdateQuery(doc, updateData)

    expect(result).toEqual({
      $set: {},
      $unset: {},
    })
  })

  it('should handle empty doc and updateData gracefully', () => {
    const doc = {}
    const updateData = {}

    const result = buildUpdateQuery(doc, updateData)

    expect(result).toEqual({
      $set: {},
      $unset: {},
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
      $unset: {},
    })
  })

  it('should add fields to $unset if they are undefined in updateData and defined in doc', () => {
    const doc = { a: 1, b: 2, c: 3 }
    const updateData = { a: undefined, b: 2, c: undefined }
    const mapping = { a: 'a', b: 'b', c: 'c' }

    const result = buildUpdateQueryWithMapping(doc, updateData, mapping)

    expect(result).toEqual({
      $set: {},
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

    expect(result).toEqual({
      $set: {},
      $unset: {},
    })
  })

  it('should not add fields to $unset if they are undefined in both doc and updateData', () => {
    const doc = { a: 1, b: 2, c: undefined }
    const updateData = { a: 1, b: 2, c: undefined }
    const mapping = { a: 'a', b: 'b', c: 'c' }

    const result = buildUpdateQueryWithMapping(doc, updateData, mapping)

    expect(result).toEqual({
      $set: {},
      $unset: {},
    })
  })

  it('should handle empty doc and updateData gracefully', () => {
    const doc = {}
    const updateData = {}
    const mapping = {}

    const result = buildUpdateQueryWithMapping(doc, updateData, mapping)

    expect(result).toEqual({
      $set: {},
      $unset: {},
    })
  })

  it('should handle empty mapping gracefully', () => {
    const doc = { a: 1, b: 2 }
    const updateData = { a: 10, b: undefined }
    const mapping = {}

    const result = buildUpdateQueryWithMapping(doc, updateData, mapping)

    expect(result).toEqual({
      $set: {},
      $unset: {},
    })
  })
})
