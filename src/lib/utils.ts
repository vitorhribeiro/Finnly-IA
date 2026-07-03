import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTransactionStatus(paymentStatus: boolean | null | undefined, dateStr: string): 'paid' | 'pending' | 'overdue' {
  if (paymentStatus === true) return 'paid'
  const d = new Date()
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (dateStr < todayStr) return 'overdue'
  return 'pending'
}
