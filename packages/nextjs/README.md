# Next.js SaaS Library

React hooks and utilities for building SaaS applications with Next.js, designed to work seamlessly with @saaslib/nestjs.

## Requirements

```json
{
  "peerDependencies": {
    "@stripe/stripe-js": "^5.5.0",
    "jsonwebtoken": "^9.0.2",
    "next": "^15.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

## Features

### Authentication Hooks
- `useLoggedInUser()`: Get the currently logged-in user from local storage
- `useSignIn()`: Handle user sign-in with email/password
- `useSignUp()`: Handle user registration
- `useSignOut()`: Handle user logout
- `useOAuthSignIn()`: Handle OAuth authentication flows
- `usePasswordReset()`: Handle password reset flow

### User Management
- `useGetMe()`: Fetch current user details
- `usePatchMe()`: Update user profile
- `useDeleteAvatar()`: Remove user avatar
- Type-safe user operations with generics

### Subscription Management
- `useCreateCheckoutSession()`: Create Stripe checkout sessions
- `useChangeSubscription()`: Handle subscription plan changes
- `useCancelSubscription()`: Handle subscription cancellations
- `useResumeSubscription()`: Resume cancelled subscriptions
- `useGetBillingUrl()`: Get Stripe billing portal URL

### Newsletter Management
- `useNewsletterSubscription()`: Handle newsletter subscriptions
- `useNewsletterTokenSubscription()`: Handle token-based subscriptions
- `useNewsletterSubscriptionStatus()`: Check subscription status

### Resource Management
- `useFetchOwnableItems()`: Fetch user-owned resources
- `useFetchOwnableItem()`: Fetch single owned resource
- `useCreateOwneableItem()`: Create new owned resource
- `useUpdateOwnableItem()`: Update owned resource
- `useDeleteOwnableItem()`: Delete owned resource

## Installation

```bash
npm i @saaslib/nextjs @stripe/stripe-js@^5.5.0 jsonwebtoken@^9.0.2 next@^15.1.6 react@^19.0.0 react-dom@^19.0.0
```

## Basic Usage

### Authentication

```typescript
import { useLoggedInUser, useSignIn } from '@saaslib/nextjs';

function LoginComponent() {
  const { user, loading } = useLoggedInUser();
  const { signIn, error } = useSignIn();

  const handleSubmit = async (email: string, password: string) => {
    await signIn({ email, password });
  };

  return // your component JSX
}
```

### User Management

```typescript
import { useGetMe, usePatchMe } from '@saaslib/nextjs';

function ProfileComponent() {
  const { data, loading } = useGetMe();
  const { patchMe, success } = usePatchMe();

  const handleUpdate = async (userData: Partial<User>) => {
    await patchMe(userData);
  };

  return // your component JSX
}
```

### Subscription Management

```typescript
import { useCreateCheckoutSession } from '@saaslib/nextjs';

function SubscriptionComponent() {
  const { createSession, loading } = useCreateCheckoutSession();

  const handleSubscribe = async (priceId: string) => {
    const { sessionId } = await createSession({
      priceId,
      type: 'basic'
    });
    // Redirect to Stripe checkout
  };

  return // your component JSX
}
```

### Resource Management

```typescript
import { useFetchOwnableItems, useCreateOwneableItem } from '@saaslib/nextjs';

function ResourceComponent() {
  const { data: items, loading } = useFetchOwnableItems('resources');
  const { createItem } = useCreateOwneableItem('resources');

  const handleCreate = async (data: CreateResourceDto) => {
    await createItem(data);
  };

  return // your component JSX
}
```

## Configuration

The library requires some environment variables to be set in your Next.js application:

```env
NEXT_PUBLIC_API_ENDPOINT=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
```

## Advanced Usage

### Custom Hook Options

All fetch hooks support retry options:

```typescript
const { data } = useGetMe({
  retries: 3,
  initialRetryDelay: 1000,
  backoffMultiplier: 2,
  maxRetryDelay: 30000
});
```

### Type Safety

The library is built with TypeScript and supports generic types for all hooks:

```typescript
interface CustomUser extends BaseUser {
  customField: string;
}

const { user } = useLoggedInUser<CustomUser>();
const { data } = useGetMe<CustomUser>();
```

## Authentication Middleware

The library provides Next.js middleware for authentication:

```typescript
// middleware.ts
import { authRequiredMiddleware } from '@saaslib/nextjs';

export async function middleware(req: NextRequest) {
  return await authRequiredMiddleware(req);
}

export const config = {
  matcher: ['/protected/:path*']
};
```

## Form Actions

Type-safe form actions for auth flows and user management:

```typescript
import { signInAction, signUpAction } from '@saaslib/nextjs';

// Server-side form actions
async function onSignIn(data: FormData) {
  'use server';
  return await signInAction(data);
}

async function onSignUp(data: FormData) {
  'use server';
  return await signUpAction(data);
}
```

## Security Utilities

The package includes utilities for token management and security:

```typescript
import { isAccessTokenExpired, getUserIdFromToken } from '@saaslib/nextjs';

// Check if JWT is expired
const expired = isAccessTokenExpired(token);

// Extract user ID from token
const userId = getUserIdFromToken(token);
```

## Hooks API Reference

### Authentication

```typescript
useLoggedInUser<T>(): {
  user: T | null;
  loading: boolean;
}

useSignIn(): {
  signIn: (credentials: { email: string; password: string }) => Promise<void>;
  error: Error | null;
  loading: boolean;
}

