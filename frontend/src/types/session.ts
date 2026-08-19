export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface Session {
  id: string
  programme_id: string
  name: string
  start_date: string
  end_date: string
  total_classes: number
  is_active: boolean
  created_at: string
  updated_at: string
  programme?: any
}

export interface StudentSession {
  id: string
  student_id: string
  session_id: string
  enrolled_at: string
  classes_attended: number
  classes_compensated: number
  status: SessionStatus
  completed_at?: string
  created_at: string
  updated_at: string
  student?: any
  session?: Session
}

export interface SessionProgress {
  session_id: string
  student_id: string
  total_classes: number
  classes_attended: number
  classes_compensated: number
  total_completed: number
  progress_percentage: number
  status: SessionStatus
}

export interface CreateSessionDTO {
  programme_id: string
  name: string
  start_date: string
  end_date: string
}
