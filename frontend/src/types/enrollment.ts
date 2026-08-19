export interface EnrollmentStep1Data {
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

export interface EnrollmentStep2Data {
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

export interface EnrollmentStep3Data {
  programme_id: string
}

export interface EnrollmentStep4Data {
  batch_ids: string[]
}

export interface EnrollmentStep5Data {
  session_id: string
  fee_amount: number
  due_date?: string
}

export interface CompleteEnrollmentDTO {
  student: EnrollmentStep1Data
  parents: EnrollmentStep2Data['parents']
  programme_id: string
  batch_ids: string[]
  session_id: string
  fee_amount: number
  due_date?: string
}

export interface EnrollmentValidation {
  is_valid: boolean
  errors: Record<string, string[]>
  warnings: string[]
}
