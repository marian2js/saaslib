import { BadRequestException, Get, Injectable, NotFoundException, Param, Patch, Query, Req } from '@nestjs/common'
import { plainToClass } from 'class-transformer'
import { validate } from 'class-validator'
import { Request } from 'express'
import { FilterQuery } from 'mongoose'
import { EmailService } from '../../email/services/email.service'
import { BaseUser, BaseUserRole } from '../../user/models/base-user.model'
import { BaseUserService } from '../../user/services/base-user.service'
import { SecurityUtils } from '../../utils/security.utils'
import { AdminUpdateUserDto, AdminUserListQueryDto } from '../dtos/admin-user.dto'
import { AdminCollectionsService } from '../services/admin-collections.service'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

@Injectable()
export abstract class BaseAdminUsersController<U extends BaseUser> {
  constructor(
    private baseUserService: BaseUserService<U>,
    protected emailService: EmailService,
    protected adminCollectionsService?: AdminCollectionsService,
  ) {}

  protected getAdminApiObject(user: U) {
    return {
      ...this.baseUserService.getApiObject(user),
      blocked: user.blocked,
      emailVerified: user.emailVerified,
      stripeCustomerId: user.stripeCustomerId,
    }
  }

  protected getAdminSubscriptionTypes(): string[] {
    return []
  }

  protected async getAdminCollections(): Promise<Array<{ key: string; label?: string }>> {
    if (this.adminCollectionsService) {
      return this.adminCollectionsService.getCollections()
    }
    return []
  }

  protected async requireAdmin(req: Request) {
    await this.baseUserService.requireRoleOnRequest(req, BaseUserRole.Admin)
  }

  protected parseOrderBy(orderBy?: string): Record<string, 1 | -1> | undefined {
    if (!orderBy) return undefined

    const sort: Record<string, 1 | -1> = {}
    const parts = orderBy.split(',')
    const allowedKeys = new Set(['createdAt', 'email', 'name', 'role'])

    for (const part of parts) {
      const [field, order] = part.split(':')
      if (!allowedKeys.has(field)) continue
      const value = parseInt(order)
      if (value === 1 || value === -1) {
        sort[field === 'createdAt' ? '_id' : field] = value
      }
    }

    return Object.keys(sort).length ? sort : undefined
  }

  @Get()
  async list(@Req() req: Request, @Query() query: AdminUserListQueryDto) {
    await this.requireAdmin(req)

    const limit = Math.min(Number(query.limit ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)
    const page = Math.max(Number(query.page ?? 1), 1)
    const skip = (page - 1) * limit

    const filter: FilterQuery<U> = {}
    if (query.search) {
      const regex = new RegExp(query.search, 'i')
      filter.$or = [{ email: regex }, { name: regex }]
    }
    if (query.role) {
      filter.role = query.role
    }
    if (typeof query.blocked === 'boolean') {
      filter.blocked = query.blocked
    }

    const [items, total] = await Promise.all([
      this.baseUserService.findMany(filter, { limit, skip, sort: this.parseOrderBy(query.orderBy) }),
      this.baseUserService.count(filter),
    ])

    return {
      items: items.map((user) => this.getAdminApiObject(user)),
      subscriptionTypes: this.getAdminSubscriptionTypes(),
      collections: await this.getAdminCollections(),
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    }
  }

  @Get('subscriptions')
  async listSubscriptions(@Req() req: Request, @Query() query: AdminUserListQueryDto) {
    await this.requireAdmin(req)

    const limit = Math.min(Number(query.limit ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)
    const page = Math.max(Number(query.page ?? 1), 1)
    const skip = (page - 1) * limit

    const filter: FilterQuery<U> = {}
    ;(filter as any).$expr = { $gt: [{ $size: { $objectToArray: '$subscriptions' } }, 0] }
    if (query.search) {
      const regex = new RegExp(query.search, 'i')
      filter.$or = [{ email: regex }, { name: regex }]
    }

    const [items, total] = await Promise.all([
      this.baseUserService.findMany(filter, { limit, skip, sort: this.parseOrderBy(query.orderBy) }),
      this.baseUserService.count(filter),
    ])

    return {
      items: items.map((user) => this.getAdminApiObject(user)),
      subscriptionTypes: this.getAdminSubscriptionTypes(),
      collections: await this.getAdminCollections(),
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    }
  }

  @Get(':id')
  async getOne(@Req() req: Request, @Param('id') id: string) {
    await this.requireAdmin(req)
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Invalid user id')
    }
    let user: U | null
    try {
      user = await this.baseUserService.findOne({ _id: id as any })
    } catch {
      throw new BadRequestException('Invalid user id')
    }
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return { user: this.getAdminApiObject(user) }
  }

  @Patch(':id')
  async update(@Req() req: Request, @Param('id') id: string) {
    await this.requireAdmin(req)
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Invalid user id')
    }
    const dto = plainToClass(AdminUpdateUserDto, req.body)
    const errors = await validate(dto)
    if (errors.length) {
      throw new BadRequestException(Object.values(errors[0].constraints)[0])
    }

    let user: U | null
    try {
      user = await this.baseUserService.findOne({ _id: id as any })
    } catch {
      throw new BadRequestException('Invalid user id')
    }
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const requesterId = (req.user as { id: string } | undefined)?.id
    if (requesterId && requesterId === user._id.toString()) {
      if (dto.blocked) {
        throw new BadRequestException('You cannot block your own account')
      }
      if (dto.role && dto.role !== user.role) {
        throw new BadRequestException('You cannot change your own role')
      }
    }

    const update: Record<string, any> = {}
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        update[key] = value
      }
    }

    if (dto.email && dto.email !== user.email) {
      const verificationCode = SecurityUtils.generateRandomString(12)
      const hashedVerificationCode = await SecurityUtils.hashWithBcrypt(verificationCode, 12)
      update.emailVerified = false
      update.emailVerificationCode = hashedVerificationCode
      user.email = dto.email
      await this.emailService.sendVerificationEmail(user, verificationCode)
    }

    if (Object.keys(update).length > 0) {
      await this.baseUserService.updateById(user._id, update)
    }

    const updatedUser = await this.baseUserService.findById(user._id)
    if (!updatedUser) {
      throw new NotFoundException('User not found')
    }
    return { user: this.getAdminApiObject(updatedUser) }
  }
}
