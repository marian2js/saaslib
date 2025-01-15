import { Body, Controller, NotFoundException, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { BaseUser, BaseUserService, UserGuard } from '../../user'
import { NewsletterSubscription } from '../model/newsletter-subscription.model'
import { BaseNewsletterSubscriptionService } from '../services/base-newsletter-subscription.service'

@Controller('newsletter')
export class BaseNewsletterController<T extends NewsletterSubscription> {
  constructor(
    protected readonly baseNewsletterSubscriptionService: BaseNewsletterSubscriptionService<T>,
    protected readonly baseUserService: BaseUserService<BaseUser>,
  ) {}

  @UseGuards(UserGuard)
  @Post('/subscribe')
  async subscribe(@Req() req: Request, @Body('key') key: string) {
    const user = await this.baseUserService.requireUserOnRequest(req)
    await this.baseNewsletterSubscriptionService.subscribe(user, key)
    return { ok: true }
  }

  @UseGuards(UserGuard)
  @Post('/unsubscribe')
  async unsubscribe(@Req() req: Request, @Body('key') key: string) {
    const user = await this.baseUserService.requireUserOnRequest(req)
    await this.baseNewsletterSubscriptionService.unsubscribe(user, key)
    return { ok: true }
  }

  @Post('/subscribe/token')
  async subscribeWithToken(@Body('userId') userId: string, @Body('key') key: string, @Body('token') token: string) {
    const subscription = await this.baseNewsletterSubscriptionService.subscribeWithToken(userId, key, token)
    if (!subscription) {
      throw new NotFoundException('Invalid subscription or token')
    }
    return { ok: true }
  }

  @Post('/unsubscribe/token')
  async unsubscribeWithToken(@Body('userId') userId: string, @Body('key') key: string, @Body('token') token: string) {
    const subscription = await this.baseNewsletterSubscriptionService.unsubscribeWithToken(userId, key, token)
    if (!subscription) {
      throw new NotFoundException('Invalid subscription or token')
    }
    return { ok: true }
  }
}
