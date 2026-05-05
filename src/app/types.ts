export interface Profile { friendly_name?: string; round_up_target?: number }
export interface Category { id?: string; user_id?: string; name: string; color: string }
export interface Account { id?: string; user_id?: string; name: string; account_code: string; type?: string }
export interface Expense { id?: string; user_id?: string; name: string; monthly_amount: number; bi_weekly_amount: number; category: string; fixed: boolean; account_code: string; due_date: string; frequency?: string }
export interface Transaction { id?: string; user_id?: string; transaction_date: string; post_date?: string; description: string; category: string; type?: string; amount: number; memo?: string }
export interface IncomeSource { id?: string; user_id?: string; employer_name: string; pay_frequency: string; pay_date?: string; net_amount?: number; gross_amount?: number; taxes?: number; deductions?: number }
export interface CategoryRule { id?: string; user_id?: string; merchant_pattern: string; category: string }

export const DEFAULT_CATEGORIES = [
  { name: 'Housing', color: '#6366f1' },
  { name: 'Utilities', color: '#f59e0b' },
  { name: 'Transportation', color: '#3b82f6' },
  { name: 'Food', color: '#22c55e' },
  { name: 'Entertainment', color: '#ec4899' },
  { name: 'Travel', color: '#06b6d4' },
  { name: 'General', color: '#a1a1aa' },
]

export const PRESET_COLORS = ['#6366f1','#3b82f6','#06b6d4','#22c55e','#f59e0b','#ec4899','#f43f5e','#a1a1aa','#8b5cf6','#f97316']

export const calcAmounts = (amount: number, freq: string) => {
  const a = Number(amount) || 0
  let monthly = 0
  switch (freq) {
    case 'daily': monthly = a * 30.44; break
    case 'weekly': monthly = a * 4.33; break
    case 'bi-weekly': monthly = a * 2.17; break
    case 'monthly': monthly = a; break
    case 'yearly': monthly = a / 12; break
    default: monthly = a
  }
  return { monthly: +monthly.toFixed(2), biWeekly: +(monthly / 2.17).toFixed(2) }
}

export const getBaseAmount = (monthly: number, freq: string) => {
  switch (freq) {
    case 'daily': return +(monthly / 30.44).toFixed(2)
    case 'weekly': return +(monthly / 4.33).toFixed(2)
    case 'bi-weekly': return +(monthly / 2.17).toFixed(2)
    case 'monthly': return +monthly.toFixed(2)
    case 'yearly': return +(monthly * 12).toFixed(2)
    default: return +monthly.toFixed(2)
  }
}

export const fmt = (n: number) => `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
