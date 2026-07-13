/** Role helpers for farmer vs super-admin routing. */

export const SUPER_ADMIN_EMAIL = (
  import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'blsthathsara@gmail.com'
)
  .trim()
  .toLowerCase()

export function isSuperAdminEmail(email) {
  return Boolean(email) && String(email).trim().toLowerCase() === SUPER_ADMIN_EMAIL
}

export function isAdminUser(user) {
  if (!user) return false
  if (user.role === 'admin') return true
  return isSuperAdminEmail(user.email)
}

export function homePathForUser(user) {
  return isAdminUser(user) ? '/admin' : '/dashboard'
}
