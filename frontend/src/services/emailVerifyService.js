/**
 * Email verification service — link-based confirmation (no OTP code).
 * Generates a one-time confirmation link, stores it in localStorage, and
 * emails it via EmailJS. In demo mode (no EmailJS keys configured) the link
 * is logged to the console and returned so the UI can show it directly.
 */
import emailjs from '@emailjs/browser'

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const PUB_KEY    = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const VERIFY_TPL = import.meta.env.VITE_EMAILJS_VERIFY_TEMPLATE

const TOKEN_TTL = 24 * 60 * 60 * 1000 // 24 hours
const tokenKey = token => `email_verify_token_${token}`

function generateToken() {
  const random = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID().replace(/-/g, '')
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return random
}

function buildConfirmLink(token, email) {
  return `${window.location.origin}/verify-email/confirm?token=${token}&email=${encodeURIComponent(email)}`
}

/** Generates + stores a fresh token, sends the confirmation email, returns the link. */
export async function sendVerificationEmail(email) {
  const token = generateToken()
  localStorage.setItem(tokenKey(token), JSON.stringify({ email, expiry: Date.now() + TOKEN_TTL }))
  const confirmLink = buildConfirmLink(token, email)

  if (SERVICE_ID && PUB_KEY && VERIFY_TPL) {
    await emailjs.send(
      SERVICE_ID.trim(),
      VERIFY_TPL.trim(),
      { to_email: email, confirm_link: confirmLink },
      { publicKey: PUB_KEY.trim() },
    )
  } else {
    throw new Error('Email service is not configured. Please set up EmailJS credentials.')
  }
  return confirmLink
}

/** Validates a confirmation token. Returns { ok, email, reason }. */
export function consumeVerifyToken(token) {
  const raw = localStorage.getItem(tokenKey(token))
  if (!raw) return { ok: false, reason: 'invalid' }
  const { email, expiry } = JSON.parse(raw)
  localStorage.removeItem(tokenKey(token))
  if (Date.now() > expiry) return { ok: false, reason: 'expired', email }
  return { ok: true, email }
}
