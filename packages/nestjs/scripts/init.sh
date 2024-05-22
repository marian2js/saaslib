#!/bin/bash

BASE_DIR="./src/user"

mkdir -p $BASE_DIR/auth

# User Model
cat << 'EOF' > $BASE_DIR/user.model.ts
import { Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseUser } from '@saaslib/nestjs'

@Schema()
export class User extends BaseUser {}
export const UserSchema = SchemaFactory.createForClass(User)
EOF

# User Service
cat << 'EOF' > $BASE_DIR/user.service.ts
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { BaseUserService } from '@saaslib/nestjs'
import { Model } from 'mongoose'
import { User } from './user.model'

@Injectable()
export class UserService extends BaseUserService<User> {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {
    super(userModel)
  }
}
EOF

# User Controller
cat << 'EOF' > $BASE_DIR/users.controller.ts
import { Controller } from '@nestjs/common'
import { BaseUserController } from '@saaslib/nestjs'
import { User } from './user.model'
import { UserService } from './user.service'

@Controller('users')
export class UserController extends BaseUserController<User> {
  constructor(private userService: UserService) {
    super(userService)
  }
}
EOF

# Auth Service
cat << 'EOF' > $BASE_DIR/auth/auth.service.ts
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { BaseAuthService, EmailService, UserProviderService } from '@saaslib/nestjs'
import { UserService } from '../user.service'

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
EOF

# Auth Controller
cat << 'EOF' > $BASE_DIR/auth/auth.controller.ts
import { Controller } from '@nestjs/common'
import { BaseAuthController } from '@saaslib/nestjs'
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
EOF

# Setup .env file at the project root
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
ENV_FILE=".env"
ENV_EXAMPLE="$SCRIPT_DIR/../.env.example"

# Check if .env exists, if not, create it
if [ ! -f $ENV_FILE ]; then
    touch $ENV_FILE
fi

# Append contents of env.example to .env
if [ -f $ENV_EXAMPLE ]; then
    cat $ENV_EXAMPLE >> $ENV_FILE
fi

echo "@saaslib/nestjs project setup completed. Please update the .env file with your configurations."
