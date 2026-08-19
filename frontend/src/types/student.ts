export type StudentStatus = 'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'GRADUATED'

export interface Student {
  id: string
  student_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender?: string
  email?: string
  phone?: string
  address?: string
  school_name?: string
  grade?: string
  medical_conditions?: string
  profile_image_url?: string
  status: StudentStatus
  enrolled_at: string
  paused_at?: string
  paused_reason?: string
  created_at: string
  updated_at: string
}

export interface Parent {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  alternate_phone?: string
  relationship: string
  occupation?: string
  address?: string
  created_at: string
  updated_at: string
}

export interface StudentParent {
  id: string
  student_id: string
  parent_id: string
  is_primary: boolean
  created_at: string
  parent?: Parent
}

export interface StudentWithDetails extends Student {
  parents?: Parent[]
  batches?: any[]
  sessions?: any[]
}

export interface CreateStudentDTO {
  student: {
    first_name: string
    last_name: string
    date_of_birth: string
    gender?: string
    email?: string
    phone?: string
    address?: string
    school_name?: string
    grade?: string
    medical_conditions?: string
  }
  parents: Array<{
    first_name: string
    last_name: string
    email: string
    phone: string
    alternate_phone?: string
    relationship: string
    occupation?: string
    is_primary: boolean
  }>
}
