import { Get, UseGuards } from '@nestjs/common'
import { BaseSubscriptionService } from '../subscriptions/services/base-subscription.service'
import { BaseUser } from '../user'
import { AdminRoleGuard } from './guards/admin-role.guard'

@UseGuards(AdminRoleGuard)
export class BaseAdminController<U extends BaseUser> {
  constructor(private readonly subscriptionService: BaseSubscriptionService<U>) {}

  @Get('payments')
  async getPayments() {
    return this.subscriptionService.getMonthlyPaymentTotalsByCountry()
  }
}
