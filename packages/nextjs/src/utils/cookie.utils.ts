export function getCookieDomain(): string | undefined {
  if (process.env.VERCEL_ENV === 'preview') {
    return undefined
  }

  if (process.env.NODE_ENV === 'production') {
    const endpoint = process.env.NEXT_PUBLIC_API_ENDPOINT
    if (!endpoint) {
      return undefined
    }
    const url = new URL(endpoint)
    const domainParts = url.hostname.split('.')
    return '.' + domainParts.slice(-2).join('.')
  }

  return 'localhost'
}
