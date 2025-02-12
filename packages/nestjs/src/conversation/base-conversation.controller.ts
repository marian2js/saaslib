import {
  Body,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { OwneableEntityController } from '../owneable'
import { BaseUser, BaseUserService, OptionalUserGuard, UserGuard } from '../user'
import { BaseConversation } from './base-conversation.model'
import { BaseConversationService } from './base-conversation.service'
import { BaseMessage } from './base-message.model'

type ConversationWithPrompt = {
  prompt: string
} & BaseConversation

@Injectable()
export abstract class BaseConversationController<
  TMessage extends BaseMessage = BaseMessage,
  T extends BaseConversation & Partial<ConversationWithPrompt> = BaseConversation,
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

  @UseGuards(UserGuard)
  @Post('/stream')
  async createWithStream(@Req() req: Request, @Body() entity: T & ConversationWithPrompt, @Res() res?: Response) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) })

    if (!this.owneableEntityService.canCreate(entity, user)) {
      throw new ForbiddenException()
    }

    // Create conversation using the service
    const conversation = await this.conversationService.createConversationWithPrompt(user, entity.prompt)

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Stream the AI response
    const messageStream = this.conversationService.streamPromptWithAI(conversation, entity.prompt)

    // Handle the stream
    for await (const chunk of messageStream) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
    }

    res.end()
  }

  async afterCreate(conversation: T, original: T & Partial<ConversationWithPrompt>): Promise<void> {
    const prompt = original.prompt
    if (!prompt) {
      return
    }

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
