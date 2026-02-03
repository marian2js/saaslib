import { isLoggedIn } from '@saaslib/nextjs'
import { redirect } from 'next/navigation'

export default async function Home() {
  const loggedIn = await isLoggedIn()
  redirect(loggedIn ? '/admin' : '/signin')
}
