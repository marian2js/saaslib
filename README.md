# SaaSlib

A monorepo for SaaSlib: a NestJS backend toolkit with an optional Next.js client package for type-safe frontend access.

## Packages

| Package | Description | Current version |
| --- | --- | --- |
| `@saaslib/nestjs` | Core NestJS + MongoDB building blocks for SaaS backends | `0.1.2` |
| `@saaslib/nextjs` | Next.js hooks, server utilities, and middleware that pair with `@saaslib/nestjs` | `0.1.5` |

## Requirements

- Node.js >= 18
- MongoDB (for `@saaslib/nestjs`)
- NestJS 11.x + Mongoose 8.x (see `packages/nestjs/README.md`)
- Next.js 16.x + React 19.x (see `packages/nextjs/README.md`)

## Quick start (NestJS)

1. Install the backend package and peer deps:

```bash
npm i @saaslib/nestjs @nestjs/common@^11.1.10 @nestjs/core@^11.1.10 @nestjs/jwt@^11.0.2 @nestjs/mongoose@^11.0.4 @nestjs/passport@^11.0.5 @nestjs/platform-express@^11.1.10 @nestjs/schedule@^6.1.0 @nestjs/throttler@^6.5.0 reflect-metadata@^0.2.2 stripe@^20.1.0
```

2. (Optional) scaffold base user/auth files and a local `.env`:

```bash
npx @saaslib/nestjs init
```

3. Configure the module:

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
    }),
  ],
})
export class AppModule {}
```

## Quick start (Next.js)

1. Install the Next.js package and peer deps:

```bash
npm i @saaslib/nextjs next@^16.1.1 react@^19.2.3 react-dom@^19.2.3 @stripe/stripe-js@^5.5.0 jsonwebtoken@^9.0.3
```

2. Add env vars:

```env
NEXT_PUBLIC_API_ENDPOINT=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

3. Use hooks and server utilities (see `packages/nextjs/README.md`).

## Development

```bash
npm install
npm run build
npm run lint
npm test
```

## Documentation

- `packages/nestjs/README.md`
- `packages/nextjs/README.md`

## License

MIT License - see `LICENSE` for details.
