export type FormState<T = any> = {
  success: boolean
  error: null | string
  data?: T
}
