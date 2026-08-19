export type FeeStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'WAIVED' | 'CANCELLED'
export type PaymentMode = 'BANK' | 'CASH' | 'UPI' | 'CARD' | 'CHEQUE'
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED'

export interface FeeDue {
  id: string
  student_id: string
  session_id: string
  amount_due: number
  amount_paid: number
  amount_pending: number
  status: FeeStatus
  due_date?: string
  created_at: string
  updated_at: string
  student?: any
  session?: any
}

export interface Payment {
  id: string
  fee_due_id: string
  student_id: string
  amount: number
  payment_mode: PaymentMode
  payment_date: string
  transaction_reference?: string
  notes?: string
  received_by?: string
  status: PaymentStatus
  created_at: string
  updated_at: string
  fee_due?: FeeDue
  student?: any
  received_by_user?: any
}

export interface CreatePaymentDTO {
  fee_due_id: string
  amount: number
  payment_mode: PaymentMode
  payment_date: string
  transaction_reference?: string
  notes?: string
}

export interface PaymentSummary {
  total_amount_due: number
  total_amount_paid: number
  total_amount_pending: number
  pending_fees_count: number
  partial_fees_count: number
  paid_fees_count: number
}
