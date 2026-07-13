import { create } from 'zustand'

let idCounter = 0

export const useNotificationStore = create((set, get) => ({
  toasts: [],

  addToast: ({ type = 'info', title, message, duration = 4500 }) => {
    const id = ++idCounter
    set((state) => ({
      toasts: [...state.toasts, { id, type, title, message, duration }],
    }))

    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration)
    }

    return id
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearAll: () => set({ toasts: [] }),
}))
