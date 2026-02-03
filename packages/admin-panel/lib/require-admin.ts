import { fetchAuthUser, isLoggedIn } from '@saaslib/nextjs'
import { redirect } from 'next/navigation'
import { BaseUser } from '@saaslib/nextjs'

export async function requireAdmin(): Promise<BaseUser> {
  const loggedIn = await isLoggedIn()
  if (!loggedIn) {
    redirect('/signin')
  }

  try {
    const user = await fetchAuthUser<BaseUser>()
    if (!user || user.role !== 'admin') {
      redirect('/signin?error=forbidden')
    }
    return user
  } catch {
    redirect('/signin')
  }
}
