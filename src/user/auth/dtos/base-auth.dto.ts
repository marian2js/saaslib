import { IsEmail, IsString, MinLength } from 'class-validator'
import { IsObjectId } from '../../../common/validators/is-object-id.validator'

export class SignInDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
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
