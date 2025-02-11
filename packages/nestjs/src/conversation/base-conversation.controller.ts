import { Get, Injectable, NotFoundException, Param, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { Types } from 'mongoose'
import { OwneableEntityController } from '../owneable'
import { BaseUser, BaseUserService, OptionalUserGuard } from '../user'
import { BaseConversation } from './base-conversation.model'
import { BaseConversationService } from './base-conversation.service'
import { BaseMessage } from './base-message.model'

@Injectable()
export abstract class BaseConversationController<
  TMessage extends BaseMessage = BaseMessage,
  T extends BaseConversation = BaseConversation,
  U extends BaseUser = BaseUser,
> extends OwneableEntityController<T, U> {
  constructor(
    protected conversationService: BaseConversationService<TMessage, T, U>,
    protected userService: BaseUserService<U>,
  ) {
    super(conversationService, userService)
  }

  @UseGuards(OptionalUserGuard)
  @Get('/:id')
  async getOne(@Req() req: Request, @Param('id') id: string) {
    const doc = await this.conversationService.findOne({
      _id: new Types.ObjectId(id),
    })

    if (!doc) {
      throw new NotFoundException()
    }

    const userId = (req.user as { id: string })?.id
    const user = userId ? await this.userService.findOne({ _id: new Types.ObjectId(userId) }) : null
    if (!this.conversationService.canView(doc, user)) {
      throw new NotFoundException()
    }
    const apiRes = await this.conversationService.getApiObject(doc)
    return {
      item: apiRes,
    }
  }

  async afterCreate(conversation: T): Promise<void> {
    const prompt = (conversation as any).prompt

    // Create the initial message
    await this.conversationService.createMessage({
      role: 'user',
      content: prompt,
      conversation: conversation._id,
      owner: conversation.owner,
    } as Partial<TMessage>)

    // Process the AI response
    await this.conversationService.processPromptWithAI(conversation, prompt)
  }
}
