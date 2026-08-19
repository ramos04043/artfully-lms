export type UserRole = 'ADMIN' | 'STAFF'

export interface User {
  id: string
  email: string
  role: UserRole
  first_name: string
  last_name: string
  phone?: string
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  user_id: string
  employee_id: string
  date_of_birth?: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  date_of_joining: string
  specialization?: string
  is_active: boolean
  created_at: string
  updated_at: string
  user?: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
  staff?: Staff
}
