import { INestApplication, Injectable } from '@nestjs/common'
import { InjectModel, MongooseModule, SchemaFactory } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Document, FilterQuery, Model, QueryOptions, Schema, Types } from 'mongoose'
import { testModuleImports } from '../tests/test.helpers'
import { BaseUser } from '../user'
import { BaseConversation, BaseConversationVisibility } from './base-conversation.model'
import { BaseConversationService } from './base-conversation.service'
import { BaseMessage } from './base-message.model'
import { BaseMessageService } from './base-message.service'

@Injectable()
class TestMessage extends BaseMessage {
  _id: Types.ObjectId
}

type TestMessageDocument = TestMessage & Document

@Injectable()
class TestConversation extends BaseConversation {
  static schema = new Schema({
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
  }

  async processPromptWithAI(): Promise<void> {
    // Mock implementation
  }

  streamPromptWithAI(): AsyncIterable<string> {
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
      const result = await service.createConversationWithPrompt(mockUser, 'test prompt')
      expect(result).toBeDefined()
      expect(String(result.owner)).toBe(String(mockUser._id))
      expect(result.visibility).toBe(BaseConversationVisibility.Private)

      const messages = await messageService.findMany({ conversation: result._id })
      expect(messages).toHaveLength(1)
      expect(messages[0].role).toBe('user')
      expect(messages[0].content).toBe('test prompt')
    })

    it('should create conversation with custom visibility', async () => {
      const result = await service.createConversationWithPrompt(
        mockUser,
        'test prompt',
        BaseConversationVisibility.Public,
      )
      expect(result).toBeDefined()
      expect(String(result.owner)).toBe(String(mockUser._id))
      expect(result.visibility).toBe(BaseConversationVisibility.Public)

      const messages = await messageService.findMany({ conversation: result._id })
      expect(messages).toHaveLength(1)
    })

    it('should trigger AI processing', async () => {
      const processPromptWithAISpy = jest.spyOn(service, 'processPromptWithAI')
      const result = await service.createConversationWithPrompt(mockUser, 'test prompt')
      expect(processPromptWithAISpy).toHaveBeenCalledWith(result, 'test prompt')
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

  describe('addAssistantMessage', () => {
    let conversation: TestConversation

    beforeEach(async () => {
      const created = await service.create({
        owner: mockUser._id,
        visibility: BaseConversationVisibility.Private,
        lastMessageAt: new Date(),
      } as TestConversation)
      conversation = created
    })

    it('should create assistant message and update lastMessageAt', async () => {
      const content = 'AI response'
      const beforeDate = new Date()

      const message = await service['addAssistantMessage'](conversation, content)
      expect(message).toBeDefined()
      expect(message.role).toBe('assistant')
      expect(message.content).toBe(content)
      expect(String(message.conversation)).toBe(String(conversation._id))
      expect(String(message.owner)).toBe(String(conversation.owner))

      const updatedConversation = await service.findById(conversation._id)
      expect(updatedConversation.lastMessageAt.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime())
    })
  })
})
