import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

export class SignInDto extends createZodDto(
  z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
) {}

export class SignUpWithPasswordDto extends createZodDto(
  z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
) {}

export class RefreshTokenDto extends createZodDto(
  z.object({
    userId: z.string().base64(),
    refreshToken: z.string(),
  }),
) {}

export class VerifyAuthCodeDto extends createZodDto(
  z.object({
    code: z.string(),
  }),
) {}
