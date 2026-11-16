/**
 * The part of a `Users_CB` row that is safe to send to the browser.
 * Never add the password hash here.
 */
export interface SessionUser {
  id: number
  name: string
  email: string
}
