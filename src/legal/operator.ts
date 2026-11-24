/**
 * Operator (data controller) details shown in the privacy policy and terms.
 * The contact email is the project owner's address. A legal name and postal
 * address can be added through environment variables; never invent them.
 */
const env = import.meta.env
export const OPERATOR = {
  name: env.VITE_OPERATOR_NAME as string | undefined,
  email: (env.VITE_OPERATOR_EMAIL as string | undefined) || 'virya.brightly@gmail.com',
  address: env.VITE_OPERATOR_ADDRESS as string | undefined,
}
export const OPERATOR_CONFIGURED = Boolean(OPERATOR.email)
export const LEGAL_UPDATED = '2026-11-24'
