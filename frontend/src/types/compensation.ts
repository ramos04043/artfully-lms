export type CompensationStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'COMPLETED' 
  | 'CANCELLED'

export interface Compensation {
  id: string
  student_id: string
  original_attendance_id: string
  original_batch_id: string
  original_date: string
  compensation_batch_id: string
  compensation_date: string
  status: CompensationStatus
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  attendance_id?: string
  created_at: string
  updated_at: string
  student?: any
  original_batch?: any
  compensation_batch?: any
  approved_by_user?: any
}

export interface CreateCompensationDTO {
  student_id: string
  original_attendance_id: string
  compensation_batch_id: string
  compensation_date: string
}

export interface ApproveCompensationDTO {
  compensation_id: string
  approved: boolean
  rejection_reason?: string
}

export interface CompensationValidation {
  is_valid: boolean
  errors: string[]
  warnings: string[]
}
