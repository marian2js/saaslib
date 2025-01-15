import { BaseUser } from '../../user/models/base-user.model'

export interface EmailTemplate<T> {
  disabled?: boolean
  subject?: (vars: T) => string
  html?: (vars: T) => string
  handlebarsHtml?: string
}

export interface EmailConfigOptions {
  from: string
  templates: {
    welcome?: EmailTemplate<{ user: BaseUser; email: string; name: string }>
    verification?: EmailTemplate<{ user: BaseUser; code: string; link: string }>
    passwordReset?: EmailTemplate<{ user: BaseUser; code: string; link: string }>
    newSubscription?: {
      [key: string]: EmailTemplate<{ user: BaseUser; code: string; link: string }>
    }
  }
  newsletters?: [
    {
      key: string
    },
  ]
}
