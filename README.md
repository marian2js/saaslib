# Nestjs SaaS Library

## Installation

```bash
$ yarn add nestjs-saas
```

## Users

**src/user/user.model.ts**

```typescript
import { SchemaFactory } from '@nestjs/mongoose'
import { BaseUser } from 'nestjs-saas'

export class User extends BaseUser {}
export const UserSchema = SchemaFactory.createForClass(User)
```

**src/user/user.service.ts**

```typescript
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { BaseUserService } from 'nestjs-saas'
import { User } from './user.model'

@Injectable()
export class UserService extends BaseUserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {
    super(userModel)
  }
}
```

**src/user/users.controller.ts**

```typescript
import { Controller } from '@nestjs/common'
import { BaseUserController } from 'nestjs-saas'
import { UserService } from './user.service'

@Controller('users')
export class UserController extends BaseUserController {
  constructor(private userService: UserService) {
    super(userService)
  }
}
```

## Auth

**src/user/auth/auth.service.ts**

```typescript
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { BaseAuthService } from 'nestjs-saas'
import { UserService } from '../user.service'

@Injectable()
export class AuthService extends BaseAuthService {
  constructor(
    protected userService: UserService,
    protected jwtService: JwtService,
  ) {
    super(userService, jwtService)
  }
}
```

**src/user/auth/auth.controller.ts**

```typescript
import { Controller } from '@nestjs/common'
import { BaseAuthController } from 'nestjs-saas'
import { UserService } from '../user.service'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController extends BaseAuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {
    super(authService, userService)
  }
}
```
