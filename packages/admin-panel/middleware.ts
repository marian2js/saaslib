import { NextRequest, NextResponse } from 'next/server'
import { authRequiredMiddleware } from '@saaslib/nextjs'

export async function middleware(req: NextRequest) {
  const result = await authRequiredMiddleware(req)
  if (result.redirectTo) {
    return NextResponse.redirect(result.redirectTo)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
