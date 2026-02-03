'use client'

import { useEffect } from 'react'
import { BaseUser } from '@saaslib/nextjs'

export default function HydrateUser({ user }: { user: BaseUser }) {
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    }
  }, [user])

  return null
}
