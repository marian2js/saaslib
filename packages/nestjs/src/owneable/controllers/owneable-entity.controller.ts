import {
  BadRequestException,
  Body,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { plainToClass } from 'class-transformer'
import { validate } from 'class-validator'
import { Request } from 'express'
import { Types } from 'mongoose'
import { isPromise } from 'util/types'
import { LimitExceededException } from '../../exceptions/limit-exceeded.exception'
import { BaseUser, BaseUserRole, BaseUserService, OptionalUserGuard, UserGuard } from '../../user'
import { OwneableModel } from '../models/owneable.model'
import { OwneableEntityService } from '../services/owneable-entity.service'
import { ListQueryDto } from '../types/list-query.dto'
import { OwneableEntityOptions } from '../types/owneable.types'

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

@Injectable()
export abstract class OwneableEntityController<T extends OwneableModel, U extends BaseUser> {
  abstract options: OwneableEntityOptions<T>

  constructor(
    protected owneableEntityService: OwneableEntityService<T, U>,
    protected baseUserService: BaseUserService<U>,
  ) {}

  @UseGuards(UserGuard)
  @Get()
  async getMine(@Req() req: Request, @Query() query: ListQueryDto, @Query('admin') useAdmin?: boolean) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) })

    if (useAdmin && user.role !== BaseUserRole.Admin) {
      throw new ForbiddenException()
    }

    const defaultPageSize = this.options.pageSize?.default ?? DEFAULT_PAGE_SIZE
    const maxPageSize = this.options.pageSize?.max ?? MAX_PAGE_SIZE
    const limit = Math.min(query.limit ?? defaultPageSize, maxPageSize)
    const skip = query.page ? (query.page - 1) * limit : undefined

    const docs = await this.owneableEntityService.findManyByOwner(
      userId,
      {},
      {
        limit,
        skip,
        sort: this.parseOrderBy(query.orderBy),
        exceptOwner: !!useAdmin,
      },
    )
    const allowedDocs = docs.filter((doc) => this.owneableEntityService.canView(doc, user))
    const items = await Promise.all(
      allowedDocs.map(async (doc) => {
        const apiObject = this.owneableEntityService.getApiObjectForList(doc, user)
        return apiObject instanceof Promise ? await apiObject : apiObject
      }),
    )

    return {
      items,
      limit,
      page: query.page,
    }
  }

  @UseGuards(OptionalUserGuard)
  @Get('/:id')
  async getOne(@Req() req: Request, @Param('id') id: string) {
    const doc = await this.owneableEntityService.findOne({ _id: new Types.ObjectId(id) })
    if (!doc) {
      throw new NotFoundException()
    }

    const userId = (req.user as { id: string })?.id
    const user = userId ? await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) }) : null
    if (!this.owneableEntityService.canView(doc, user)) {
      throw new NotFoundException()
    }
    const apiRes = this.owneableEntityService.getApiObject(doc, user)
    return {
      item: isPromise(apiRes) ? await apiRes : apiRes,
    }
  }

  @UseGuards(UserGuard)
  @Post()
  async create(@Req() req: Request, @Body() entity: T) {
    if (!this.options.dtos.create) {
      throw new NotFoundException()
    }
    const entityDto = plainToClass(this.options.dtos.create, entity)
    const errors = await validate(entityDto)
    if (errors.length) {
      throw new BadRequestException(Object.values(errors[0].constraints)[0])
    }

    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) })
    if (!this.owneableEntityService.canCreate(entity, user)) {
      throw new ForbiddenException()
    }
    const maxEntities = this.owneableEntityService.maxEntities(user)
    if (maxEntities === 0) {
      throw new LimitExceededException()
    } else if (maxEntities !== Infinity) {
      const count = await this.owneableEntityService.count({ owner: user._id })
      if (count >= maxEntities) {
        throw new LimitExceededException()
      }
    }

    const entityToCreate = await this.beforeCreate({ ...entity, owner: user._id })
    const created = await this.owneableEntityService.create(entityToCreate)
    await this.afterCreate(created, entityToCreate)
    const apiRes = this.owneableEntityService.getApiObject(created, user)
    return {
      item: isPromise(apiRes) ? await apiRes : apiRes,
    }
  }

  async beforeCreate(entity: T): Promise<T> {
    return entity
  }

  async afterCreate(_entity: T, _original: T) {
    // no-op
  }

  @UseGuards(UserGuard)
  @Patch('/:id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() update: Partial<T>) {
    if (!this.options.dtos.update) {
      throw new NotFoundException()
    }
    const updateDto = plainToClass(this.options.dtos.update, update)
    const errors = await validate(updateDto)
    if (errors.length) {
      throw new BadRequestException(Object.values(errors[0].constraints)[0])
    }

    const existing = await this.owneableEntityService.findOne({ _id: new Types.ObjectId(id) })
    if (!existing) {
      throw new NotFoundException()
    }
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) })
    if (!this.owneableEntityService.canEdit(existing, user)) {
      throw new NotFoundException()
    }

    const entityToUpdate = await this.beforeUpdate(existing, update)
    await this.owneableEntityService.updateOne({ _id: new Types.ObjectId(id) }, entityToUpdate)
    await this.afterUpdate(existing, entityToUpdate)
    return {
      ok: true,
    }
  }

  async beforeUpdate(_existing: T, update: Partial<T>): Promise<Partial<T>> {
    return update
  }

  async afterUpdate(_existing: T, _update: Partial<T>) {
    // no-op
  }

  @UseGuards(UserGuard)
  @Delete('/:id')
  async delete(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) })
    const entity = await this.owneableEntityService.findOne({ _id: new Types.ObjectId(id) })
    if (!entity) {
      throw new NotFoundException()
    }
    if (!this.owneableEntityService.canDelete(entity, user)) {
      throw new NotFoundException()
    }
    await this.beforeDelete(userId, id)
    await this.owneableEntityService.deleteOne({ _id: entity._id })
    await this.afterDelete(userId, id)
    return {
      ok: true,
    }
  }

  async beforeDelete(_userId: string, _id: string) {
    // no-op
  }

  async afterDelete(_userId: string, _id: string) {
    // no-op
  }

  protected parseOrderBy(orderBy?: string): Record<string, 1 | -1> | undefined {
    if (!orderBy) return undefined

    const sort: Record<string, 1 | -1> = {}
    const parts = orderBy.split(',')

    for (const part of parts) {
      const [field, order] = part.split(':')
      sort[field] = parseInt(order) as 1 | -1
    }

    return sort
  }
}
