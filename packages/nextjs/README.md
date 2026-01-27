# @saaslib/nextjs

React hooks, server utilities, and middleware for Next.js apps that talk to a `@saaslib/nestjs` backend.

## Requirements

```json
{
  "peerDependencies": {
    "@stripe/stripe-js": "^5.5.0",
    "jsonwebtoken": "^9.0.3",
    "next": "^16.1.1",
    "react": "^19.2.3",
    "react-dom": "^19.2.3"
  }
}
```

## Installation

```bash
npm i @saaslib/nextjs next@^16.1.1 react@^19.2.3 react-dom@^19.2.3 @stripe/stripe-js@^5.5.0 jsonwebtoken@^9.0.3
```

## Environment variables

```env
NEXT_PUBLIC_API_ENDPOINT=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

`NEXT_PUBLIC_API_ENDPOINT` is required for all hooks and server utilities. Stripe is only required if you use the subscription hooks.

## Authentication

### Client hooks

```ts
import {
  useSignInActionState,
  useSignUpActionState,
  useResetPasswordActionState,
  useCompletePasswordResetActionState,
  useOAuthRedirect,
  useVerifyEmail,
  useSignOut,
} from '@saaslib/nextjs'
```

- `useSignInActionState` / `useSignUpActionState`: wraps server form actions and returns `[state, action]`
- `useResetPasswordActionState` / `useCompletePasswordResetActionState`: password reset flow
- `useOAuthRedirect`: completes OAuth redirect (`/auth/verify-oauth`)
- `useVerifyEmail`: completes email verification (`/auth/verify-email`)
- `useSignOut`: clears cookies + local storage and redirects

### Server utilities

```ts
import {
  isLoggedIn,
  passwordSignIn,
  passwordSignUp,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  verifyOAuthCode,
  signOutServer,
} from '@saaslib/nextjs'
```

These utilities use the backend auth endpoints and manage the `jwt` cookie when appropriate.

## Users

### Client hooks

```ts
import { useLoggedInUser, useGetMe, usePatchMe, useDeleteAvatar } from '@saaslib/nextjs'
```

- `useLoggedInUser`: reads `user` from local storage
- `useGetMe`: fetches `/users/me` (auto signs out on 4xx errors)
- `usePatchMe`: updates `/users/me` and syncs local storage
- `useDeleteAvatar`: calls `/users/me/avatar` and updates local storage

### Server utilities

```ts
import { fetchMe, fetchAuthUser, updateUser } from '@saaslib/nextjs'
```

## Middleware

Protect pages with the auth middleware helper:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { authRequiredMiddleware } from '@saaslib/nextjs'

export async function middleware(req: NextRequest) {
  const result = await authRequiredMiddleware(req)
  if (result.redirectTo) {
    return NextResponse.redirect(result.redirectTo)
  }
  return NextResponse.next()
}
```

## Fetch hooks

`useApiFetch` and `useApiCallback` wrap `fetch` with retries, JSON parsing, and a shared error type.

```ts
import { useApiFetch, useApiCallback } from '@saaslib/nextjs'

const { data, loading, error, refetch } = useApiFetch('/users/me', {
  retries: 2,
  initialRetryDelay: 500,
  backoffMultiplier: 2,
})

const { callback, loading: saving } = useApiCallback()
await callback('/some-endpoint', { method: 'POST', body: JSON.stringify(payload) })
```

## Owneable resources

### Client hooks

```ts
import {
  useFetchOwnableItems,
  useFetchOwnableItem,
  useCreateOwneableItem,
  useUpdateOwnableItem,
  useDeleteOwnableItem,
} from '@saaslib/nextjs'
```

### Server utilities

```ts
import {
  fetchOwneableItems,
  fetchOwneableItem,
  createOwnableItem,
  updateOwnableItem,
  deleteOwnableItem,
} from '@saaslib/nextjs'
```

## Conversations

### Client hooks

```ts
import {
  useFetchConversations,
  useFetchConversation,
  useCreateConversation,
  useSendConversationMessage,
  useRetryMessage,
  useUpdateConversation,
  useDeleteConversation,
  useUpdateMessage,
  useDeleteMessage,
  useShareConversation,
  useFetchSharedConversation,
  useFetchSharedConversations,
  useUpdateSharedConversation,
  useDeleteSharedConversation,
  useCreateConversationFromShared,
} from '@saaslib/nextjs'
```

### Server utilities

```ts
import {
  fetchConversations,
  fetchConversation,
  fetchSharedConversation,
  createConversation,
  sendConversationMessage,
} from '@saaslib/nextjs'
```

## Subscriptions (Stripe)

```ts
import { useCreateCheckoutSession, useStripeSubscription, useGetBillingUrl } from '@saaslib/nextjs'
```

- `useCreateCheckoutSession` hits `/subscriptions/checkout-session`
- `useStripeSubscription` wraps checkout and redirects to Stripe
- `useGetBillingUrl` returns the billing portal URL

## Newsletter

```ts
import {
  useNewsletterSubscription,
  useNewsletterTokenSubscription,
  useNewsletterSubscriptionStatus,
} from '@saaslib/nextjs'
```

## Types, errors, and utilities

The package exports common types (users, auth, conversations), `FetchApiError`, and helpers in `utils/`
for cookies, JWT parsing, and async helpers.

## License

MIT License - see `LICENSE` for details.
