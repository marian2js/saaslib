import { Controller } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { BaseUserController } from './base-user.controller'
import { BaseUser, BaseUserSchema } from './base-user.model'
import { BaseUserService } from './base-user.service'

@Controller('users')
export class UserController extends BaseUserController {
  constructor(private userService: BaseUserService) {
    super(userService)
  }
}

describe('BaseUserController', () => {
  let controller: UserController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BaseUserService],
      controllers: [UserController],
      imports: [
        MongooseModule.forRoot(global.__MONGO_URI__),
        MongooseModule.forFeature([{ name: BaseUser.name, schema: BaseUserSchema }]),
      ],
    }).compile()

    controller = module.get<UserController>(UserController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
