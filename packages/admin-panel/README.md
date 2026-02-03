# @saaslib/admin-panel

Admin console for Saaslib apps, built with Next.js, Tailwind, and shadcn/ui on top of the `@saaslib/nextjs` hooks.

## What it does

- Manage users (roles, blocked state, email updates)
- Review and manage subscriptions (upgrade, cancel, resume)
- Explore owneable collections with safe CRUD helpers

## Requirements

- Node.js >= 18
- A Saaslib backend using `@saaslib/nestjs`
- Admin-only API routes (see setup below)

## Environment variables

```env
NEXT_PUBLIC_API_ENDPOINT=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is optional unless you add Stripe UI features beyond the built-in admin actions.

## Backend wiring (NestJS)

Expose admin endpoints by extending the new base controllers:

```ts
import { Controller } from '@nestjs/common'
import {
  AdminCollectionsService,
  BaseAdminUsersController,
  BaseAdminSubscriptionsController,
  EmailService,
} from '@saaslib/nestjs'
import { UserService } from './user.service'
import { SubscriptionService } from './subscription.service'
import { User } from './user.model'

@Controller('admin/users')
export class AdminUsersController extends BaseAdminUsersController<User> {
  constructor(userService: UserService, emailService: EmailService, adminCollections: AdminCollectionsService) {
    super(userService, emailService, adminCollections)
  }
}

@Controller('admin/subscriptions')
export class AdminSubscriptionsController extends BaseAdminSubscriptionsController<User> {
  constructor(subscriptionService: SubscriptionService, userService: UserService) {
    super(subscriptionService, userService)
  }
}
```

Add the controllers to your NestJS module. The base controllers enforce admin role checks via `BaseUserRole.Admin`.

## Collections & plans

Collections are auto-discovered from `OwneableEntityController` instances in your backend. Subscription types are read
from your Saaslib subscription configuration. If you want custom labels or column definitions, add optional overrides
in `packages/admin-panel/config/admin.config.ts`.

## Run locally

```bash
npm install
npm run dev --workspace @saaslib/admin-panel
```

## Run as a package (consumer)

```bash
npx saaslib-admin-panel dev --api-endpoint http://localhost:8000
```

For local package development (no npm publish), add `--force-copy` so the runtime folder is refreshed on each start:

```bash
npx saaslib-admin-panel dev --api-endpoint http://localhost:8000 --force-copy
```

The CLI creates a lightweight `.saaslib-admin-panel` runtime folder in your project for Next.js to run outside of
`node_modules`. This is managed automatically and does not require manual maintenance.
