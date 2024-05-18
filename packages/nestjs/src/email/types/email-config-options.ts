export interface EmailTemplate<T> {
  disabled?: boolean
  subject?: (vars: T) => string
  html?: (vars: T) => string
}

export interface EmailConfigOptions {
  from: string
  templates: {
    welcome?: EmailTemplate<{ email: string; name: string }>
    verification?: EmailTemplate<{ code: string }>
    passwordReset?: EmailTemplate<{ code: string }>
  }
}
