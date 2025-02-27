export function generateSlug(title: string, hashLength = 8): string {
  let slug = title.trim().toLowerCase()

  slug = slug.replace(/\s+/g, '-')
  slug = slug.replace(/[^a-z0-9-]/g, '')
  slug = slug.replace(/-+/g, '-')
  slug = slug.replace(/^-+/, '').replace(/-+$/, '')

  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let hash = ''
  for (let i = 0; i < hashLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    hash += characters[randomIndex]
  }

  return slug ? `${slug}-${hash}` : hash
}
