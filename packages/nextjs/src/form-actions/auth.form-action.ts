import { passwordSignIn, passwordSignUp } from '../services'

export async function passwordSignUpFormAction(
  prevState: { success: boolean; error: null | string },
  formData: FormData,
): Promise<{ success: boolean; error: null | string }> {
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
  prevState: { success: boolean; error: null | string },
  formData: FormData,
): Promise<{ success: boolean; error: null | string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const rememberMe = formData.get('remember-me') as string

  try {
    const user = await passwordSignIn(email, password, !!rememberMe)
    localStorage.setItem('user', JSON.stringify(user))
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}
