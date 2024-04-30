import { Controller, INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { testModuleImports } from 'src/tests/test.helpers'
import { BaseUser } from '../models/base-user.model'
import { BaseUserService } from '../services/base-user.service'
import { BaseUserController } from './base-user.controller'

@Controller('users')
export class UserController extends BaseUserController<BaseUser> {
  constructor(private userService: BaseUserService<BaseUser>) {
    super(userService)
  }
}

describe('BaseUserController', () => {
  let app: INestApplication
  let controller: UserController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BaseUserService],
      controllers: [UserController],
      imports: testModuleImports,
    }).compile()

    app = module.createNestApplication()
    controller = module.get<UserController>(UserController)

    await app.init()
  })

  afterEach(async () => await app.close())

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
