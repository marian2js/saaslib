import { INestApplication, Injectable } from '@nestjs/common'
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Document, FilterQuery, Model, Schema as MongooseSchema, QueryOptions, Types } from 'mongoose'
import { testModuleImports } from '../tests/test.helpers'
import { BaseUser } from '../user'
import { BaseConversation } from './base-conversation.model'
import { BaseConversationService } from './base-conversation.service'
import { BaseMessage } from './base-message.model'
import { BaseMessageService } from './base-message.service'
import { MessageLogService } from './message-log.service'

@Injectable()
@Schema()
class TestMessage extends BaseMessage<string> {
  @Prop({ required: true, type: String })
  override content: string
}

type TestMessageDocument = TestMessage & Document

@Injectable()
class TestConversation extends BaseConversation {
  static schema = new MongooseSchema({
    owner: { type: Types.ObjectId, required: true },
    title: { type: String },
    lastMessageAt: { type: Date, required: true, default: Date.now },
  })
}

@Injectable()
class TestMessageService extends BaseMessageService<TestMessage, BaseUser> {
  constructor(@InjectModel(TestMessage.name) protected readonly messageModel: Model<TestMessageDocument>) {
    super(messageModel, null)
  }

  override findMany(
    filter: FilterQuery<TestMessage>,
    options?: QueryOptions<TestMessage>,
  ): Promise<TestMessageDocument[]> {
    return this.messageModel.find(filter, null, options).exec()
  }

  override count(filter: FilterQuery<TestMessage>): Promise<number> {
    return this.messageModel.countDocuments(filter).exec()
  }
}

@Injectable()
class TestConversationService extends BaseConversationService<TestMessage, TestConversation, BaseUser> {
  constructor(
    @InjectModel('TestConversation') conversationModel: Model<TestConversation>,
    messageService: TestMessageService,
    messageLogService: MessageLogService,
  ) {
    super(conversationModel, messageService, messageLogService)
    ;(messageService as any).conversationService = this
  }

  override async generateResponse(
    _user: BaseUser,
    _conversation: TestConversation,
    _message: TestMessage,
    _newConversation: boolean,
  ) {
    return { message: { content: 'AI response' } }
  }

  override async createMessage(data: Partial<TestMessage>): Promise<TestMessage> {
    const message = await this.messageService.create(data as TestMessage)
    await this.updateById(data.conversation, {
      $set: { lastMessageAt: new Date() },
    })
    return message
  }

  override async createResponse(
    user: BaseUser,
    conversation: TestConversation,
    message: TestMessage,
    newConversation: boolean,
  ): Promise<TestMessage> {
    const { message: assistantResponse } = await this.generateResponse(user, conversation, message, newConversation)
    return await this.createMessage({
      ...assistantResponse,
      role: 'assistant',
      conversation: conversation._id,
      owner: conversation.owner,
    } as Partial<TestMessage>)
  }

  override streamResponse(): AsyncIterable<string> {
    throw new Error('Mock implementation.')
  }
}

@Injectable()
class MockMessageLogService {
  async count() {
    return 0
  }

  async create() {
    return {}
  }
}

describe('BaseConversationService', () => {
  let app: INestApplication
  let service: TestConversationService
  let messageService: TestMessageService
  let mockUser: BaseUser
  let _otherUser: BaseUser

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ...testModuleImports,
        MongooseModule.forFeature([
          { name: 'TestConversation', schema: TestConversation.schema },
          { name: TestMessage.name, schema: SchemaFactory.createForClass(TestMessage) },
        ]),
      ],
      providers: [
        TestMessageService,
        TestConversationService,
        { provide: MessageLogService, useClass: MockMessageLogService },
      ],
    }).compile()

    app = module.createNestApplication()
    await app.init()

    service = module.get<TestConversationService>(TestConversationService)
    messageService = module.get<TestMessageService>(TestMessageService)
    mockUser = { _id: new Types.ObjectId() } as BaseUser
    _otherUser = { _id: new Types.ObjectId() } as BaseUser
  })

  afterEach(async () => {
    await app.close()
  })

  describe('createConversationWithPrompt', () => {
    it('should create conversation and message', async () => {
      const result = await service.createConversation(mockUser, 'test prompt')
      expect(result).toBeDefined()
      expect(String(result.owner)).toBe(String(mockUser._id))

      const messages = await messageService.findMany({ conversation: result._id })
      expect(messages).toHaveLength(1)
      expect(messages[0].role).toBe('user')
      expect(messages[0].content).toBe('test prompt')
    })

    it('should create conversation with expected fields', async () => {
      const result = await service.createConversation(mockUser, 'test prompt')
      expect(result).toBeDefined()
      expect(String(result.owner)).toBe(String(mockUser._id))
      expect(result.lastMessageAt).toBeDefined()

      const messages = await messageService.findMany({ conversation: result._id })
      expect(messages).toHaveLength(1)
    })

    it('should trigger AI processing in sync mode', async () => {
      const aiResponseData = { message: { content: 'AI response' } }
      const generateResponseSpy = jest.spyOn(service, 'generateResponse').mockResolvedValueOnce(aiResponseData)
      const conversation = await service.createConversation(mockUser, 'test prompt')
      await service.createResponse(
        mockUser,
        conversation,
        {
          content: 'test prompt',
        } as any,
        true,
      )
      expect(generateResponseSpy).toHaveBeenCalled()
    })
  })

  describe('createResponse', () => {
    let conversation: TestConversation

    beforeEach(async () => {
      conversation = await service.create({
        owner: mockUser._id,
        lastMessageAt: new Date(),
      } as TestConversation)
    })

    it('should create assistant message and update lastMessageAt', async () => {
      const aiResponseData = { message: { content: 'AI response' } }
      jest.spyOn(service, 'generateResponse').mockResolvedValueOnce(aiResponseData)
      const originalLastMessageAt = conversation.lastMessageAt.getTime()

      const message = await service.createResponse(mockUser, conversation, { content: 'test prompt' } as any, false)
      expect(message).toBeDefined()
      expect(message.role).toBe('assistant')
      expect(message.content).toBe(aiResponseData.message.content)
      expect(String(message.conversation)).toBe(String(conversation._id))
      expect(String(message.owner)).toBe(String(conversation.owner))

      const updatedConversation = await service.findById(conversation._id)
      expect(updatedConversation.lastMessageAt.getTime()).not.toBe(originalLastMessageAt)
    })
  })

  describe('createMessage', () => {
    let conversation: TestConversation

    beforeEach(async () => {
      conversation = await service.create({
        owner: mockUser._id,
        lastMessageAt: new Date(),
      } as TestConversation)
    })

    it('should create user message', async () => {
      const content = 'test message'

      const message = await service.createMessage({
        role: 'user',
        content,
        conversation: conversation._id,
        owner: mockUser._id,
      } as Partial<TestMessage>)

      expect(message).toBeDefined()
      expect(message.role).toBe('user')
      expect(message.content).toBe(content)

      const messages = await messageService.findMany({ conversation: conversation._id })
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe(content)
    })

    it('should create AI response', async () => {
      const aiResponseData = { message: { content: 'AI response' } }
      jest.spyOn(service, 'generateResponse').mockResolvedValueOnce(aiResponseData)

      const response = await service.createResponse(mockUser, conversation, { content: 'test prompt' } as any, false)

      expect(response).toBeDefined()
      expect(response.role).toBe('assistant')
      expect(response.content).toBe(aiResponseData.message.content)
      expect(String(response.conversation)).toBe(String(conversation._id))
      expect(String(response.owner)).toBe(String(conversation.owner))
    })
  })
})
