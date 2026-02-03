import {
  BadRequestException,
  Get,
  Injectable,
  NotFoundException,
  Post,
  Body,
  Req,
} from '@nestjs/common'
import { Request } from 'express'
import { Types, UpdateQuery } from 'mongoose'
import { BaseUser, BaseUserRole, BaseUserService } from '../../user'
import { BaseSubscriptionService } from '../../subscriptions/services/base-subscription.service'
import { AdminChangeSubscriptionDto, AdminSubscriptionActionDto } from '../dtos/admin-subscription.dto'

@Injectable()
export abstract class BaseAdminSubscriptionsController<U extends BaseUser> {
  constructor(
    private baseSubscriptionService: BaseSubscriptionService<U>,
    private baseUserService: BaseUserService<U>,
  ) {}

  protected async requireAdmin(req: Request) {
    await this.baseUserService.requireRoleOnRequest(req, BaseUserRole.Admin)
  }

  @Get('catalog')
  async catalog(@Req() req: Request) {
    await this.requireAdmin(req)
    return {
      subscriptions: this.baseSubscriptionService.getSubscriptionCatalog(),
    }
  }

  @Post('change')
  async change(@Req() req: Request, @Body() body: AdminChangeSubscriptionDto) {
    await this.requireAdmin(req)

    if (!body.userId || body.userId === 'undefined' || body.userId === 'null') {
      throw new BadRequestException('Invalid user id')
    }

    let user: U | null
    try {
      user = await this.baseUserService.findOne({ _id: body.userId } as any)
    } catch (error) {
      throw new BadRequestException('Invalid user id')
    }
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const type = body.type ?? (body.subscriptionId
      ? this.baseSubscriptionService.getUserSubscription(user, body.subscriptionId).type
      : undefined)

    if (!type) {
      throw new BadRequestException('Missing subscription type or subscriptionId')
    }

    if (!user.subscriptions?.has(type)) {
      throw new NotFoundException('Subscription not found')
    }

    const updateQuery = await this.baseSubscriptionService.changeSubscription(user, type, body.priceId)
    await this.baseUserService.updateOne({ _id: user._id } as any, updateQuery as UpdateQuery<U>)

    return { ok: true }
  }

  @Post('start')
  async start(@Req() req: Request, @Body() body: AdminChangeSubscriptionDto) {
    await this.requireAdmin(req)

    if (!body.userId || body.userId === 'undefined' || body.userId === 'null') {
      throw new BadRequestException('Invalid user id')
    }
    if (!body.type) {
      throw new BadRequestException('Missing subscription type')
    }
    if (!body.priceId) {
      throw new BadRequestException('Missing price id')
    }

    let user: U | null
    try {
      user = await this.baseUserService.findOne({ _id: body.userId } as any)
    } catch (error) {
      throw new BadRequestException('Invalid user id')
    }
    if (!user) {
      throw new NotFoundException('User not found')
    }
    if (user.subscriptions?.has(body.type)) {
      throw new BadRequestException('Subscription already exists for this user')
    }
    if (!this.baseSubscriptionService.hasSubscriptionType(body.type)) {
      throw new NotFoundException('Subscription type not found')
    }
    if (!this.baseSubscriptionService.isPriceAllowed(body.type, body.priceId)) {
      throw new NotFoundException('Price not found')
    }

    const { checkoutSuccessUrl, checkoutCancelUrl } = this.baseSubscriptionService.getCheckoutUrls(body.type)
    const sessionId = await this.baseSubscriptionService.createCheckoutSession(
      user,
      body.type,
      body.priceId,
      checkoutSuccessUrl,
      checkoutCancelUrl,
    )
    return { sessionId }
  }

  @Post('cancel')
  async cancel(@Req() req: Request, @Body() body: AdminSubscriptionActionDto) {
    await this.requireAdmin(req)

    if (!body.userId || body.userId === 'undefined' || body.userId === 'null') {
      throw new BadRequestException('Invalid user id')
    }

    let user: U | null
    try {
      user = await this.baseUserService.findOne({ _id: body.userId } as any)
    } catch (error) {
      throw new BadRequestException('Invalid user id')
    }
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const type = body.type ?? (body.subscriptionId
      ? this.baseSubscriptionService.getUserSubscription(user, body.subscriptionId).type
      : undefined)

    if (!type) {
      throw new BadRequestException('Missing subscription type or subscriptionId')
    }

    const userSubscription = user.subscriptions.get(type)
    if (!userSubscription) {
      throw new NotFoundException('Subscription not found')
    }

    await this.baseSubscriptionService.cancelSubscription(userSubscription)
    await this.baseUserService.updateOne(
      { _id: user._id } as any,
      {
        $set: {
          [`subscriptions.${type}.cancelled`]: true,
          [`subscriptions.${type}.cancelledAt`]: new Date(),
        },
      } as UpdateQuery<U>,
    )

    return { ok: true }
  }

  @Post('resume')
  async resume(@Req() req: Request, @Body() body: AdminSubscriptionActionDto) {
    await this.requireAdmin(req)

    if (!body.userId || body.userId === 'undefined' || body.userId === 'null') {
      throw new BadRequestException('Invalid user id')
    }

    let user: U | null
    try {
      user = await this.baseUserService.findOne({ _id: body.userId } as any)
    } catch (error) {
      throw new BadRequestException('Invalid user id')
    }
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const type = body.type ?? (body.subscriptionId
      ? this.baseSubscriptionService.getUserSubscription(user, body.subscriptionId).type
      : undefined)

    if (!type) {
      throw new BadRequestException('Missing subscription type or subscriptionId')
    }

    const userSubscription = user.subscriptions.get(type)
    if (!userSubscription) {
      throw new NotFoundException('Subscription not found')
    }

    await this.baseSubscriptionService.resumeSubscription(userSubscription)
    await this.baseUserService.updateOne(
      { _id: user._id } as any,
      {
        $unset: {
          [`subscriptions.${type}.cancelled`]: 1,
          [`subscriptions.${type}.cancelledAt`]: 1,
          [`subscriptions.${type}.nextProduct`]: 1,
        },
      } as UpdateQuery<U>,
    )

    return { ok: true }
  }
}
