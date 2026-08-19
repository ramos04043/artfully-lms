export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED'
export type EmailStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'RETRYING'

export interface Notification {
  id: string
  user_id?: string
  type: string
  title: string
  message: string
  priority: NotificationPriority
  status: NotificationStatus
  reference_type?: string
  reference_id?: string
  read_at?: string
  created_at: string
}

export interface EmailEvent {
  id: string
  recipient_email: string
  recipient_name?: string
  subject: string
  body: string
  email_type: string
  status: EmailStatus
  sent_at?: string
  failed_reason?: string
  retry_count: number
  reference_type?: string
  reference_id?: string
  created_at: string
  updated_at: string
}

export interface CreateNotificationDTO {
  user_id?: string
  type: string
  title: string
  message: string
  priority?: NotificationPriority
  reference_type?: string
  reference_id?: string
}

export interface NotificationSummary {
  total_unread: number
  high_priority_count: number
  urgent_count: number
}
