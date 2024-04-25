import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { BaseUser } from 'src/main'
import { NestjsSaasOptions } from 'src/types/nestjs-saas-options'
import { EmailConfigOptions, EmailTemplate } from '../types/email-config-options'

@Injectable()
export class EmailService {
  protected logger = new Logger(EmailService.name)
  protected emailConfig: EmailConfigOptions
  protected sesClient: SESClient

  constructor(@Inject('NS_OPTIONS') options: NestjsSaasOptions) {
    this.emailConfig = options.email

    this.sesClient = new SESClient({
      region: process.env.AWS_SES_REGION,
      credentials: {
        accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
      },
    })
  }

  async sendWelcomeEmail(user: BaseUser) {
    const template = this.emailConfig.templates?.welcome
    await this.sendTemplateEmail(
      user.email,
      template,
      { email: user.email, name: user.name ?? user.email.split('@')[0] },
      {
        subject: 'Welcome',
        html: `<p>Welcome, ${user.name}!</p>`,
      },
    )
  }

  async sendVerificationEmail(user: BaseUser, code: string) {
    const template = this.emailConfig.templates?.verification
    await this.sendTemplateEmail(
      user.email,
      template,
      { code },
      {
        subject: 'Please verify your email',
        html: `<p>Please verify your email with code: ${code}</p>`,
      },
    )
  }

  async sendTemplateEmail<T>(
    to: string,
    template: EmailTemplate<T>,
    vars: T,
    defaults: { subject: string; html: string },
  ) {
    if (template?.disabled) {
      return
    }
    await this.sendEmail([to], template?.subject(vars) ?? defaults.subject, template?.html(vars) ?? defaults.html)
  }

  async sendEmail(to: string[], subject: string, body: string): Promise<void> {
    const params = {
      Source: this.emailConfig.from,
      Destination: {
        ToAddresses: to,
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: body,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject,
        },
      },
    }

    try {
      const sendEmailCommand = new SendEmailCommand(params)
      const response = await this.sesClient.send(sendEmailCommand)
      this.logger.log(`Email ${response.MessageId} sent to ${to}`)
    } catch (error) {
      this.logger.error('Failed to send email:', error)
      throw new Error('Failed to send email')
    }
  }
}
