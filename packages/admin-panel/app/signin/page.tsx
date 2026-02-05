'use client'

import { useSignInActionState } from '@saaslib/nextjs'
import { GithubIcon } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

function SignInForm() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [state, signIn] = useSignInActionState({ redirectTo: '/admin' })

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in with your admin account to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {(error === 'forbidden' || state.error) && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error === 'forbidden' ? 'You are signed in but do not have admin access.' : state.error}
            </div>
          )}
          <form action={signIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="admin@company.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" name="remember-me" defaultChecked />
              Remember me
            </label>
            <Button className="w-full" type="submit">
              Sign in
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={() => {
                window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/auth/github`
              }}
            >
              <GithubIcon className="mr-2 h-4 w-4" />
              GitHub
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
}
