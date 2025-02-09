# SaaS Library

A batteries-included NestJS library ecosystem for building modern SaaS applications with MongoDB and TypeScript. The core package provides a comprehensive set of production-ready backend features, with an optional Next.js integration for type-safe frontend development.

## Table of Contents

- [SaaS Library](#saas-library)
  - [Table of Contents](#table-of-contents)
  - [Why SaaS Library?](#why-saas-library)
  - [Packages](#packages)
    - [@saaslib/nestjs (v0.0.40)](#saaslibnestjs-v0040)
    - [@saaslib/nextjs (v0.0.41)](#saaslibnextjs-v0041)
  - [Quick Start](#quick-start)
  - [Architecture Benefits](#architecture-benefits)
  - [Key Design Principles](#key-design-principles)
  - [Development](#development)
  - [Configuration](#configuration)
  - [License](#license)

## Why SaaS Library?

- **NestJS-First Design**: Built as a native NestJS library with MongoDB integration, providing a robust backend foundation for SaaS applications
- **Optional Frontend Integration**: Complementary Next.js package for type-safe frontend development
- **Library-First Approach**: Import only the features you need, when you need them. No need to maintain unused boilerplate code
- **Progressive Integration**: Start small and add features as your SaaS grows
- **Production-Ready Components**: Each feature is independently tested, maintained, and production-hardened
- **Full TypeScript Support**: End-to-end type safety with generic implementations that adapt to your data models

## Packages

### @saaslib/nestjs (v0.0.40)

The core NestJS library providing comprehensive SaaS backend features:

- **Required Stack**:
  - NestJS ^10.4.1
  - MongoDB with Mongoose ^8.5.4
  - Node.js ≥ 18

- **Core Features**:
  - Base MongoDB entity services with TypeScript generics
  - JWT-based authentication with refresh tokens
  - Social auth with Google and LinkedIn OAuth2
  - Stripe subscriptions with webhook handling
  - Rate limiting and API key management
  - AWS integrations (SES for email, S3 for storage)
  - Role-based access control (RBAC)
  - Newsletter system with templated emails

### @saaslib/nextjs (v0.0.41)

Optional Next.js integration providing type-safe hooks and utilities for interacting with the @saaslib/nestjs backend:

- **Requirements**:
  - Next.js ^15.1.6
  - React ^19.0.0
  - TypeScript ^5.7.3
  - Node.js ≥ 18

- **Features**:
  - Type-safe hooks for all backend features
  - Auth middleware and utilities
  - Form actions for auth flows
  - Subscription management hooks
  - Resource ownership utilities
  - Newsletter management hooks

## Quick Start

SaaS Library can be integrated into your NestJS project gradually. Start with the core backend features and optionally add the Next.js integration as needed:

1. Install the core NestJS package:
```bash
npm i @saaslib/nestjs @nestjs/common@^10.4 @nestjs/core@^10.4
```

2. Initialize the NestJS module with your desired features:
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
      }
    })
  ]
})
export class AppModule {}
```

3. Add more features progressively. For example, to later add email capabilities:
```typescript
SaaslibModule.forRoot({
  jwt: {
    // ...existing jwt config...
  },
  email: {
    from: 'noreply@yourdomain.com',
    templates: {
      welcome: {
        subject: 'Welcome to {{appName}}!',
        template: 'welcome-email.hbs'
      }
    }
  }
})
```

## Architecture Benefits

- **Modular NestJS Architecture**: Built as composable NestJS modules that integrate naturally with your existing backend
- **Mongoose Integration**: Native MongoDB support with optimized patterns and type-safe models
- **Backend Independence**: Use the NestJS package standalone or with any frontend framework
- **Type-Safe Frontend**: Optional Next.js integration providing full-stack type safety
- **Progressive Enhancement**: Start with core authentication and add more backend features as needed
- **Testing Ready**: Includes MongoDB memory server and NestJS testing utilities

## Key Design Principles

- **NestJS Best Practices**: Follows official NestJS patterns and conventions
- **Type Safety**: Full TypeScript support with generics for type-safe services
- **Flexible Architecture**: Base classes and interfaces that can be extended or overridden
- **MongoDB Optimized**: Built specifically for MongoDB with Mongoose, with efficient data patterns
- **Production Security**: Built-in features including:
  - JWT with refresh tokens
  - Rate limiting and request throttling
  - Input validation
  - CSRF protection
  - Secure cookie handling
- **Developer Experience**: 
  - Comprehensive NestJS testing utilities
  - MongoDB memory server for isolated tests
  - Framework-native patterns
  - Optional Next.js type-safety

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Run specific package tests
cd packages/nestjs && npm test
```

## Configuration

Each feature can be configured independently. See the package documentation for detailed options:

- [@saaslib/nestjs configuration](packages/nestjs/README.md#configuration)
- [@saaslib/nextjs configuration](packages/nextjs/README.md#configuration)

## License

MIT License - see LICENSE file for details.