import { INestApplication, Injectable } from '@nestjs/common'
import { getModelToken, InjectModel, MongooseModule, SchemaFactory } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Model, Types } from 'mongoose'
import { testModuleImports } from '../tests/test.helpers'
import { BaseUser } from '../user'
import { BaseConversation, BaseConversationVisibility } from './base-conversation.model'
import { BaseConversationService } from './base-conversation.service'
import { BaseMessage, BaseMessageSchema } from './base-message.model'

class TestMessage extends BaseMessage {
  _id: Types.ObjectId
}

class TestConversation extends BaseConversation<TestMessage> {
  _id: Types.ObjectId
}

const TestConversationSchema = SchemaFactory.createForClass(TestConversation)
const TestMessageSchema = BaseMessageSchema

@Injectable()
class TestConversationService extends BaseConversationService<
  TestMessage,
  BaseConversationVisibility,
  TestConversation,
  BaseUser
> {
  constructor(
    @InjectModel(TestConversation.name) conversationModel: Model<TestConversation>,
    @InjectModel(TestMessage.name) messageModel: Model<TestMessage>,
  ) {
    super(conversationModel, messageModel)
  }

  protected async sendPromptToAI(): Promise<void> {
    // Mock implementation
  }
}

describe('BaseConversationService', () => {
  let app: INestApplication
  let service: TestConversationService
  let messageModel: Model<TestMessage>

  const mockUser: BaseUser = {
    _id: new Types.ObjectId(),
  } as BaseUser

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ...testModuleImports,
        MongooseModule.forFeature([
          { name: TestConversation.name, schema: TestConversationSchema },
          { name: TestMessage.name, schema: TestMessageSchema },
        ]),
      ],
      providers: [TestConversationService],
    }).compile()

    app = module.createNestApplication()
    await app.init()

    service = module.get<TestConversationService>(TestConversationService)
    messageModel = module.get<Model<TestMessage>>(getModelToken(TestMessage.name))
  })

  afterEach(async () => await app.close())

  describe('createConversationWithPrompt', () => {
    it('should create a conversation with initial message', async () => {
      const result = await service.createConversationWithPrompt(mockUser, 'test prompt')

      expect(result).toBeDefined()
      expect(result.owner.toString()).toBe(mockUser._id.toString())
      expect(result.visibility).toBe(BaseConversationVisibility.Private)
      expect(result.messages).toHaveLength(1)

      const message = await messageModel.findById(result.messages[0])
      expect(message).toBeDefined()
      expect(message.role).toBe('user')
      expect(message.content).toBe('test prompt')
      expect(message.conversation.toString()).toBe(result._id.toString())
    })

    it('should create a public conversation when visibility is set to public', async () => {
      const result = await service.createConversationWithPrompt(
        mockUser,
        'test prompt',
        BaseConversationVisibility.Public,
      )

      expect(result.visibility).toBe(BaseConversationVisibility.Public)
      expect(result.messages).toHaveLength(1)
    })

    it('should handle AI prompt error gracefully', async () => {
      jest.spyOn(service as any, 'sendPromptToAI').mockRejectedValue(new Error('AI Error'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await service.createConversationWithPrompt(mockUser, 'test prompt')

      expect(result).toBeDefined()
      expect(result.messages).toHaveLength(1)

      await new Promise(process.nextTick)
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('canView', () => {
    let conversation: TestConversation

    beforeEach(async () => {
      conversation = await service.create({
        owner: mockUser._id,
        visibility: BaseConversationVisibility.Private,
      } as TestConversation)
    })

    it('should allow owner to view private conversation', () => {
      expect(service.canView(conversation, mockUser)).toBe(true)
    })

    it('should allow anyone to view public conversation', async () => {
      await service.updateById(conversation._id, { visibility: BaseConversationVisibility.Public })
      const publicConversation = await service.findById(conversation._id)

      const otherUser = { _id: new Types.ObjectId() } as BaseUser
      expect(service.canView(publicConversation, otherUser)).toBe(true)
    })

    it('should not allow non-owner to view private conversation', () => {
      const otherUser = { _id: new Types.ObjectId() } as BaseUser
      expect(service.canView(conversation, otherUser)).toBe(false)
    })
  })
})
