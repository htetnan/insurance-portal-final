import { useState, useRef, useEffect } from 'react'
import { issueOtp, otpSecondsLeft } from '../services/otpService'
import { toast } from 'react-toastify'

const BOX_COUNT = 6

/**
 * Shared OTP input logic used by VerifyEmailPage and ResetPasswordPage.
 * @param {string} email   - email address the OTP was sent to
 * @param {string} purpose - 'verify' or 'reset'
 * @param {function} t     - i18next translation function
 */
export function useOtpInput(email, purpose, t) {
  const [digits, setDigits] = useState(Array(BOX_COUNT).fill(''))
  const [seconds, setSeconds] = useState(() => otpSecondsLeft(email, purpose))
  const [resending, setResending] = useState(false)
  const inputs = useRef([])

  useEffect(() => {
    const id = setInterval(() => setSeconds(otpSecondsLeft(email, purpose)), 1000)
    return () => clearInterval(id)
  }, [email, purpose])

  const focus = i => inputs.current[i]?.focus()

  const handleChange = (i, val) => {
    const ch = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]; next[i] = ch; setDigits(next)
    if (ch && i < BOX_COUNT - 1) focus(i + 1)
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (digits[i]) { const n = [...digits]; n[i] = ''; setDigits(n) }
      else if (i > 0) { const n = [...digits]; n[i - 1] = ''; setDigits(n); focus(i - 1) }
    } else if (e.key === 'ArrowLeft' && i > 0) focus(i - 1)
    else if (e.key === 'ArrowRight' && i < BOX_COUNT - 1) focus(i + 1)
  }

  const handlePaste = e => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, BOX_COUNT)
    const next = Array(BOX_COUNT).fill('')
    text.split('').forEach((c, i) => { next[i] = c })
    setDigits(next)
    focus(Math.min(text.length, BOX_COUNT - 1))
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await issueOtp(email, purpose)
      setSeconds(300)
      setDigits(Array(BOX_COUNT).fill(''))
      focus(0)
      toast.success(t('otp.resent'))
    } catch (err) {
      const detail = err?.emailjsDetail || err?.message || ''
      toast.error(`${t('otp.sendError')} — ${detail}`, { autoClose: false })
    } finally {
      setResending(false)
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const code = digits.join('')

  return {
    digits, setDigits, seconds, resending,
    inputs, mm, ss, code, BOX_COUNT,
    handleChange, handleKeyDown, handlePaste, handleResend, focus,
  }
}
