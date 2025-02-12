import { INestApplication, Injectable } from '@nestjs/common'
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Document, FilterQuery, Model, Schema as MongooseSchema, QueryOptions, Types } from 'mongoose'
import { testModuleImports } from '../tests/test.helpers'
import { BaseUser } from '../user'
import { BaseConversation, BaseConversationVisibility } from './base-conversation.model'
import { BaseConversationService } from './base-conversation.service'
import { BaseMessage } from './base-message.model'
import { BaseMessageService } from './base-message.service'

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
    visibility: {
      type: String,
      enum: Object.values(BaseConversationVisibility),
      default: BaseConversationVisibility.Private,
    },
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
  ) {
    super(conversationModel, messageService)
    ;(messageService as any).conversationService = this
  }

  override async generateResponse(_conversation: TestConversation, _prompt: string): Promise<TestMessage['content']> {
    return 'AI response'
  }

  override async createMessage(data: Partial<TestMessage>): Promise<TestMessage> {
    const message = await this.messageService.create(data as TestMessage)
    await this.updateById(data.conversation, {
      $set: { lastMessageAt: new Date() },
    })
    return message
  }

  override async createResponse(conversation: TestConversation, prompt: string): Promise<TestMessage> {
    const content = await this.generateResponse(conversation, prompt)
    return await this.createMessage({
      role: 'assistant',
      content,
      conversation: conversation._id,
      owner: conversation.owner,
    } as Partial<TestMessage>)
  }

  override streamResponse(): AsyncIterable<string> {
    throw new Error('Mock implementation.')
  }
}

describe('BaseConversationService', () => {
  let app: INestApplication
  let service: TestConversationService
  let messageService: TestMessageService
  let mockUser: BaseUser
  let otherUser: BaseUser

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ...testModuleImports,
        MongooseModule.forFeature([
          { name: 'TestConversation', schema: TestConversation.schema },
          { name: TestMessage.name, schema: SchemaFactory.createForClass(TestMessage) },
        ]),
      ],
      providers: [TestMessageService, TestConversationService],
    }).compile()

    app = module.createNestApplication()
    await app.init()

    service = module.get<TestConversationService>(TestConversationService)
    messageService = module.get<TestMessageService>(TestMessageService)
    mockUser = { _id: new Types.ObjectId() } as BaseUser
    otherUser = { _id: new Types.ObjectId() } as BaseUser
  })

  afterEach(async () => {
    await app.close()
  })

  describe('createConversationWithPrompt', () => {
    it('should create conversation and message', async () => {
      const result = await service.createConversation(mockUser, 'test prompt')
      expect(result).toBeDefined()
      expect(String(result.owner)).toBe(String(mockUser._id))
      expect(result.visibility).toBe(BaseConversationVisibility.Private)

      const messages = await messageService.findMany({ conversation: result._id })
      expect(messages).toHaveLength(1)
      expect(messages[0].role).toBe('user')
      expect(messages[0].content).toBe('test prompt')
    })

    it('should create conversation with custom visibility', async () => {
      const result = await service.createConversation(mockUser, 'test prompt', BaseConversationVisibility.Public)
      expect(result).toBeDefined()
      expect(String(result.owner)).toBe(String(mockUser._id))
      expect(result.visibility).toBe(BaseConversationVisibility.Public)

      const messages = await messageService.findMany({ conversation: result._id })
      expect(messages).toHaveLength(1)
    })

    it('should trigger AI processing in sync mode', async () => {
      const aiResponseContent = 'AI response'
      const generateResponseSpy = jest.spyOn(service, 'generateResponse').mockResolvedValueOnce(aiResponseContent)
      await service.createResponse(await service.createConversation(mockUser, 'test prompt'), 'test prompt')
      expect(generateResponseSpy).toHaveBeenCalled()
    })
  })

  describe('visibility', () => {
    let conversation: TestConversation

    beforeEach(async () => {
      const created = await service.create({
        owner: mockUser._id,
        visibility: BaseConversationVisibility.Private,
        lastMessageAt: new Date(),
      } as TestConversation)
      conversation = created
    })

    it('should allow owner to view private conversation', () => {
      expect(service.canView(conversation, mockUser)).toBe(true)
    })

    it('should allow anyone to view public conversation', async () => {
      await service.updateById(conversation._id, {
        visibility: BaseConversationVisibility.Public,
      } as Partial<TestConversation>)

      const publicConversation = await service.findById(conversation._id)
      expect(publicConversation).toBeDefined()
      expect(service.canView(publicConversation, otherUser)).toBe(true)
    })

    it('should not allow others to view private conversation', () => {
      expect(service.canView(conversation, otherUser)).toBe(false)
    })
  })

  describe('createResponse', () => {
    let conversation: TestConversation

    beforeEach(async () => {
      conversation = await service.create({
        owner: mockUser._id,
        visibility: BaseConversationVisibility.Private,
        lastMessageAt: new Date(),
      } as TestConversation)
    })

    it('should create assistant message and update lastMessageAt', async () => {
      const content = 'AI response'
      jest.spyOn(service, 'generateResponse').mockResolvedValueOnce(content)
      const originalLastMessageAt = conversation.lastMessageAt.getTime()

      const message = await service.createResponse(conversation, 'test prompt')
      expect(message).toBeDefined()
      expect(message.role).toBe('assistant')
      expect(message.content).toBe(content)
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
        visibility: BaseConversationVisibility.Private,
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
      const aiResponseContent = 'AI response'
      jest.spyOn(service, 'generateResponse').mockResolvedValueOnce(aiResponseContent)

      const response = await service.createResponse(conversation, 'test prompt')

      expect(response).toBeDefined()
      expect(response.role).toBe('assistant')
      expect(response.content).toBe(aiResponseContent)
      expect(String(response.conversation)).toBe(String(conversation._id))
      expect(String(response.owner)).toBe(String(conversation.owner))
    })
  })
})
