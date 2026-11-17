/** ₹499 letter lock and checkout. Off unless explicitly set to "true". */
export function monetisationEnabled() {
  return process.env.NEXT_PUBLIC_MONETISATION_ENABLED === "true"
}
