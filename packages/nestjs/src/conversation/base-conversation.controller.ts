import {
  Body,
  ForbiddenException,
  Get,
  HttpException,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Query,
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
import { BaseMessageService } from './base-message.service'
import { MessageLogService } from './message-log.service'

type ConversationWithPrompt = {
  prompt: string
} & BaseConversation

@Injectable()
export abstract class BaseConversationController<
  TMessage extends BaseMessage<any> = BaseMessage<any>,
  T extends BaseConversation & Partial<ConversationWithPrompt> = BaseConversation,
  U extends BaseUser = BaseUser,
> extends OwneableEntityController<T, U> {
  constructor(
    protected conversationService: BaseConversationService<TMessage, T, U>,
    protected messageService: BaseMessageService<TMessage, U>,
    protected userService: BaseUserService<U>,
    protected messageLogService: MessageLogService,
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
    const apiRes = await this.conversationService.getApiObject(doc, user)
    return {
      item: apiRes,
    }
  }

  @UseGuards(UserGuard)
  @Post()
  async createConversation(
    @Req() req: Request,
    @Body() entity: T & ConversationWithPrompt,
    @Res() res: Response,
    @Query('stream') stream?: boolean,
    @Query('async') async?: boolean,
  ) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) })

    let conversationId: string
    try {
      const response = await super.create(req, entity)
      conversationId = response.item.id as string
    } catch (e) {
      const error = e as HttpException
      res.status(error.getStatus()).json({ error: error.message })
      return
    }

    // Create the conversation and initial message
    const conversation = await this.conversationService.findById(conversationId)

    // Create message log entry
    await this.messageLogService.createMessageLog(user)

    const message = await this.messageService.create({
      role: 'user',
      content: entity.prompt,
      conversation: conversation._id,
      owner: conversation.owner,
    } as Partial<TMessage>)

    if (stream) {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      // Stream the AI response
      const messageStream = this.conversationService.streamResponse(conversation, entity.prompt)

      // Handle the stream
      for await (const chunk of messageStream) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      }

      res.end()
    } else {
      const assistantMessagePromise = this.conversationService.createResponse(user, conversation, message, true)
      if (!async) {
        // the message is created and returned fetched by getApiObject
        await assistantMessagePromise
      }

      const data = {
        item: await this.conversationService.getApiObject(conversation, user),
      }
      res.json(data)
      return data
    }
  }

  @UseGuards(UserGuard)
  @Post('/:id/messages')
  async createMessage(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
    @Body() body: { content: string },
    @Query('stream') stream?: boolean,
    @Query('async') async?: boolean,
  ) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) })

    const conversation = await this.conversationService.findOne({
      _id: new Types.ObjectId(id),
    })
    if (!conversation) {
      throw new NotFoundException()
    }
    if (!this.conversationService.canEdit(conversation, user)) {
      throw new ForbiddenException()
    }

    // Create message log entry
    await this.messageLogService.createMessageLog(user)

    // Create the message
    const message = await this.conversationService.createMessage({
      role: 'user',
      content: body.content,
      conversation: conversation._id,
      owner: user._id,
    } as Partial<TMessage>)

    const assistantPromise = this.conversationService.createResponse(user, conversation, message, false)

    const data = {
      messages: [
        await this.messageService.getApiObjectForList(message, user),
        ...(!async ? [await this.messageService.getApiObjectForList(await assistantPromise, user)] : []),
      ],
    }
    res.json(data)
    return data
  }

  async afterDelete(_userId: string, _id: string): Promise<void> {
    // Delete all messages belonging to this conversation
    await this.messageService.deleteMany({ conversation: _id })
  }
}
