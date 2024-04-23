import { Test, TestingModule } from '@nestjs/testing'
import { BaseUserController } from './base-user.controller'

describe('BaseUserController', () => {
  let controller: BaseUserController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      // controllers: [BaseUserController],
    }).compile()

    controller = module.get<BaseUserController>(BaseUserController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
