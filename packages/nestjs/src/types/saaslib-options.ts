import { JwtModuleOptions } from '@nestjs/jwt'
import { EmailConfigOptions } from '../email/types/email-config-options'
import { SubscriptionModelOptions } from '../subscriptions/types/subscription-model-options.types'

export interface SaaslibOptions {
  jwt: JwtModuleOptions
  email?: EmailConfigOptions
  subscriptions?: SubscriptionModelOptions
}
