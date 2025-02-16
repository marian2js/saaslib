import { validate } from 'class-validator'
import 'reflect-metadata'
import { ListQueryDto } from './list-query.dto'

describe('ListQueryDto', () => {
  let dto: ListQueryDto

  beforeEach(() => {
    dto = new ListQueryDto()
  })

  describe('orderBy validation', () => {
    it('should accept any string value', async () => {
      dto.orderBy = 'createdAt:1'
      const errors = await validate(dto)
      expect(errors).toHaveLength(0)

      dto.orderBy = 'createdAt:-1'
      const errors2 = await validate(dto)
      expect(errors2).toHaveLength(0)

      dto.orderBy = 'createdAt:-1,name:1'
      const errors3 = await validate(dto)
      expect(errors3).toHaveLength(0)

      // These should also pass now since we validate format at the service level
      dto.orderBy = 'invalidFormat'
      const errors4 = await validate(dto)
      expect(errors4).toHaveLength(0)

      dto.orderBy = ''
      const errors5 = await validate(dto)
      expect(errors5).toHaveLength(0)
    })

    it('should reject non-string values', async () => {
      // @ts-expect-error testing invalid type
      dto.orderBy = 123
      const errors = await validate(dto)
      expect(errors).toHaveLength(1)

      // @ts-expect-error testing invalid type
      dto.orderBy = {}
      const errors2 = await validate(dto)
      expect(errors2).toHaveLength(1)
    })
  })
})
