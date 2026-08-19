import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import ProfileAvatar from '../../components/ProfileAvatar'
import PasswordStrengthWidget from '../../components/PasswordStrengthWidget'
import { issueOtp, verifyOtp, otpSecondsLeft } from '../../services/otpService'
import { PHONE_PATTERN, PHONE_ERROR, isStrongPassword } from '../../utils/validation'

const OTP_TYPE = 'profile-change'
const OTP_BOX_COUNT = 6

function handlePhoneChange(val, setter) {
  if (!val) { setter(''); return }
  if (!val.startsWith('+95')) { setter('+95'); return }
  setter(val)
}

export default function CustomerProfilePage() {
  const { t } = useTranslation()
  const { user, setUser } = useAuth()
  const [editMode, setEditMode] = useState(false)
  const [address, setAddress] = useState(user?.address || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null)
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState(null)
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwdFocused, setPwdFocused] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

  // ── Change Password modal ──
  const [showPwdModal, setShowPwdModal] = useState(false)

  // ── "Forgot password" style change — verify via emailed code instead of current password ──
  const [useOtpMode, setUseOtpMode] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [otpDigits, setOtpDigits] = useState(Array(OTP_BOX_COUNT).fill(''))
  const [otpPwd, setOtpPwd] = useState({ newPassword: '', confirmPassword: '' })
  const [otpPwdFocused, setOtpPwdFocused] = useState(false)
  const [savingOtpPwd, setSavingOtpPwd] = useState(false)
  const [otpSeconds, setOtpSeconds] = useState(0)
  const otpInputs = useRef([])

  useEffect(() => {
    if (!otpSent) return
    const id = setInterval(() => setOtpSeconds(otpSecondsLeft(user?.email, OTP_TYPE)), 1000)
    return () => clearInterval(id)
  }, [otpSent, user?.email])

  const resetOtpFlow = () => {
    setUseOtpMode(false)
    setOtpSent(false)
    setOtpDigits(Array(OTP_BOX_COUNT).fill(''))
    setOtpPwd({ newPassword: '', confirmPassword: '' })
  }

  const closePwdModal = () => {
    setShowPwdModal(false)
    setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPwdFocused(false)
    resetOtpFlow()
  }

  const handleSendOtp = async () => {
    setSendingOtp(true)
    try {
      await issueOtp(user.email, OTP_TYPE)
      setOtpSent(true)
      setOtpSeconds(otpSecondsLeft(user.email, OTP_TYPE))
      toast.success(t('profile.codeSent'))
    } catch {
      toast.error(t('profile.codeSendFail'))
    } finally { setSendingOtp(false) }
  }

  const handleOtpDigitChange = (i, val) => {
    const ch = val.replace(/\D/g, '').slice(-1)
    const next = [...otpDigits]; next[i] = ch; setOtpDigits(next)
    if (ch && i < OTP_BOX_COUNT - 1) otpInputs.current[i + 1]?.focus()
  }

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
      const n = [...otpDigits]; n[i - 1] = ''; setOtpDigits(n); otpInputs.current[i - 1]?.focus()
    }
  }

  const handleOtpPwdSubmit = async e => {
    e.preventDefault()
    const code = otpDigits.join('')
    if (code.length < OTP_BOX_COUNT) { toast.error(t('profile.enterFullCode')); return }
    if (!isStrongPassword(otpPwd.newPassword)) {
      toast.error(t('profile.pwdStrong'))
      return
    }
    if (otpPwd.newPassword !== otpPwd.confirmPassword) { toast.error(t('profile.pwdMismatch')); return }

    const result = verifyOtp(user.email, OTP_TYPE, code)
    if (!result.ok) {
      toast.error(result.reason === 'expired' ? t('profile.codeExpired') : t('profile.codeIncorrect'))
      setOtpDigits(Array(OTP_BOX_COUNT).fill(''))
      otpInputs.current[0]?.focus()
      return
    }

    setSavingOtpPwd(true)
    try {
      const { data } = await api.put('/auth/profile/password-otp', { newPassword: otpPwd.newPassword })
      setUser(data)
      toast.success(t('profile.pwdChanged'))
      resetOtpFlow()
      setShowPwdModal(false)
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.pwdFailed'))
    } finally { setSavingOtpPwd(false) }
  }

  const handleResendOtp = async () => {
    setSendingOtp(true)
    try {
      await issueOtp(user.email, OTP_TYPE)
      setOtpSeconds(otpSecondsLeft(user.email, OTP_TYPE))
      setOtpDigits(Array(OTP_BOX_COUNT).fill(''))
      otpInputs.current[0]?.focus()
      toast.success(t('profile.codeResent'))
    } catch { toast.error(t('profile.codeResendFail')) }
    finally { setSendingOtp(false) }
  }

  const otpMM = String(Math.floor(otpSeconds / 60)).padStart(2, '0')
  const otpSS = String(otpSeconds % 60).padStart(2, '0')

  const handlePhotoSelected = file => {
    setPendingPhotoFile(file)
    setPendingPhotoPreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  const clearPendingPhoto = () => {
    setPendingPhotoPreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setPendingPhotoFile(null)
  }

  const handleProfileSubmit = async e => {
    e.preventDefault()
    // Treat "+95" alone (no digits after) as empty phone
    const phoneVal = phone === '+95' ? '' : phone
    if (phoneVal && !PHONE_PATTERN.test(phoneVal)) { toast.error(PHONE_ERROR); return }
    setSavingProfile(true)
    try {
      if (pendingPhotoFile) {
        const formData = new FormData()
        formData.append('file', pendingPhotoFile)
        await api.post('/auth/profile/picture', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      const { data } = await api.put('/auth/profile', { address, phone: phoneVal })
      setUser(data)
      clearPendingPhoto()
      toast.success(t('profile.updateSuccess'))
      setEditMode(false)
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.updateFailed'))
    } finally { setSavingProfile(false) }
  }

  const handleCancelEdit = () => {
    setAddress(user?.address || '')
    setPhone(user?.phone || '')
    clearPendingPhoto()
    setEditMode(false)
  }

  const handlePasswordSubmit = async e => {
    e.preventDefault()
    if (!isStrongPassword(pwd.newPassword)) {
      toast.error(t('profile.pwdStrong'))
      return
    }
    if (pwd.newPassword !== pwd.confirmPassword) {
      toast.error(t('profile.pwdMismatch'))
      return
    }
    setSavingPwd(true)
    try {
      const { data } = await api.put('/auth/profile', {
        currentPassword: pwd.currentPassword, newPassword: pwd.newPassword,
      })
      setUser(data)
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success(t('profile.pwdChanged'))
      setShowPwdModal(false)
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.pwdFailed'))
    } finally { setSavingPwd(false) }
  }

  const phoneInvalid = phone && phone !== '+95' && !PHONE_PATTERN.test(phone)

  return (
    <div className="profile-page-modern legacy-profile-redesign fade-in">
      <div className="mb-4">
        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('profile.title')}</h4>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          {t('profile.subtitle')}
        </p>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="card-custom">
            <div className="d-flex align-items-center gap-3 mb-4">
              <ProfileAvatar
                fetchUrl="/auth/profile/picture"
                hasPicture={user?.hasProfilePicture}
                name={user?.name}
                size={80}
                editable={editMode}
                deferUpload
                onFileSelected={handlePhotoSelected}
                previewOverrideUrl={pendingPhotoPreview}
              />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user?.name}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {editMode ? t('profile.editPhoto') : t('profile.yourPhoto')}
                </div>
              </div>
            </div>
            <h6 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              {editMode ? t('profile.editTitle') : t('profile.viewTitle')}
            </h6>
            <form onSubmit={handleProfileSubmit}>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label-custom">{t('profile.fullName')}</label>
                  <input disabled className="form-control-custom w-100" value={user?.name || ''} style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label-custom">{t('profile.email')}</label>
                  <input disabled className="form-control-custom w-100" value={user?.email || ''} style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label-custom">{t('profile.phone')}</label>
                  <input
                    disabled={!editMode}
                    className="form-control-custom w-100"
                    value={phone}
                    placeholder="+959xxxxxxxx"
                    onChange={e => handlePhoneChange(e.target.value, setPhone)}
                    onFocus={() => { if (!phone) setPhone('+95') }}
                    onBlur={() => { if (phone === '+95') setPhone('') }}
                    onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                    style={{
                      ...(phoneInvalid ? { borderColor: '#ef4444' } : undefined),
                      ...(!editMode ? { opacity: 0.6, cursor: 'not-allowed' } : undefined),
                    }}
                  />
                  {editMode && phoneInvalid && (
                    <p style={{ fontSize: '0.76rem', color: '#ef4444', margin: '0.25rem 0 0' }}>{PHONE_ERROR}</p>
                  )}
                  {editMode && (
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                      {t('profile.phoneHint')}
                    </p>
                  )}
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label-custom">{t('profile.address')}</label>
                  <input disabled={!editMode} className="form-control-custom w-100" value={address}
                    onChange={e => setAddress(e.target.value)} placeholder={t('profile.yourAddress')}
                    onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                    style={!editMode ? { opacity: 0.6, cursor: 'not-allowed' } : undefined} />
                </div>
              </div>
              <div className="mt-3 d-flex gap-2">
                {editMode ? (
                  <React.Fragment key="edit-actions">
                    <button type="submit" disabled={savingProfile} className="btn-primary-custom" style={{ justifyContent: 'center' }}>
                      {savingProfile ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('profile.saving')}</> : t('profile.saveChanges')}
                    </button>
                    <button type="button" onClick={handleCancelEdit} className="btn-outline-custom" style={{ justifyContent: 'center' }}>
                      {t('profile.cancel')}
                    </button>
                  </React.Fragment>
                ) : (
                  <React.Fragment key="view-actions">
                    <button type="button" onClick={() => setEditMode(true)} className="btn-primary-custom" style={{ justifyContent: 'center' }}>
                      <i className="bi bi-pencil me-2"></i>{t('profile.update')}
                    </button>
                    <button type="button" onClick={() => setShowPwdModal(true)} className="btn-outline-custom" style={{ justifyContent: 'center' }}>
                      <i className="bi bi-key me-2"></i>{t('profile.changePassword')}
                    </button>
                  </React.Fragment>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPwdModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={closePwdModal}>
          <div className="card-custom fade-in" style={{ maxWidth: 440, width: '100%', margin: 0, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between mb-1">
              <h6 style={{ fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{t('profile.changePasswordTitle')}</h6>
              <button className="icon-btn" onClick={closePwdModal}><i className="bi bi-x-lg"></i></button>
            </div>

            <div className="mb-3">
              {!useOtpMode ? (
                <button type="button" onClick={() => setUseOtpMode(true)} style={{
                  background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600,
                  fontSize: '0.8rem', cursor: 'pointer', padding: 0,
                }}>
                  <i className="bi bi-envelope-check me-1"></i>{t('profile.forgotUseEmail')}
                </button>
              ) : (
                <button type="button" onClick={resetOtpFlow} style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600,
                  fontSize: '0.8rem', cursor: 'pointer', padding: 0,
                }}>
                  <i className="bi bi-arrow-left me-1"></i>{t('profile.useCurrentPwd')}
                </button>
              )}
            </div>

            {!useOtpMode ? (
              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-3">
                  <label className="form-label-custom">{t('profile.currentPassword')}</label>
                  <input type="password" className="form-control-custom w-100" value={pwd.currentPassword}
                    onChange={e => setPwd(p => ({ ...p, currentPassword: e.target.value }))} />
                </div>
                <div className="mb-2">
                  <label className="form-label-custom">{t('profile.newPassword')}</label>
                  <input type="password" className="form-control-custom w-100" value={pwd.newPassword}
                    onChange={e => setPwd(p => ({ ...p, newPassword: e.target.value }))}
                    onFocus={() => setPwdFocused(true)} onBlur={() => setPwdFocused(false)} />
                  {(pwdFocused || pwd.newPassword.length > 0) && (
                    <PasswordStrengthWidget password={pwd.newPassword} compact />
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label-custom">{t('profile.confirmNewPassword')}</label>
                  <div style={{ position: 'relative' }}>
                    <input type="password" className="form-control-custom w-100" value={pwd.confirmPassword}
                      style={{ paddingRight: '2.5rem' }}
                      onChange={e => setPwd(p => ({ ...p, confirmPassword: e.target.value }))} />
                    {pwd.confirmPassword.length > 0 && (
                      <span style={{
                        position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                        color: pwd.confirmPassword === pwd.newPassword ? '#16a34a' : '#ef4444',
                      }}>
                        <i className={`bi bi-${pwd.confirmPassword === pwd.newPassword ? 'check-circle-fill' : 'x-circle-fill'}`}></i>
                      </span>
                    )}
                  </div>
                </div>
                <button type="submit" disabled={savingPwd} className="btn-primary-custom w-100" style={{ justifyContent: 'center' }}>
                  {savingPwd ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('profile.updating')}</> : t('profile.changePassword')}
                </button>
              </form>
            ) : (
              <div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {t('profile.otpDesc', { email: user?.email })}
                </p>

                {!otpSent ? (
                  <button type="button" onClick={handleSendOtp} disabled={sendingOtp}
                    className="btn-primary-custom w-100" style={{ justifyContent: 'center' }}>
                    {sendingOtp
                      ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('profile.sending')}</>
                      : <><i className="bi bi-send me-2"></i>{t('profile.sendCode')}</>}
                  </button>
                ) : (
                  <form onSubmit={handleOtpPwdSubmit}>
                    <label className="form-label-custom mb-2">{t('profile.verificationCode')}</label>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      {otpDigits.map((d, i) => (
                        <input key={i} ref={el => otpInputs.current[i] = el}
                          type="text" inputMode="numeric" maxLength={1} value={d}
                          onChange={e => handleOtpDigitChange(i, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(i, e)}
                          onFocus={e => e.target.select()}
                          style={{
                            width: 40, height: 46, textAlign: 'center',
                            fontSize: '1.1rem', fontWeight: 700,
                            border: `2px solid ${d ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: 8, background: 'var(--bg-primary)',
                            color: 'var(--text-primary)', outline: 'none',
                          }}
                        />
                      ))}
                    </div>

                    {otpSeconds > 0 ? (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        <i className="bi bi-clock me-1"></i>
                        {t('profile.expiresIn')} <strong style={{ color: otpSeconds < 60 ? '#ef4444' : 'var(--text-primary)' }}>{otpMM}:{otpSS}</strong>
                      </p>
                    ) : (
                      <div style={{ marginBottom: '1rem' }}>
                        <button type="button" onClick={handleResendOtp} disabled={sendingOtp} style={{
                          background: 'none', border: 'none', color: 'var(--primary)',
                          fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', padding: 0,
                        }}>
                          {sendingOtp ? <><span className="spinner-border spinner-border-sm me-1"></span>{t('profile.resending')}</> :
                            <><i className="bi bi-arrow-repeat me-1"></i>{t('profile.resendCode')}</>}
                        </button>
                      </div>
                    )}

                    <div className="mb-2">
                      <label className="form-label-custom">{t('profile.newPassword')}</label>
                      <input type="password" className="form-control-custom w-100" value={otpPwd.newPassword}
                        onChange={e => setOtpPwd(p => ({ ...p, newPassword: e.target.value }))}
                        onFocus={() => setOtpPwdFocused(true)} onBlur={() => setOtpPwdFocused(false)} />
                      {(otpPwdFocused || otpPwd.newPassword.length > 0) && (
                        <PasswordStrengthWidget password={otpPwd.newPassword} compact />
                      )}
                    </div>
                    <div className="mb-3">
                      <label className="form-label-custom">{t('profile.confirmNewPassword')}</label>
                      <div style={{ position: 'relative' }}>
                        <input type="password" className="form-control-custom w-100" value={otpPwd.confirmPassword}
                          style={{ paddingRight: '2.5rem' }}
                          onChange={e => setOtpPwd(p => ({ ...p, confirmPassword: e.target.value }))} />
                        {otpPwd.confirmPassword.length > 0 && (
                          <span style={{
                            position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                            color: otpPwd.confirmPassword === otpPwd.newPassword ? '#16a34a' : '#ef4444',
                          }}>
                            <i className={`bi bi-${otpPwd.confirmPassword === otpPwd.newPassword ? 'check-circle-fill' : 'x-circle-fill'}`}></i>
                          </span>
                        )}
                      </div>
                    </div>
                    <button type="submit" disabled={savingOtpPwd} className="btn-primary-custom w-100" style={{ justifyContent: 'center' }}>
                      {savingOtpPwd ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('profile.updating')}</> : t('profile.changePassword')}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
