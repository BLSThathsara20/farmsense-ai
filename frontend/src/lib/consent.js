/** UK GDPR / PECR consent for device storage. Bump version to re-prompt. */
export const CONSENT_KEY = 'farmsense-consent'
export const CONSENT_VERSION = 1
export const CONSENT_CHANGED_EVENT = 'farmsense-consent-changed'
export const CONSENT_OPEN_EVENT = 'farmsense-open-consent'

export function getConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== CONSENT_VERSION || !parsed.decidedAt) return null
    return parsed
  } catch {
    return null
  }
}

export function hasConsentDecision() {
  return getConsent() != null
}

export function saveConsent({ preferences }) {
  const record = {
    version: CONSENT_VERSION,
    essential: true,
    preferences: Boolean(preferences),
    decidedAt: new Date().toISOString(),
  }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(record))
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: record }))
  return record
}

export function openConsentPreferences() {
  window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT))
}
