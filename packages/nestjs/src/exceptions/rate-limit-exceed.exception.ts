import { HttpException, HttpStatus } from '@nestjs/common'

export class RateLimitExceededException extends HttpException {
  constructor(next: Date, message: string = 'Rate limit exceeded') {
    super(
      {
        message,
        next: next.toISOString(),
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    )
  }
}
