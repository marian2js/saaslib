import { JwtModuleOptions } from '@nestjs/jwt'
import { EmailConfigOptions } from '../email/types/email-config-options'

export interface SaaslibOptions {
  jwt: JwtModuleOptions
  email?: EmailConfigOptions
}
