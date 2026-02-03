# @saaslib/nestjs

A NestJS-first SaaS backend toolkit for MongoDB apps. It provides base models, services, and controllers for common SaaS features so you can extend them in your application without re-writing boilerplate.

## Table of contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Bootstrap (init script)](#bootstrap-init-script)
- [Module setup](#module-setup)
- [Environment variables](#environment-variables)
- [Feature overview](#feature-overview)
- [Extending base classes](#extending-base-classes)
- [Testing](#testing)
- [License](#license)

## Requirements

- Node.js >= 18
- MongoDB
- Peer dependencies (install in your app):
  - `@nestjs/common` `^11.1.10`
  - `@nestjs/core` `^11.1.10`
  - `@nestjs/jwt` `^11.0.2`
  - `@nestjs/mongoose` `^11.0.4`
  - `@nestjs/passport` `^11.0.5`
  - `@nestjs/platform-express` `^11.1.10`
  - `@nestjs/schedule` `^6.1.0`
  - `@nestjs/throttler` `^6.5.0`
  - `reflect-metadata` `^0.2.2`
  - `stripe` `^20.1.0`

## Installation

```bash
npm i @saaslib/nestjs @nestjs/common@^11.1.10 @nestjs/core@^11.1.10 @nestjs/jwt@^11.0.2 @nestjs/mongoose@^11.0.4 @nestjs/passport@^11.0.5 @nestjs/platform-express@^11.1.10 @nestjs/schedule@^6.1.0 @nestjs/throttler@^6.5.0 reflect-metadata@^0.2.2 stripe@^20.1.0
```

## Bootstrap (init script)

Generate starter user/auth files and append example env vars:

```bash
npx @saaslib/nestjs init
```

This creates `src/user/*` boilerplate (user model/service/controller + auth service/controller) and appends the package's `.env.example` to your local `.env`.

## Module setup

`SaaslibModule` configures:

- JWT module
- Mongoose model for `UserProvider`
- Schedule/Discovery modules
- Global `ValidationPipe` + `HttpExceptionFilter`
- Cookie parser middleware

Basic setup:

```ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { SaaslibModule } from '@saaslib/nestjs'

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_URI),
    SaaslibModule.forRoot({
      jwt: {
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '1h' },
      },
      email: {
        from: 'noreply@example.com',
        senderName: 'Example',
        templates: {
          welcome: {
            subject: ({ name }) => `Welcome ${name}`,
            html: ({ name }) => `<p>Hello ${name}</p>`,
          },
        },
        newsletters: [{ key: 'product-updates' }],
      },
      subscriptions: {
        pro: {
          products: [
            {
              id: 'prod_123',
              prices: ['price_monthly', 'price_yearly'],
            },
          ],
          checkoutSuccessUrl: 'http://localhost:3000/billing/success',
          checkoutCancelUrl: 'http://localhost:3000/billing/cancel',
          billingReturnUrl: 'http://localhost:3000/billing',
        },
      },
    }),
  ],
})
export class AppModule {}
```

## Environment variables

These align with `.env.example` in this package:

```env
PORT=8000
FRONTEND_ENDPOINT=http://localhost:3000
BACKEND_ENDPOINT=http://localhost:8000

MONGO_URI=mongodb://localhost/app

# Min 32 characters
JWT_SECRET=secretsecretsecretsecretsecretsecret

VERIFY_EMAIL_URL=http://localhost:3000/auth/verify-email
RESET_PASSWORD_EMAIL_URL=http://localhost:3000/auth/reset-password
UNSUBSCRIBE_EMAIL_URL=http://localhost:3000/unsubscribe

# OAuth
COMPLETE_OAUTH_URL=http://localhost:3000/auth/complete
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Stripe
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AWS SES (For sending emails)
AWS_SES_REGION=
AWS_SES_ACCESS_KEY_ID=
AWS_SES_SECRET_ACCESS_KEY=

# AWS S3 (For storage service)
AWS_S3_ENDPOINT=
AWS_S3_REGION=
AWS_S3_ACCESS_KEY_ID=
AWS_S3_SECRET_ACCESS_KEY=
```

## Feature overview

### Authentication + users

- `BaseUser`, `BaseUserService`, `BaseUserController`
- `BaseAuthService`, `BaseAuthController` (email/password + refresh tokens)
- OAuth with Google + LinkedIn (Passport strategies)
- Email verification + password reset flows

Endpoints created by `BaseAuthController`:

- `POST /auth/signin`
- `POST /auth/signup`
- `POST /auth/signout`
- `POST /auth/refresh`
- `POST /auth/verify-oauth`
- `POST /auth/verify-email`
- `POST /auth/request-password-reset`
- `POST /auth/reset-password`
- `GET /auth/google` + `/auth/google/callback`
- `GET /auth/linkedin` + `/auth/linkedin/callback`

`BaseUserController` provides:

- `GET /users/me`
- `PATCH /users/me`
- `DELETE /users/me/avatar`

### Owneable resources

Use the `OwneableModel`, `OwneableEntityService`, and `OwneableEntityController` to build user-owned resources.
Note the project uses the spelling **owneable** in code.

Key behaviors:

- Automatic owner assignment on create
- Optional admin listing (`?admin=true`)
- Pagination + ordering via `page`, `limit`, `orderBy=field:1`
- `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, `afterDelete` hooks

### Conversations + messages

The conversation module provides base models/controllers for conversational UX:

- `BaseConversation*` for conversations
- `BaseMessage*` for message persistence
- `BaseSharedConversation*` for shareable conversations (slug or id)
- Optional streaming (`?stream=true`) and async message creation (`?async=true`)

### Subscriptions (Stripe)

Base services + controller for Stripe subscriptions:

- Checkout sessions, plan changes, cancel/resume, billing portal links
- Webhook handling via `/subscriptions/stripe-webhook`
- Email hooks for new subscriptions and failed payments (if configured)

Note: the Stripe webhook expects a raw request body. Configure your NestJS app to pass raw body buffers for the webhook route.

### API keys + rate limiting

- `BaseApiKeyService` + `BaseApiKeyController`
- `BaseApiThrottlerGuard` to integrate with `@nestjs/throttler`

### Email + newsletter

- `EmailService` with SES support + templates (`subject`/`html` functions or `handlebarsHtml`)
- Newsletter subscription endpoints with token or auth flows

### Storage

`StorageService` wraps S3-compatible storage with signed uploads.

### Admin guard

`BaseAdminRoleGuard` to restrict routes to `BaseUserRole.Admin`.

### Admin controllers

Base controllers to expose admin-only endpoints (users + subscriptions):

- `BaseAdminUsersController` (`/admin/users`)
- `BaseAdminSubscriptionsController` (`/admin/subscriptions`)

These controllers enforce admin access via `BaseUserRole.Admin` and are designed to be extended in your app.
Attach your own guard (for example a custom admin guard or API key guard) on the subclass.

## Extending base classes

### User service

```ts
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { BaseUserService } from '@saaslib/nestjs'
import { Model } from 'mongoose'
import { User } from './user.model'

@Injectable()
export class UserService extends BaseUserService<User> {
  constructor(@InjectModel(User.name) userModel: Model<User>) {
    super(userModel)
  }
}
```

### Auth service

```ts
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { BaseAuthService, EmailService, UserProviderService } from '@saaslib/nestjs'
import { UserService } from './user.service'

@Injectable()
export class AuthService extends BaseAuthService {
  constructor(
    protected userService: UserService,
    protected jwtService: JwtService,
    protected emailService: EmailService,
    protected userProviderService: UserProviderService,
  ) {
    super(userService, jwtService, emailService, userProviderService)
  }
}
```

### Owneable entity service + controller

```ts
import { Injectable, Controller } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { OwneableEntityService, OwneableEntityController } from '@saaslib/nestjs'
import { Project } from './project.model'
import { User } from '../user/user.model'

@Injectable()
export class ProjectService extends OwneableEntityService<Project, User> {
  constructor(@InjectModel(Project.name) projectModel: Model<Project>) {
    super(projectModel)
  }

  getApiObject(entity: Project, owner: User | null) {
    return {
      id: entity._id.toString(),
      name: entity.name,
      isOwner: !!owner && owner._id.equals(entity.owner),
    }
  }
}

@Controller('projects')
export class ProjectController extends OwneableEntityController<Project, User> {
  options = {
    dtos: {
      create: CreateProjectDto,
      update: UpdateProjectDto,
    },
  }

  constructor(projectService: ProjectService, userService: UserService) {
    super(projectService, userService)
  }
}
```

## Testing

Use the test helpers with MongoDB memory server:

```ts
import { testModuleImports } from '@saaslib/nestjs/test'

describe('MyService', () => {
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [...testModuleImports],
      providers: [MyService],
    }).compile()
  })
})
```

## License

MIT License - see `LICENSE` for details.
