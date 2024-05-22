import { updateUser } from '../services/user.service'
import { BaseUser, FormState } from '../types'

export async function updateUserFormAction<U extends BaseUser>(
  prevState: FormState<U>,
  formData: FormData,
): Promise<FormState<U>> {
  const update = {} as Partial<U>
  const keys = Array.from(formData.keys())
  for (const key of keys) {
    const value = formData.get(key)
    ;(update as any)[key] = value
  }
  try {
    const user = await updateUser<U>(update)
    return { success: true, error: null, data: user }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}
