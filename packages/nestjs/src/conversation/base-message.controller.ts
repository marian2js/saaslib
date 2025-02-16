import { Injectable, NotFoundException } from '@nestjs/common'
import { OwneableEntityController } from '../owneable'
import { BaseUser, BaseUserService } from '../user'
import { BaseMessage } from './base-message.model'
import { BaseMessageService } from './base-message.service'

@Injectable()
export abstract class BaseMessageController<
  TMessage extends BaseMessage<any> = BaseMessage<any>,
  U extends BaseUser = BaseUser,
> extends OwneableEntityController<TMessage, U> {
  constructor(
    protected messageService: BaseMessageService<TMessage, U>,
    protected userService: BaseUserService<U>,
  ) {
    super(messageService, userService)
  }

  // Override to prevent direct listing
  async getMine(): Promise<never> {
    throw new NotFoundException()
  }

  // Override to prevent direct getting
  async getOne(): Promise<never> {
    throw new NotFoundException()
  }

  // Override to prevent direct creation
  async create(): Promise<never> {
    throw new NotFoundException()
  }
}
