import { passwordSignIn, passwordSignUp, requestPasswordReset, resetPassword } from '../services'
import { BaseLoggedInUser } from '../types'
import { FormState } from '../types/form.types'

export async function passwordSignUpFormAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    await passwordSignUp(email, password)
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

export async function passwordSignInFormAction(
  prevState: FormState,
  formData: FormData,
): Promise<FormState<BaseLoggedInUser>> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const rememberMe = formData.get('remember-me') as string

  try {
    const user = await passwordSignIn(email, password, !!rememberMe)
    localStorage.setItem('user', JSON.stringify(user))
    return { success: true, data: user, error: null }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

export async function resetPasswordFormAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const email = formData.get('email') as string

  try {
    await requestPasswordReset(email)
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

export async function completePasswordResetFormAction(
  prevState: FormState,
  formData: FormData,
  code: string,
): Promise<FormState> {
  const password = formData.get('password') as string

  try {
    await resetPassword(code, password)
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}
