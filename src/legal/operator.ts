/**
 * Operator (data controller) details shown in the privacy policy and terms.
 * These are intentionally NOT filled in: do not invent a company name,
 * address or email. Set them through environment variables before any
 * public release (see README > Release checklist).
 */
const env = import.meta.env
export const OPERATOR = {
  name: env.VITE_OPERATOR_NAME as string | undefined,
  email: env.VITE_OPERATOR_EMAIL as string | undefined,
  address: env.VITE_OPERATOR_ADDRESS as string | undefined,
}
export const OPERATOR_CONFIGURED = Boolean(OPERATOR.name && OPERATOR.email)
export const LEGAL_UPDATED = '2026-11-24'
