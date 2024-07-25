import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { Inject, Injectable, Logger } from '@nestjs/common'
import Handlebars from 'handlebars'
import { SaaslibOptions } from 'src/types'
import { BaseUser } from '../../user'
import { EmailConfigOptions, EmailTemplate } from '../types/email-config-options'

@Injectable()
export class EmailService {
  protected logger = new Logger(EmailService.name)
  protected emailConfig: EmailConfigOptions
  protected sesClient: SESClient

  constructor(@Inject('SL_OPTIONS') options: SaaslibOptions) {
    this.emailConfig = options.email

    if (process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY) {
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

input:
The `@angular/common/http` package has been renamed to `@angular/common`.

code:
import { HttpClient } from '@angular/common/http';

@Injectable()
export class MyService {
  constructor(private http: HttpClient) {}
}

output:
import { HttpClient } from '@angular/common';

@Injectable()
export class MyService {
  constructor(private http: HttpClient) {}
}
    if (!template) {
      throw new Error('Welcome email template not found')
    }

    const email = user.email
    if (!email) {
      throw new Error('User email not found')
    }

    const subject = template.subject
    const body = Handlebars.compile(template.body)({ user })

    try {
      await this.sesClient.send(new SendEmailCommand({
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: {
            Data: subject,
          },
          Body: {
            Html: {
              Data: body,
            },
          },
        },
        Source: this.emailConfig.from,
      }))
    } catch (error) {
      if (error.code === 'ERR_UNAVAILABLE') {
        throw new Error('Welcome email sending failed')
      } else {
        throw error
      }
    }
      if (error.code === 'ERR_UNAVAILABLE') {
        this.logger.error('AWS SES is unavailable')
      } else if (error.code === 'E_SMS_UNAVAILABLE') {
        this.logger.error('SMS service is unavailable')
      } else {
        throw error
      }
    }
  }
}
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
    try {
      await this.sendTemplateEmail(
        user.email,
        template,
        { user, code, link: `${process.env.RESET_PASSWORD_EMAIL_URL}/?code=${code}` },
        {
          subject: 'Password Reset Request',
          html: `<p>To reset your password, please click the following link: <a href="${resetUrl}">${resetUrl}</a></p>`,
        },
      )
    } catch (error) {
      if (error.code === 'ERR_UNAVAILABLE') {
        throw new Error('Email service is unavailable')
      }
      throw error
    }
  }

// async sendTemplateEmail<T>(
//   to: string,
//   template: EmailTemplate<T>,
//   vars: T,
  ): Promise<void> {
    try {
      await sendTemplateEmailAsync(to, template, vars);
    } catch (e) {
      if (e.code === 'ERR_UNAVAILABLE') {
        throw new Error('E_SMS_UNAVAILABLE');
      }
      throw e;
    }
  }
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

  async sendEmail(to: string[], subject: string, body: string): Promise<void> {
    // If SES is not configured, log email to console instead
    if (!this.sesClient) {
      this.logger.warn('AWS SES not configured, email not sent.')
      console.log(`\n\nTo: ${to.join(', ')}`)
      console.log(`Subject: ${subject}`)
      console.log(body + '\n\n')
      return
    }

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
