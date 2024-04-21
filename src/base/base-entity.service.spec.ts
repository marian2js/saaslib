import { Injectable } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { BaseEntityService } from './base-entity.service'

@Injectable()
class EntityService extends BaseEntityService<any> {
  constructor() {
    super(null)
  }
}

describe('BaseEntityService', () => {
  let service: EntityService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntityService],
    }).compile()

    service = module.get<EntityService>(EntityService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
