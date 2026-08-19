/**
 * Shared validation constants and helpers used across all roles.
 */

// ── Email ─────────────────────────────────────────────────────────────────
// Rules:
//   - local part: starts with a lowercase letter, then lowercase letters/digits/dots only
//   - domain: lowercase letters, digits, dots, hyphens (standard domain chars)
//   - TLD: lowercase letters only, min 2
//   - no uppercase anywhere
//   - no special characters in the local part (no _%+- etc.)
//   - total length ≤ 30 characters
export const EMAIL_PATTERN = /^[a-z][a-z0-9.]*@[a-z0-9.-]+\.[a-z]{2,}$/
export const EMAIL_MAX_LENGTH = 30

export const EMAIL_ERROR = {
  en: 'Email must be lowercase only, use letters/digits/dots only (no special chars), max 30 characters',
  my: 'အီးမေးလ်သည် သေးစာလုံးများသာ ဖြစ်ရမည်၊ စာလုံး/ဂဏန်း/dot (.) သာ သုံးနိုင်ပြီး အများဆုံး ၃၀ လုံးသာ ဖြစ်ရမည်',
}

export function isEmailValid(email) {
  return (
    typeof email === 'string' &&
    email.length > 0 &&
    email.length <= EMAIL_MAX_LENGTH &&
    EMAIL_PATTERN.test(email)
  )
}

// ── Phone ─────────────────────────────────────────────────────────────────
// Rules:
//   - auto-prefix: +95
//   - after +95, must start with 9
//   - total digits after +95: 8–10 (i.e. 9 + 7–9 more digits)
export const PHONE_PATTERN = /^\+959\d{7,10}$/
export const PHONE_ERROR =
  'Phone must start with +959 followed by 7–10 more digits (e.g. +9591234567)'

// ── Password ──────────────────────────────────────────────────────────────
// Rules: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
export const PWD_RULES = [
  {
    key: 'len',
    test: p => p.length >= 8,
    label: { en: 'At least 8 characters', my: 'အနည်းဆုံး ၈ လုံး' },
  },
  {
    key: 'upper',
    test: p => /[A-Z]/.test(p),
    label: { en: 'One uppercase letter (A–Z)', my: 'အကြီးစာလုံး (A–Z) တစ်လုံး' },
  },
  {
    key: 'lower',
    test: p => /[a-z]/.test(p),
    label: { en: 'One lowercase letter (a–z)', my: 'အသေးစာလုံး (a–z) တစ်လုံး' },
  },
  {
    key: 'num',
    test: p => /[0-9]/.test(p),
    label: { en: 'One number (0–9)', my: 'ဂဏန်း (0–9) တစ်လုံး' },
  },
  {
    key: 'special',
    test: p => /[^A-Za-z0-9]/.test(p),
    label: { en: 'One special character (!@#$…)', my: 'အထူးအက္ခရာ (!@#$…) တစ်လုံး' },
  },
]

export function isStrongPassword(pwd) {
  return typeof pwd === 'string' && PWD_RULES.every(r => r.test(pwd))
}

/** Strength level 0–4 for the colour bar on RegisterPage */
export function passwordStrengthLevel(pwd) {
  const passed = PWD_RULES.filter(r => r.test(pwd)).length
  if (passed <= 1) return { level: 0, label: '' }
  if (passed === 2) return { level: 1, label: 'Weak',   color: '#ef4444' }
  if (passed === 3) return { level: 2, label: 'Fair',   color: '#f59e0b' }
  if (passed === 4) return { level: 3, label: 'Good',   color: '#3b82f6' }
  return              { level: 4, label: 'Strong', color: '#16a34a' }
}

/** Normalise a phone input: always starts with "+95", blocks prefix deletion. */
export function normalisePhone(newVal) {
  if (!newVal) return newVal
  if (!newVal.startsWith('+95')) return '+95'
  return newVal
}
