import type { RegisterData, Transaction, TransactionCreate, User } from '../types'

// Production: same-origin ('') so Vercel proxies /api/* to the backend (see vercel.json) and the cookie stays first-party.
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL ?? 'http://localhost:8000')

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

// Called when a request comes back 401 while we believed we were signed in.
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) { onUnauthorized = fn }

function describeError(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map(d => { const loc = Array.isArray(d.loc) ? d.loc.filter((p: unknown) => p !== 'body').join('.') : ''; return loc ? `${loc}: ${d.msg}` : d.msg }).join('; ')
  }
  return `Request failed (${status})`
}

async function request<T>(path: string, options: RequestInit = {}, opts: { skipAuthHandler?: boolean } = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include', // send the httpOnly session cookie
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ExpenseFlow', ...options.headers },
  })
  if (!res.ok) {
    let body: unknown = null
    try { body = await res.json() } catch { /* non-JSON error body */ }
    if (res.status === 401 && !opts.skipAuthHandler) onUnauthorized?.()
    throw new ApiError(describeError(body, res.status), res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  me: () => request<User>('/api/auth/me', {}, { skipAuthHandler: true }),
  login: (email: string, password: string) => request<User>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, { skipAuthHandler: true }),
  register: (data: RegisterData) => request<User>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }, { skipAuthHandler: true }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }, { skipAuthHandler: true }),
  getTransactions: (currency?: string) => request<Transaction[]>(`/api/transactions${currency ? `?currency=${encodeURIComponent(currency)}` : ''}`),
  createTransaction: (data: TransactionCreate) => request<Transaction>('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: number, data: TransactionCreate) => request<Transaction>(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: number) => request<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
}
