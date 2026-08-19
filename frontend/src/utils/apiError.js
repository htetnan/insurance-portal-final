import { toast } from 'react-toastify'

/**
 * Extracts a human-readable message from an Axios error and shows a toast.
 * Replaces the repeated: catch(err) { toast.error(err.response?.data?.message || fallback) }
 *
 * @param {unknown} err   - The caught error object
 * @param {string}  [fallback] - Message shown when the server gives no detail
 */
export function apiError(err, fallback = 'Something went wrong') {
  const msg = err?.response?.data?.message || err?.message || fallback
  toast.error(msg)
  return msg
}
