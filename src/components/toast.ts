import type { ReactNode } from 'react'

/** Tiny toast queue (UI layer lives in Toaster.tsx). */
export interface Toast {
  id: number
  kind: 'achievement' | 'success' | 'info' | 'warn'
  title: string
  body?: string
  icon?: ReactNode
  achievementId?: string
}

let toasts: Toast[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function showToast(t: Omit<Toast, 'id'>, ms = 3600) {
  const id = ++seq
  toasts = [...toasts.slice(-2), { ...t, id }]
  emit()
  setTimeout(() => dismissToast(id), ms)
  return id
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export const toastStore = {
  get: () => toasts,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

