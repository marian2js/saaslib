import { INestApplication, Injectable } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { BaseEntityService } from './base-entity.service'
import { testModuleImports } from 'src/tests/test.helpers'

@Injectable()
class EntityService extends BaseEntityService<any> {
  constructor() {
    super(null)
  }
}

describe('BaseEntityService', () => {
  let app: INestApplication
  let service: EntityService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntityService],
      imports: testModuleImports,
    }).compile()

    app = module.createNestApplication()
    service = module.get<EntityService>(EntityService)

    await app.init()
  })

  afterEach(async () => await app.close())

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
