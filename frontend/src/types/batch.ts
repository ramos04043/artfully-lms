export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface Programme {
  id: string
  name: string
  description?: string
  session_class_count: number
  classes_per_week: number
  duration_weeks?: number
  fee_per_session: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Batch {
  id: string
  programme_id: string
  name: string
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  max_capacity: number
  current_enrollment: number
  room_number?: string
  is_active: boolean
  created_at: string
  updated_at: string
  programme?: Programme
}

export interface BatchWithDetails extends Batch {
  students?: any[]
  staff?: any[]
}

export interface StudentBatch {
  id: string
  student_id: string
  batch_id: string
  enrolled_at: string
  is_active: boolean
  created_at: string
  updated_at: string
  batch?: Batch
}

export interface StaffBatch {
  id: string
  staff_id: string
  batch_id: string
  assigned_at: string
  is_active: boolean
  created_at: string
  batch?: Batch
}

export interface CreateBatchDTO {
  programme_id: string
  name: string
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  max_capacity?: number
  room_number?: string
}
