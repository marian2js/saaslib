import {
  BadRequestException,
  Body,
  Delete,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ClassConstructor, plainToClass } from 'class-transformer'
import { validate } from 'class-validator'
import { Request } from 'express'
import { Types } from 'mongoose'
import { BaseUser, BaseUserService, UserGuard } from 'src/user'
import { OwneableModel } from '../models/owneable.model'
import { OwneableEntityService } from '../services/owneable-entity.service'

interface OwneableEntityOptions<T> {
  dtos: {
    create: ClassConstructor<Partial<T>>
    update: ClassConstructor<Partial<T>>
  }
}

@Injectable()
export abstract class OwneableEntityController<T extends OwneableModel, U extends BaseUser> {
  abstract options: OwneableEntityOptions<T>

  constructor(
    protected owneableEntityService: OwneableEntityService<T, U>,
    protected baseUserService: BaseUserService<U>,
  ) {}

  @UseGuards(UserGuard)
  @Get()
  async getMine(@Req() req: Request) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) })
    const docs = await this.owneableEntityService.findManyByOwner(userId)
    const allowedDocs = docs.filter((doc) => this.owneableEntityService.canView(doc, user))
    return {
      items: allowedDocs.map((doc) => this.owneableEntityService.getApiObject(doc, user)),
    }
  }

  @UseGuards(UserGuard)
  @Get('/:id')
  async getOne(@Req() req: Request, @Param('id') id: string) {
    const doc = await this.owneableEntityService.findOne({ _id: new Types.ObjectId(id) })
    if (!doc) {
      throw new NotFoundException()
    }

    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) })
    if (!this.owneableEntityService.canView(doc, user)) {
      throw new NotFoundException()
    }
    return {
      item: this.owneableEntityService.getApiObject(doc, user),
    }
  }

  @UseGuards(UserGuard)
  @Post()
  async create(@Req() req: Request, @Body() entity: T) {
    const entityDto = plainToClass(this.options.dtos.create, entity)
    const errors = await validate(entityDto)
    if (errors.length) {
      throw new BadRequestException(Object.values(errors[0].constraints)[0])
    }

    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) })
    const entityToCreate = await this.beforeCreate({ ...entity, owner: user._id })
    const created = await this.owneableEntityService.create(entityToCreate)
    await this.afterCreate(created)
    return {
      item: this.owneableEntityService.getApiObject(created, user),
    }
  }

  async beforeCreate(entity: T): Promise<T> {
    return entity
  }

  async afterCreate(_entity: T) {
    // no-op
  }

  @UseGuards(UserGuard)
  @Put('/:id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() update: Partial<T>) {
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
      success: true,
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
      success: true,
    }
  }

  async beforeDelete(_userId: string, _id: string) {
    // no-op
  }

  async afterDelete(_userId: string, _id: string) {
    // no-op
  }
}
