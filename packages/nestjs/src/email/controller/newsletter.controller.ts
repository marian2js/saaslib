import { Controller, NotFoundException, Post, Query, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { BaseUser, BaseUserService, UserGuard } from 'src/user'
import { NewsletterSubscriptionService } from '../services/newsletter-subscription.service'

@Controller('newsletter')
export class NewsletterController {
  constructor(
    private readonly newsletterSubscriptionService: NewsletterSubscriptionService,
    private readonly baseUserService: BaseUserService<BaseUser>,
  ) {}

  @UseGuards(UserGuard)
  @Post('/subscribe')
  async subscribe(@Req() req: Request, @Query('key') key: string) {
    const user = await this.baseUserService.requireUserOnRequest(req)
    await this.newsletterSubscriptionService.subscribe(user, key)
    return { ok: true }
  }

  @UseGuards(UserGuard)
  @Post('/unsubscribe')
  async unsubscribe(@Req() req: Request, @Query('key') key: string) {
    const user = await this.baseUserService.requireUserOnRequest(req)
    await this.newsletterSubscriptionService.unsubscribe(user, key)
    return { ok: true }
  }

  @Post('/subscribe/token')
  async subscribeWithToken(@Query('userId') userId: string, @Query('key') key: string, @Query('token') token: string) {
    const subscription = await this.newsletterSubscriptionService.subscribeWithToken(userId, key, token)
    if (!subscription) {
      throw new NotFoundException('Invalid subscription or token')
    }
    return { ok: true }
  }

  @Post('/unsubscribe/token')
  async unsubscribeWithToken(
    @Query('userId') userId: string,
    @Query('key') key: string,
    @Query('token') token: string,
  ) {
    const subscription = await this.newsletterSubscriptionService.unsubscribeWithToken(userId, key, token)
    if (!subscription) {
      throw new NotFoundException('Invalid subscription or token')
    }
    return { ok: true }
  }
}
