export type AttendanceStatus = 
  | 'UNMARKED' 
  | 'PRESENT' 
  | 'ABSENT' 
  | 'COMPENSATION_PRESENT' 
  | 'HOLIDAY' 
  | 'CANCELLED'

export interface Attendance {
  id: string
  student_id: string
  batch_id: string
  class_date: string
  status: AttendanceStatus
  marked_by?: string
  marked_at?: string
  is_locked: boolean
  notes?: string
  created_at: string
  updated_at: string
  student?: any
  batch?: any
  marked_by_user?: any
}

export interface AttendanceSubmission {
  batch_id: string
  class_date: string
  attendance_records: Array<{
    student_id: string
    status: AttendanceStatus
    notes?: string
  }>
}

export interface AttendanceCorrection {
  attendance_id: string
  new_status: AttendanceStatus
  reason: string
}

export interface AttendanceSummary {
  total_students: number
  present: number
  absent: number
  compensation_present: number
  unmarked: number
  attendance_percentage: number
}

export interface TodayClass {
  batch_id: string
  batch_name: string
  programme_name: string
  start_time: string
  end_time: string
  day_of_week: string
  total_students: number
  marked_count: number
  present_count: number
  absent_count: number
  attendance_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  class_date: string
}
