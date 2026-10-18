export type TransactionType = 'income' | 'expense'
export const CURRENCIES = ['BDT', 'USD', 'EUR', 'GBP', 'INR'] as const
export interface User { id: number; email: string; full_name: string; base_currency: string }
// The API returns money as an exact decimal string (e.g. "10.10"), never a float.
export interface Transaction { id: number; title: string; category: string; transaction_type: TransactionType; amount: string; currency: string; transaction_date: string; payment_method: string; note: string | null }
export interface TransactionCreate { title: string; category: string; transaction_type: TransactionType; amount: string; currency: string; transaction_date: string; payment_method: string; note?: string }
export interface RegisterData { email: string; password: string; full_name: string; base_currency: string }
export type View = 'overview' | 'transactions' | 'budgets' | 'reports' | 'goals' | 'settings'
export interface Goal { id: string; name: string; target: number; saved: number; emoji: string }
