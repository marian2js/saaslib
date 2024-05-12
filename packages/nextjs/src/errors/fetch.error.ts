export class FetchApiError extends Error {
  public statusCode: number
  public error: string

  constructor(data: { error: string; message?: string; statusCode: number }) {
    super(data.message ?? data.error ?? 'Unexpected error occurred')
    this.error = data.error
    this.statusCode = data.statusCode
  }
}
