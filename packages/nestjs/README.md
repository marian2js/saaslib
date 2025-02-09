# NestJS SaaS Library

A comprehensive NestJS library for building Software-as-a-Service (SaaS) applications with MongoDB.

## Table of Contents

- [NestJS SaaS Library](#nestjs-saas-library)
  - [Table of Contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Features](#features)
    - [Base Entity Services](#base-entity-services)
    - [Authentication](#authentication)
    - [API Management](#api-management)
    - [Subscription System](#subscription-system)
    - [Email System](#email-system)
    - [Resource Ownership](#resource-ownership)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [Module Configuration](#module-configuration)
    - [Environment Variables](#environment-variables)
  - [Extending Base Services](#extending-base-services)
    - [User Service](#user-service)
    - [Auth Service](#auth-service)
    - [API Key Service](#api-key-service)
  - [Resource Ownership Guide](#resource-ownership-guide)
    - [1. Define an Ownable Model](#1-define-an-ownable-model)
    - [2. Create DTOs](#2-create-dtos)
    - [3. Implement Service](#3-implement-service)
    - [4. Create Controller](#4-create-controller)
    - [Available Endpoints](#available-endpoints)
    - [Client-Side Usage](#client-side-usage)
    - [Advanced Features](#advanced-features)
  - [Testing](#testing)
  - [License](#license)

## Requirements

```json
{
  "peerDependencies": {
    "@nestjs/common": "^10.4.1",
    "@nestjs/core": "^10.4.1",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/mongoose": "^10.0.10",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.4.1",
    "@nestjs/schedule": "^4.1.0",
    "mongoose": "^8.5.4"
  }
}
```

## Features

### Base Entity Services
- Abstract MongoDB service with TypeScript generics
- Built-in CRUD operations
- Type-safe query builders
- Pagination support

### Authentication
- JWT-based with refresh tokens
- Cookie-based session handling
- Social authentication:
  - Google OAuth2
  - LinkedIn OAuth2
- Email verification flow
- Password reset functionality

### API Management
- API key generation and validation
- Request throttling and rate limiting
- Custom rate limits per API key
- Unlimited API key support

### Subscription System
- Stripe integration with webhook handling
- Multiple subscription tiers
- Usage-based billing
- Subscription lifecycle management:
  - Upgrades/downgrades
  - Cancellations
  - Renewals
- Automatic invoice generation

### Email System
- AWS SES integration
- Handlebars template support
- Built-in templates for:
  - Welcome emails
  - Verification emails
  - Password reset
  - Subscription notifications
- Newsletter management with unsubscribe handling

### Resource Ownership
- Base classes for owned resources
- Granular permission system
- Resource sharing
- Owner-based queries

## Installation

1. Create a new NestJS application if you don't have one:
```bash
npm i -g @nestjs/cli
nest new my-saas-app
cd my-saas-app
```

2. Install the required dependencies:
```bash
npm i @saaslib/nestjs @nestjs/common@^10.4.1 @nestjs/core@^10.4.1 @nestjs/jwt@^10.2.0 @nestjs/mongoose@^10.0.10 @nestjs/passport@^10.0.3 @nestjs/platform-express@^10.4.1 @nestjs/schedule@^4.1.0 @nestjs/throttler@^6.2.1 reflect-metadata@^0.2.0 stripe@^17.4.0 mongoose@^8.5.4
```

3. Initialize the SaaS boilerplate code:
```bash
npx @saaslib/nestjs init
```

This will create:
- src/user/user.model.ts - Base user model
- src/user/user.service.ts - User service implementation
- src/user/user.controller.ts - User controller implementation
- src/user/auth/auth.service.ts - Authentication service
- src/user/auth/auth.controller.ts - Authentication controller
- .env file with example configurations

4. Create User module (src/user/user.module.ts):
```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.model';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
```

5. Create Auth module (src/user/auth/auth.module.ts):
```typescript
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user.module';

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
```

6. Update your app.module.ts:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SaaslibModule } from '@saaslib/nestjs';
import { UserModule } from './user/user.module';
import { AuthModule } from './user/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_URI),
    SaaslibModule.forRoot({
      jwt: {
        secret: process.env.JWT_SECRET,
      }
    }),
    UserModule,
    AuthModule,
  ]
})
export class AppModule {}
```

7. Update the environment variables in your .env file with at least these required values:
```
MONGO_URI=mongodb://localhost/my-saas-app
JWT_SECRET=your-secret-key-min-32-chars
```

8. Start your application:
```bash
npm run start:dev
```

Your API will now be running with these endpoints available:
- POST /auth/sign-up - Create a new user account
- POST /auth/sign-in - Sign in with email/password
- GET /users/me - Get current user profile

## Configuration

### Module Configuration

```typescript
import { SaaslibModule } from '@saaslib/nestjs';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_URI),
    SaaslibModule.forRoot({
      jwt: {
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '1h' }
      },
      email: {
        from: 'noreply@example.com',
        templates: {
          welcome: {
            subject: 'Welcome to our platform!',
            html: '<p>Welcome {{name}}!</p>'
          },
          verification: {
            subject: 'Verify your email',
            html: '<p>Click here to verify: {{link}}</p>'
          }
        },
        newsletters: [
          { key: 'updates', name: 'Product Updates' }
        ]
      },
      subscriptions: {
        basic: {
          products: [
            {
              id: 'prod_basic',
              prices: ['price_basic_monthly', 'price_basic_yearly']
            }
          ],
          billingReturnUrl: 'http://localhost:3000/billing'
        },
        pro: {
          products: [
            {
              id: 'prod_pro',
              prices: ['price_pro_monthly', 'price_pro_yearly']
            }
          ],
          billingReturnUrl: 'http://localhost:3000/billing'
        }
      }
    })
  ]
})
export class AppModule {}
```

### Environment Variables

```env
# Server Configuration
PORT=8000
FRONTEND_ENDPOINT=http://localhost:3000
BACKEND_ENDPOINT=http://localhost:8000

# Database
MONGO_URI=mongodb://localhost/app

# Authentication
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-token-secret

# Email Endpoints
VERIFY_EMAIL_URL=http://localhost:3000/auth/verify-email
RESET_PASSWORD_EMAIL_URL=http://localhost:3000/auth/reset-password
UNSUBSCRIBE_EMAIL_URL=http://localhost:3000/unsubscribe

# OAuth Configuration
COMPLETE_OAUTH_URL=http://localhost:3000/auth/complete
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Stripe Configuration
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS Configuration
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=your-ses-key
AWS_SES_SECRET_ACCESS_KEY=your-ses-secret

AWS_S3_ENDPOINT=https://s3.amazonaws.com
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=your-s3-key
AWS_S3_SECRET_ACCESS_KEY=your-s3-secret
```

## Extending Base Services

### User Service
```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BaseUserService } from '@saaslib/nestjs';
import { Model } from 'mongoose';
import { User } from './user.model';

@Injectable()
export class UserService extends BaseUserService<User> {
  constructor(@InjectModel(User.name) userModel: Model<User>) {
    super(userModel);
  }
}
```

### Auth Service
```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BaseAuthService, EmailService, UserProviderService } from '@saaslib/nestjs';
import { UserService } from './user.service';

@Injectable()
export class AuthService extends BaseAuthService {
  constructor(
    protected userService: UserService,
    protected jwtService: JwtService,
    protected emailService: EmailService,
    protected userProviderService: UserProviderService,
  ) {
    super(userService, jwtService, emailService, userProviderService);
  }
}
```

### API Key Service
```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BaseApiKeyService } from '@saaslib/nestjs';
import { Model } from 'mongoose';
import { ApiKey } from './apikey.model';
import { User } from './user.model';

@Injectable()
export class ApiKeyService extends BaseApiKeyService<ApiKey, User> {
  constructor(@InjectModel(ApiKey.name) apiKeyModel: Model<ApiKey>) {
    super(apiKeyModel);
  }
}
```

## Resource Ownership Guide

The library provides a robust system for managing user-owned resources through the Ownable pattern.

### 1. Define an Ownable Model

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { OwneableModel } from '@saaslib/nestjs';

@Schema()
export class Project extends OwneableModel {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
```

### 2. Create DTOs

```typescript
import { IsString, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
```

### 3. Implement Service

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OwneableEntityService } from '@saaslib/nestjs';
import { Project } from './project.model';
import { User } from '../user/user.model';

@Injectable()
export class ProjectService extends OwneableEntityService<Project, User> {
  constructor(@InjectModel(Project.name) projectModel: Model<Project>) {
    super(projectModel);
  }

  // Required: Define how your entity appears in API responses
  getApiObject(entity: Project, owner: User | null) {
    return {
      id: entity._id.toString(),
      name: entity.name,
      description: entity.description,
      // Add custom fields based on owner's permissions
      isOwner: owner?._id.equals(entity.owner),
    };
  }

  // Optional: Override permission methods
  canView(entity: Project, user: User | null) {
    // Default checks owner equality
    return super.canView(entity, user);
  }

  canEdit(entity: Project, user: User) {
    // Custom edit permissions
    return entity.owner.equals(user._id) || user.role === 'admin';
  }

  maxEntities(owner: User) {
    // Limit number of entities per user
    return owner.plan === 'free' ? 3 : Infinity;
  }
}
```

### 4. Create Controller

```typescript
import { Controller } from '@nestjs/common';
import { OwneableEntityController } from '@saaslib/nestjs';
import { Project } from './project.model';
import { User } from '../user/user.model';
import { ProjectService } from './project.service';
import { UserService } from '../user/user.service';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';

@Controller('projects')
export class ProjectController extends OwneableEntityController<Project, User> {
  options = {
    dtos: {
      create: CreateProjectDto,
      update: UpdateProjectDto,
    },
  };

  constructor(
    protected projectService: ProjectService,
    protected userService: UserService,
  ) {
    super(projectService, userService);
  }

  // Optional: Add hooks for custom logic
  async beforeCreate(entity: Project): Promise<Project> {
    // Add custom fields before creation
    return {
      ...entity,
      createdAt: new Date(),
    };
  }

  async afterCreate(entity: Project) {
    // Perform actions after creation
    await this.notificationService.notify(entity.owner, 'Project created');
  }
}
```

### Available Endpoints

The OwneableEntityController automatically provides these REST endpoints:

```typescript
@Get()                    // Get all owned items
@Get('/:id')             // Get single item (with optional auth)
@Post()                  // Create new item
@Patch('/:id')           // Update item
@Delete('/:id')          // Delete item
```

### Client-Side Usage

Use the provided Next.js hooks to interact with ownable resources:

```typescript
import { 
  useFetchOwnableItems,
  useCreateOwneableItem,
  useUpdateOwnableItem,
  useDeleteOwnableItem
} from '@saaslib/nextjs';

// In your React component
const { data: projects } = useFetchOwnableItems<Project>('projects');
const { createItem } = useCreateOwneableItem<CreateProjectDto, Project>('projects');
const { updateItem } = useUpdateOwnableItem<UpdateProjectDto>('projects');
const { deleteItem } = useDeleteOwnableItem('projects');
```

### Advanced Features

- **Automatic Owner Assignment**: Resources are automatically linked to the authenticated user
- **Permission System**: Built-in methods for view/edit/delete permissions
- **Resource Limits**: Ability to set maximum number of resources per user
- **Type Safety**: Full TypeScript support with generics
- **Validation**: Automatic DTO validation using class-validator
- **Hooks**: Lifecycle hooks for custom logic (beforeCreate, afterCreate, etc.)

## Testing

The library includes a MongoDB memory server for testing. Example test setup:

```typescript
import { testModuleImports } from '@saaslib/nestjs/test';

describe('YourService', () => {
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ...testModuleImports,
        // Your additional imports
      ],
      providers: [YourService],
    }).compile();
  });
});
```

Run tests:
```bash
npm test          # Run unit tests
npm run test:e2e  # Run end-to-end tests
```

## License

MIT License - see LICENSE file for details.
