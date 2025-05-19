import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { Inject, Injectable, Logger } from '@nestjs/common'
import Handlebars from 'handlebars'
import { SaaslibOptions } from '../../types/saaslib-options'
import { BaseUser } from '../../user'
import { EmailConfigOptions, EmailTemplate } from '../types/email-config-options'

@Injectable()
export class EmailService {
  protected logger = new Logger(EmailService.name)
  protected emailConfig: EmailConfigOptions
  protected sesClient: SESClient

  constructor(@Inject('SL_OPTIONS') options: SaaslibOptions) {
    this.emailConfig = options.email

    if (process.env.AWS_SES_ACCESS_KEY_ID) {
      this.sesClient = new SESClient({
        region: process.env.AWS_SES_REGION,
        credentials: {
          accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
        },
      })
    }
  }

  async sendWelcomeEmail(user: BaseUser) {
    const template = this.emailConfig.templates?.welcome
    await this.sendTemplateEmail(
      user.email,
      template,
      { user, email: user.email, name: user.name ?? user.email.split('@')[0] },
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
      { user, code, link: `${process.env.VERIFY_EMAIL_URL}/?userId=${user._id}&code=${code}` },
      {
        subject: 'Please verify your email',
        html: `<p>Please verify your email with code: ${code}</p>`,
      },
    )
  }

  async sendPasswordResetEmail(user: BaseUser, code: string) {
    const resetUrl = `${process.env.FRONTEND_ENDPOINT}/complete-password-reset?code=${code}`
    const template = this.emailConfig.templates?.passwordReset
    await this.sendTemplateEmail(
      user.email,
      template,
      { user, code, link: `${process.env.RESET_PASSWORD_EMAIL_URL}/?code=${code}` },
      {
        subject: 'Password Reset Request',
        html: `<p>To reset your password, please click the following link: <a href="${resetUrl}">${resetUrl}</a></p>`,
      },
    )
  }

  async sendNewSubscriptionEmail(user: BaseUser, type: string) {
    const template = this.emailConfig.templates?.newSubscription?.[type]
    if (!template) {
      return
    }
    await this.sendTemplateEmail(
      user.email,
      template,
      { user, code: '', link: '' },
      {
        subject: `Subscription Confirmation - ${type}`,
        html: `<p>Thank you for subscribing to ${type}!</p>`,
      },
    )
  }

  async sendFailedPaymentEmail(user: BaseUser, failureReason: string, amount: string, paymentFixUrl: string) {
    if (!user.email) {
      this.logger.warn('Cannot send failed payment email: no email address provided')
      return
    }

    const template = this.emailConfig.templates?.failedPayment
    await this.sendTemplateEmail(
      user.email,
      template,
      {
        user,
        failureReason,
        amount,
        paymentFixUrl,
      },
      {
        subject: 'Quick action needed for your subscription',
        html: `<p>Hi ${user.name || 'there'},</p>
<p>We noticed that your recent payment of ${amount} couldn't be processed successfully.</p>
<p>Here's what happened: ${failureReason}</p>
<p>To keep your service running smoothly, please update your payment details here: ${paymentFixUrl}</p>
<p>We know things happen - cards expire, limits change. This is just a friendly reminder to update your information so you don't experience any interruption in service.</p>
<p>Need help? Just reply to this email and we'll sort it out together.</p>
<p>Thanks for being a valued customer!</p>`,
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
    let htmlEmail: string
    if (template?.handlebarsHtml) {
      const hbsTemplate = Handlebars.compile(template.handlebarsHtml)
      htmlEmail = hbsTemplate(vars)
    } else {
      htmlEmail = template?.html(vars) ?? defaults.html
    }
    await this.sendEmail([to], template?.subject(vars) ?? defaults.subject, htmlEmail)
  }

  async sendEmail(to: string[], subject: string, body: string, unsubscribeUrl?: string): Promise<void> {
    // If SES is not configured, log email to console instead
    if (!this.sesClient) {
      this.logger.warn('AWS SES not configured, email not sent.')
      console.log(`\n\nTo: ${to.join(', ')}`)
      console.log(`Subject: ${subject}`)
      console.log(body + '\n\n')
      return
    }

    // Format the sender as "Name <email>" if senderName is provided
    const formattedSender = this.emailConfig.senderName
      ? `${this.emailConfig.senderName} <${this.emailConfig.from}>`
      : this.emailConfig.from

    const params = {
      Source: formattedSender,
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

    if (unsubscribeUrl) {
      params['Headers'] = {
        'List-Unsubscribe': {
          Data: `<mailto:${this.emailConfig.from}?subject=unsubscribe>, <${unsubscribeUrl}>`,
        },
        'List-Unsubscribe-Post': {
          Data: 'List-Unsubscribe=One-Click',
        },
      }
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
