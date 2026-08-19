/**
 * OTP Service — generates, stores, verifies 6-digit OTPs in localStorage.
 * Sends via EmailJS if configured; falls back to toast for demo mode.
 */
import emailjs from '@emailjs/browser'

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const PUB_KEY     = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const VERIFY_TPL  = import.meta.env.VITE_EMAILJS_VERIFY_TEMPLATE
const RESET_TPL   = import.meta.env.VITE_EMAILJS_RESET_TEMPLATE

const OTP_TTL = 5 * 60 * 1000 // 5 minutes

function otpKey(email, type) {
  return `otp_${type}_${email}`
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function storeOtp(email, type, code) {
  localStorage.setItem(otpKey(email, type), JSON.stringify({
    code,
    expiry: Date.now() + OTP_TTL,
  }))
}

export function verifyOtp(email, type, input) {
  const raw = localStorage.getItem(otpKey(email, type))
  if (!raw) return { ok: false, reason: 'expired' }
  const { code, expiry } = JSON.parse(raw)
  if (Date.now() > expiry) { clearOtp(email, type); return { ok: false, reason: 'expired' } }
  if (input !== code)       return { ok: false, reason: 'invalid' }
  clearOtp(email, type)
  return { ok: true }
}

export function clearOtp(email, type) {
  localStorage.removeItem(otpKey(email, type))
}

export function isOtpActive(email, type) {
  const raw = localStorage.getItem(otpKey(email, type))
  if (!raw) return false
  const { expiry } = JSON.parse(raw)
  return Date.now() < expiry
}

export function otpSecondsLeft(email, type) {
  const raw = localStorage.getItem(otpKey(email, type))
  if (!raw) return 0
  const { expiry } = JSON.parse(raw)
  return Math.max(0, Math.ceil((expiry - Date.now()) / 1000))
}

/**
 * Sends OTP email.
 * If EmailJS env vars are set → sends real email.
 * Otherwise → logs to console (demo mode); caller should show the OTP to the user.
 */
export async function sendOtpEmail(email, code, type) {
  if (SERVICE_ID && PUB_KEY) {
    const templateId = type === 'verify' ? VERIFY_TPL : RESET_TPL
    const cleanKey = PUB_KEY.trim()
    const cleanSvc = SERVICE_ID.trim()
    const cleanTpl = templateId.trim()
    console.info(`[EmailJS debug] svc="${cleanSvc}" tpl="${cleanTpl}" key_len=${cleanKey.length} key_preview="${cleanKey.slice(0,4)}..."`)
    // EmailJS v4: publicKey must be passed as an object, not a plain string
    try {
      await emailjs.send(
        cleanSvc,
        cleanTpl,
        { email, passcode: code, valid_minutes: '5' },
        { publicKey: cleanKey },
      )
    } catch (ejsErr) {
      const detail = ejsErr?.text || ejsErr?.message || JSON.stringify(ejsErr)
      console.error('[EmailJS send error]', detail)
      const enriched = new Error(`EmailJS: ${detail}`)
      enriched.emailjsDetail = detail
      throw enriched
    }
  } else {
    throw new Error('Email service is not configured. Please set up EmailJS credentials.')
  }
}

/** All-in-one: generate → store → send. Returns code (for demo mode). */
export async function issueOtp(email, type) {
  const code = generateOtp()
  storeOtp(email, type, code)
  await sendOtpEmail(email, code, type)
  return code
}

// ── Pending registration store (sessionStorage) ──────────────────────────────
// Holds the registration payload until email verification succeeds.
const pendingKey = email => `pending_reg_${email}`

export function storePendingRegistration(payload) {
  sessionStorage.setItem(pendingKey(payload.email), JSON.stringify(payload))
}

export function getPendingRegistration(email) {
  const raw = sessionStorage.getItem(pendingKey(email))
  return raw ? JSON.parse(raw) : null
}

export function clearPendingRegistration(email) {
  sessionStorage.removeItem(pendingKey(email))
}
