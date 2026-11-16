/** A `Users_CB` row without its password. */
export interface AgentUser {
  id: number
  name: string
  email: string
  createdAt: string
}

/** Internal shape used only while authenticating. */
export interface AgentUserWithPassword extends AgentUser {
  password: string
}

export interface UsersResult {
  users: AgentUser[]
  error?: string
}