useSignUp(): {
  signUp: (data: { email: string; password: string }) => Promise<void>;
  error: Error | null;
  loading: boolean;
}

useOAuthSignIn(): {
  signInWithGoogle: () => void;
  signInWithLinkedIn: () => void;
  error: Error | null;
  loading: boolean;
}
```

### User Management

```typescript
useGetMe<T>(): {
  data: { user: T } | null;
  error: Error | null;
  loading: boolean;
}

usePatchMe<T>(): {
  patchMe: (data: Partial<T>) => Promise<void>;
  error: Error | null;
  loading: boolean;
}

useDeleteAvatar(): {
  deleteAvatar: () => Promise<void>;
  error: Error | null;
  loading: boolean;
}
```

### Subscription Management

```typescript
useCreateCheckoutSession(): {
  createSession: (options: {
    priceId: string;
    type: string;
  }) => Promise<{ sessionId: string }>;
  error: Error | null;
  loading: boolean;
}

useChangeSubscription(): {
  changeSubscription: (options: {
    subscriptionId: string;
    priceId: string;
  }) => Promise<void>;
  error: Error | null;
  loading: boolean;
}

useCancelSubscription(): {
  cancelSubscription: (subscriptionId: string) => Promise<void>;
  error: Error | null;
  loading: boolean;
}
```

### Resource Management

```typescript
useFetchOwnableItems<T>(entityKey: string): {
  data: T[] | null;
  error: Error | null;
  loading: boolean;
}

useCreateOwneableItem<CreateDto, T>(entityKey: string): {
  createItem: (data: CreateDto) => Promise<T>;
  error: Error | null;
  loading: boolean;
}

useUpdateOwnableItem<UpdateDto>(entityKey: string): {
  updateItem: (itemId: string, data: UpdateDto) => Promise<void>;
  error: Error | null;
  loading: boolean;
}
```

## Resource Management

The library provides hooks and utilities for working with ownable resources from the @saaslib/nestjs backend.

### Resource Hooks API

```typescript
// Fetch all resources owned by the current user
const { data: items, loading, error } = useFetchOwnableItems<T>(entityKey: string, options?: {
  retries?: number;
  initialRetryDelay?: number;
  credentials?: RequestCredentials;
});

// Fetch a single resource
const { data: item, loading, error } = useFetchOwnableItem<T>(
  entityKey: string,
  itemId: string,
  options?: FetchHookOptions
);

// Create a new resource
const { createItem, loading, error } = useCreateOwneableItem<CreateDto, T>(entityKey: string);
await createItem({
  name: 'My Resource',
  description: 'Details here'
});

// Update an existing resource
const { updateItem, loading, error } = useUpdateOwnableItem<UpdateDto>(entityKey: string);
await updateItem('resource-id', {
  name: 'Updated Name'
});

// Delete a resource
const { deleteItem, loading, error } = useDeleteOwnableItem(entityKey: string);
await deleteItem('resource-id');
```

### Type-Safe Resource Management

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

interface CreateProjectDto {
  name: string;
  description?: string;
}

interface UpdateProjectDto {
  name?: string;
  description?: string;
}

function ProjectList() {
  // Fully typed responses
  const { data: projects, loading } = useFetchOwnableItems<Project>('projects');
  const { createItem } = useCreateOwneableItem<CreateProjectDto, Project>('projects');

  const handleCreate = async (data: CreateProjectDto) => {
    const newProject = await createItem(data);
    // newProject is typed as Project
  };

  return (
    // Your JSX
  );
}
```

### Server Actions Integration

```typescript
// app/actions.ts
'use server'

import { createOwnableItem, updateOwnableItem, deleteOwnableItem } from '@saaslib/nextjs';

export async function createProject(data: CreateProjectDto) {
  return await createOwnableItem<CreateProjectDto, Project>('projects', data);
}

export async function updateProject(id: string, data: UpdateProjectDto) {
  return await updateOwnableItem<UpdateProjectDto, Project>('projects', id, data);
}

export async function deleteProject(id: string) {
  return await deleteOwnableItem('projects', id);
}
```

### Error Handling

```typescript
function ProjectManager() {
  const { createItem, error, loading } = useCreateOwneableItem<CreateProjectDto, Project>('projects');

  return (
    <div>
      {error && <ErrorAlert message={error.message} />}
      {loading && <LoadingSpinner />}
      <form onSubmit={async (e) => {
        e.preventDefault();
        try {
          await createItem({
            name: 'New Project'
          });
        } catch (e) {
          // Handle specific error cases
          if (e.status === 403) {
            // Resource limit exceeded
          }
        }
      }}>
        {/* Form fields */}
      </form>
    </div>
  );
}
```

### Advanced Options

All resource hooks support the standard fetch options plus additional configuration:

```typescript
const { data: projects } = useFetchOwnableItems<Project>('projects', {
  // Retry configuration
  retries: 3,
  initialRetryDelay: 1000,
  backoffMultiplier: 2,
  maxRetryDelay: 30000,

  // Authentication
  credentials: 'include',

  // Custom headers
  headers: {
    'Custom-Header': 'value'
  }
});
```

## Development and Testing

```typescript
// Set up testing environment
jest.mock('@saaslib/nextjs', () => ({
  useLoggedInUser: () => ({
    user: { id: 'test-user' },
    loading: false
  })
}));

// Test component
describe('Protected Component', () => {
  it('renders with user', () => {
    const { getByText } = render(<ProtectedComponent />);
    expect(getByText('Welcome')).toBeInTheDocument();
  });
});
```

## License

MIT License - see LICENSE file for details.