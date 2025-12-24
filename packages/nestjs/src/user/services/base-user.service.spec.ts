import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { testModuleImports } from 'src/tests/test.helpers'
import { BaseUser } from '../models/base-user.model'
import { BaseUserService } from './base-user.service'

describe('BaseUserService', () => {
  let app: INestApplication
  let service: BaseUserService<BaseUser>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BaseUserService],
      imports: testModuleImports,
    }).compile()

    app = module.createNestApplication()
    service = module.get<BaseUserService<BaseUser>>(BaseUserService)

    await app.init()
  })

  afterEach(async () => await app.close())

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create a new user with valid email', () => {
      // const newUser = { email: 'newuser@example.com' }
      // const createdUser = await service.create(newUser)
      // expect(createdUser.email).toEqual(newUser.email)
      // expect(createdUser).toHaveProperty('_id')
    })
  })

  describe('findOne', () => {
    it('should return a single user', async () => {
      const newUser = { email: 'test@example.com' }
      await service.create(newUser)
      const foundUser = await service.findOne({ email: 'test@example.com' })
      expect(foundUser).toBeTruthy()
      expect(foundUser.email).toEqual(newUser.email)
    })

    it('should return null if user does not exist', async () => {
      const foundUser = await service.findOne({ email: 'does-not-exist@example.com' })
      expect(foundUser).toBeNull()
    })
  })

  describe('findMany', () => {
    it('should return an array of users', async () => {
      await service.create({ email: 'user1@example.com' })
      await service.create({ email: 'user2@example.com' })
      const users = await service.findMany({})
      expect(users.length).toEqual(2)
    })
  })

  describe('findAll', () => {
    it('should return all users', async () => {
      await service.create({ email: 'user3@example.com' })
      await service.create({ email: 'user4@example.com' })
      const users = await service.findAll()
      expect(users.length).toEqual(2)
    })
  })

  describe('updateById', () => {
    it('should update a user by ID', async () => {
      const newUser = await service.create({ email: 'updatable@example.com' })
      const updated = await service.updateById(newUser._id, { email: 'updated@example.com' })
      expect(updated.modifiedCount).toEqual(1)
      const updatedUser = await service.findOne({ _id: newUser._id })
      expect(updatedUser.email).toEqual('updated@example.com')
    })
  })

  describe('updateOne', () => {
    it('should update a user by filter', async () => {
      await service.create({ email: 'updatable@example.com' })
      const updated = await service.updateOne({ email: 'updatable@example.com' }, { email: 'updated@example.com' })
      expect(updated.modifiedCount).toEqual(1)
      const updatedUser = await service.findOne({ email: 'updated@example.com' })
      expect(updatedUser.email).toEqual('updated@example.com')
    })
  })

  describe('updateMany', () => {
    // TODO
  })

  describe('deleteById', () => {
    it('should delete a user by ID', async () => {
      const newUser = await service.create({ email: 'delete@example.com' })
      const deletionResult = await service.deleteById(newUser._id)
      expect(deletionResult.deletedCount).toEqual(1)
      const foundUser = await service.findOne({ _id: newUser._id })
      expect(foundUser).toBeNull()
    })
  })

  describe('aggregate', () => {
    it('should perform aggregation and return results', async () => {
      await service.create({ email: 'agg1@example.com' })
      await service.create({ email: 'agg2@example.com' })
      const results = await service.aggregate([{ $match: { email: /agg/ } }])
      expect(results.length).toEqual(2)
    })
  })

  describe('bulkWrite', () => {
    it('should perform bulk operations', async () => {
      const bulkOps = [
        { insertOne: { document: { email: 'bulk1@example.com' } } },
        { insertOne: { document: { email: 'bulk2@example.com' } } },
      ]
      const result = await service.bulkWrite(bulkOps)
      expect(result.insertedCount).toEqual(2)
    })
  })

  describe('getActiveSubscriptions', () => {
    const now = Date.now()
    const hour = 60 * 60 * 1000

    it('should return empty object if no subscriptions', () => {
      const user = { subscriptions: new Map() } as any
      expect(service.getActiveSubscriptions(user)).toEqual({})
    })

    it('should return true for active subscription (future periodEnd)', () => {
      const user = {
        subscriptions: new Map([
          [
            'sub1',
            {
              periodEnd: new Date(now + hour),
              cancelled: false,
            },
          ],
        ]),
      } as any
      expect(service.getActiveSubscriptions(user)).toEqual({ sub1: true })
    })

    it('should return true for active subscription in grace period (< 72h)', () => {
      const user = {
        subscriptions: new Map([
          [
            'sub1',
            {
              periodEnd: new Date(now - 71 * hour), // 71 hours ago
              cancelled: false,
            },
          ],
        ]),
      } as any
      expect(service.getActiveSubscriptions(user)).toEqual({ sub1: true })
    })

    it('should return false for expired subscription (> 72h)', () => {
      const user = {
        subscriptions: new Map([
          [
            'sub1',
            {
              periodEnd: new Date(now - 73 * hour), // 73 hours ago
              cancelled: false,
            },
          ],
        ]),
      } as any
      expect(service.getActiveSubscriptions(user)).toEqual({ sub1: false })
    })

    it('should return false for cancelled subscription (even if future periodEnd)', () => {
      const user = {
        subscriptions: new Map([
          [
            'sub1',
            {
              periodEnd: new Date(now + hour),
              cancelled: true,
            },
          ],
        ]),
      } as any
      expect(service.getActiveSubscriptions(user)).toEqual({ sub1: false })
    })

    it('should return false for cancelled subscription (even if in grace period)', () => {
      const user = {
        subscriptions: new Map([
          [
            'sub1',
            {
              periodEnd: new Date(now - hour),
              cancelled: true,
            },
          ],
        ]),
      } as any
      expect(service.getActiveSubscriptions(user)).toEqual({ sub1: false })
    })
  })
})
