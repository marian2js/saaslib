import { HttpException, HttpStatus } from '@nestjs/common'

export class LimitExceededException extends HttpException {
  constructor(message?: string) {
    super(message || 'Entity limit exceeded', HttpStatus.TOO_MANY_REQUESTS)
  }
}
