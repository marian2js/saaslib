import { IsEmail, IsString, MinLength } from 'class-validator'
import { IsObjectId } from '../../../common/validators/is-object-id.validator'

export class SignInDto {
  @IsEmail()
  email: string

  @IsString()
  password: string
}

export class SignUpWithPasswordDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  password: string
}

export class RefreshTokenDto {
  @IsString()
  @IsObjectId()
  userId: string

  @IsString()
  refreshToken: string
}

export class VerifyAuthCodeDto {
  @IsString()
  code: string
}

export class VerifyEmailDto {
  @IsString()
  @IsObjectId()
  userId: string

  @IsString()
  code: string
}

export class RequestPasswordResetDto {
  @IsEmail()
  email: string
}

export class ResetPasswordDto {
  @IsString()
  code: string

  @IsString()
  @MinLength(8)
  newPassword: string
}
