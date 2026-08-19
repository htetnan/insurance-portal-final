import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

const STATUS_STYLE = {
  SUCCESS: { bg: '#dcfce7', color: '#16a34a', icon: 'bi-check-circle-fill' },
  PARTIAL:  { bg: '#fef9c3', color: '#ca8a04', icon: 'bi-exclamation-triangle-fill' },
  SKIPPED:  { bg: '#f1f5f9', color: '#64748b', icon: 'bi-skip-forward-circle' },
  ERROR:    { bg: '#fee2e2', color: '#dc2626', icon: 'bi-x-circle-fill' },
}
const TYPE_META = {
  AUTO_VERIFY:      { icon: 'bi-shield-check',  color: '#1d4ed8', labelKey: 'typeAutoVerify' },
  REMINDER:         { icon: 'bi-bell-fill',    color: '#d97706', labelKey: 'typeReminder' },
  REVISION_CLEANUP: { icon: 'bi-trash3-fill', color: '#dc2626', labelKey: 'typeCleanup' },
}

// Myanmar timezone offset = UTC+6:30
// Convert "HH:MM" Myanmar time → Spring cron (UTC)
function myanmarTimeToCron(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  let totalMin = h * 60 + m - (6 * 60 + 30)   // subtract UTC+6:30
  if (totalMin < 0) totalMin += 24 * 60
  const utcH = Math.floor(totalMin / 60) % 24
  const utcM = totalMin % 60
  return `0 ${utcM} ${utcH} * * *`
}

// Parse simple daily cron "0 MM HH * * *" → "HH:MM" Myanmar time
function cronToMyanmarTime(cron) {
  try {
    const parts = cron.trim().split(/\s+/)
    if (parts.length < 3) return null
    const utcH = parseInt(parts[2], 10)
    const utcM = parseInt(parts[1], 10)
    if (isNaN(utcH) || isNaN(utcM)) return null
    let totalMin = utcH * 60 + utcM + 6 * 60 + 30   // add UTC+6:30
    if (totalMin >= 24 * 60) totalMin -= 24 * 60
    const mmH = String(Math.floor(totalMin / 60)).padStart(2, '0')
    const mmM = String(totalMin % 60).padStart(2, '0')
    return `${mmH}:${mmM}`
  } catch { return null }
}

function Badge({ status, t }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.SKIPPED
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '0.15rem 0.55rem',
      fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <i className={`bi ${s.icon}`} style={{ fontSize: '0.7rem' }}></i>{t(`admin.autoCheck.status${status}`, status)}
    </span>
  )
}

function StatCard({ icon, label, value, color, bg, sub }) {
  return (
    <div className="card-custom" style={{ padding: '1rem' }}>
      <div className="d-flex align-items-center gap-3">
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`bi ${icon}`} style={{ color, fontSize: '1.2rem' }}></i>
        </div>
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value ?? '—'}</div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
    </div>
  )
}

// ─── Settings Edit Modal ───────────────────────────────────────────────────
function SettingsModal({ status, onClose, onSaved }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    enabled:             status?.enabled ?? true,
    verifyCron:          status?.verifyCron          ?? '0 30 2 * * *',
    reminderCron:        status?.reminderCron        ?? '0 30 1 * * *',
    revisionCleanupCron: status?.revisionCleanupCron ?? '0 0 3 * * *',
    minPendingHours:     status?.minPendingHours     ?? 1,
  })
  // derived Myanmar-time display
  const [verifyTime,   setVerifyTime]   = useState(cronToMyanmarTime(form.verifyCron)          ?? '09:00')
  const [reminderTime, setReminderTime] = useState(cronToMyanmarTime(form.reminderCron)        ?? '08:00')
  const [cleanupTime,  setCleanupTime]  = useState(cronToMyanmarTime(form.revisionCleanupCron) ?? '09:30')
  const [advanced,     setAdvanced]     = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [err,          setErr]          = useState(null)

  const handleTimeChange = (field, cronField, time) => {
    if (field === 'verify')   setVerifyTime(time)
    if (field === 'reminder') setReminderTime(time)
    if (field === 'cleanup')  setCleanupTime(time)
    setForm(f => ({ ...f, [cronField]: myanmarTimeToCron(time) }))
  }

  const save = async () => {
    setSaving(true); setErr(null)
    try {
      await api.put('/admin/autocheck/settings', form)
      onSaved()
    } catch (e) {
      setErr(e?.response?.data?.message || t('admin.autoCheck.settingsSaveFailed'))
    } finally { setSaving(false) }
  }

  const inputStyle = {
    width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8,
    border: '1.5px solid var(--border)', background: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: '0.85rem',
    outline: 'none',
  }
  const labelStyle = { fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9000, padding: '1rem',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#ffffff',
        borderRadius: 20, width: '100%', maxWidth: 560,
        boxShadow: '0 25px 80px rgba(0,0,0,.35)',
        maxHeight: '90vh', overflowY: 'auto',
        border: 'none',
      }}>
        {/* Gradient Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 60%, #7c3aed 100%)',
          borderRadius: '20px 20px 0 0',
          padding: '1.5rem 1.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* decorative circles */}
          <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)', top: -40, right: 60, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)', bottom: -30, right: 20, pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bi bi-gear-fill" style={{ color: '#fff', fontSize: '1rem' }}></i>
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                {t('admin.autoCheck.settingsTitle')}
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginLeft: 46 }}>
              {t('admin.autoCheck.settingsTimezoneDesc')}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
            color: '#fff', fontSize: '1rem', lineHeight: 1,
            width: 32, height: 32, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', flexShrink: 0,
          }}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div style={{ padding: '1.5rem 1.75rem', background: '#ffffff' }}>
          {/* Enable toggle */}
          <div className="d-flex align-items-center justify-content-between mb-4"
            style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '0.9rem 1.1rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                {t('admin.autoCheck.title')}
              </div>
              <div style={{ fontSize: '0.75rem', color: form.enabled ? '#16a34a' : '#dc2626', marginTop: 2, fontWeight: 600 }}>
                <i className={`bi bi-${form.enabled ? 'check-circle-fill' : 'x-circle-fill'} me-1`}></i>
                {form.enabled ? t('admin.autoCheck.enabled') : t('admin.autoCheck.disabled')}
              </div>
            </div>
            <label style={{ position: 'relative', width: 50, height: 28, cursor: 'pointer', flexShrink: 0 }}>
              <input type="checkbox" checked={form.enabled}
                onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 14, transition: '.25s',
                background: form.enabled ? '#1d4ed8' : '#cbd5e1',
                boxShadow: form.enabled ? '0 0 0 3px rgba(29,78,216,0.2)' : 'none',
              }}>
                <span style={{
                  position: 'absolute', width: 22, height: 22, borderRadius: '50%',
                  background: '#fff', top: 3, transition: '.25s',
                  left: form.enabled ? 25 : 3,
                  boxShadow: '0 2px 6px rgba(0,0,0,.25)',
                }}></span>
              </span>
            </label>
          </div>

          {/* Section label */}
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6366f1',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
            <i className="bi bi-clock me-1"></i>Myanmar Time Schedule
          </div>

          {/* Time pickers */}
          <div className="d-flex flex-column gap-3 mb-4">
            {[
               { field: 'verify',   cronField: 'verifyCron',          label: t('admin.autoCheck.verifyTimeLabel'), icon: 'bi-shield-check', color: '#1d4ed8', bg: '#eff6ff', val: verifyTime },
               { field: 'reminder', cronField: 'reminderCron',        label: t('admin.autoCheck.reminderTimeLabel'), icon: 'bi-bell-fill', color: '#d97706', bg: '#fffbeb', val: reminderTime },
               { field: 'cleanup',  cronField: 'revisionCleanupCron', label: t('admin.autoCheck.cleanupTimeLabel'), icon: 'bi-trash3', color: '#dc2626', bg: '#fef2f2', val: cleanupTime },
            ].map(row => (
              <div key={row.field} style={{ background: '#f8fafc', borderRadius: 12, padding: '0.85rem 1rem', border: '1px solid #e2e8f0' }}>
                <label style={{ ...labelStyle, color: '#374151', marginBottom: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: 6, background: row.bg, marginRight: 6 }}>
                    <i className={`bi ${row.icon}`} style={{ color: row.color, fontSize: '0.72rem' }}></i>
                  </span>
                  {row.label}
                </label>
                <div className="d-flex align-items-center gap-2">
                  <input type="time" value={row.val}
                    onChange={e => handleTimeChange(row.field, row.cronField, e.target.value)}
                    style={{ ...inputStyle, flex: 1, background: '#fff', border: '1.5px solid #d1d5db' }} />
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap', minWidth: 110 }}>
                     {t('admin.autoCheck.cronLabel')}: <code style={{ fontSize: '0.68rem', color: '#4f46e5' }}>{form[row.cronField]}</code>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Min pending hours */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '0.85rem 1rem', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
            <label style={{ ...labelStyle, color: '#374151', marginBottom: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: 6, background: '#f5f3ff', marginRight: 6 }}>
                <i className="bi bi-hourglass" style={{ color: '#7c3aed', fontSize: '0.72rem' }}></i>
              </span>
              {t('admin.autoCheck.minPendingHours')}
            </label>
            <input type="number" min={0} max={72} value={form.minPendingHours}
              onChange={e => setForm(f => ({ ...f, minPendingHours: parseInt(e.target.value) || 0 }))}
              style={{ ...inputStyle, width: 120, background: '#fff', border: '1.5px solid #d1d5db' }} />
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 6 }}>
               {t('admin.autoCheck.minPendingDesc')}
            </div>
          </div>

          {/* Advanced: raw cron edit */}
          <button type="button" onClick={() => setAdvanced(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: '#6366f1', fontSize: '0.75rem', padding: 0, marginBottom: 8, fontWeight: 600 }}>
            <i className={`bi bi-chevron-${advanced ? 'up' : 'down'} me-1`}></i>
             {t('admin.autoCheck.advancedCron')}
          </button>
          {advanced && (
            <div className="d-flex flex-column gap-2 mb-3" style={{ background: '#f8fafc', borderRadius: 12, padding: '1rem', border: '1px solid #e2e8f0' }}>
              {[
                 { label: t('admin.autoCheck.verifyCronLabel'), key: 'verifyCron' },
                 { label: t('admin.autoCheck.reminderCronLabel'), key: 'reminderCron' },
                 { label: t('admin.autoCheck.cleanupCronLabel'), key: 'revisionCleanupCron' },
              ].map(row => (
                <div key={row.key}>
                  <label style={{ ...labelStyle, color: '#374151' }}>{row.label}</label>
                  <input value={form[row.key]}
                    onChange={e => setForm(f => ({ ...f, [row.key]: e.target.value }))}
                    placeholder="0 30 2 * * *"
                    style={{ ...inputStyle, background: '#fff', border: '1.5px solid #d1d5db' }} />
                </div>
              ))}
              <div style={{ fontSize: '0.72rem', color: '#64748b', background: '#fff',
                borderRadius: 8, padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0' }}>
                 {t('admin.autoCheck.cronFormat')}: <code style={{ color: '#4f46e5' }}>seconds minutes hours day month weekday</code><br />
                 {t('admin.autoCheck.timezoneFormat')}
              </div>
            </div>
          )}

          {err && (
            <div style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 10, padding: '0.7rem 1rem',
              fontSize: '0.8rem', marginBottom: 12, border: '1px solid #fecaca' }}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>{err}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '0.55rem 1.4rem', borderRadius: 10, border: '1.5px solid #e2e8f0',
                background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
              {t('admin.common.cancel')}
            </button>
            <button type="button" onClick={save} disabled={saving}
              style={{ padding: '0.55rem 1.5rem', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: saving ? '#e2e8f0' : 'linear-gradient(135deg, #1d4ed8, #4f46e5)',
                color: saving ? '#64748b' : '#fff', fontWeight: 700, fontSize: '0.85rem',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: saving ? 'none' : '0 4px 12px rgba(29,78,216,0.35)' }}>
              {saving
                ? <><span className="spinner-border spinner-border-sm"></span> {t('admin.common.saving')}</>
                : <><i className="bi bi-floppy-fill"></i> {t('admin.autoCheck.saveSettings')}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function AdminAutoCheckPage() {
  const { t } = useTranslation()
  const [status,    setStatus]    = useState(null)
  const [logs,      setLogs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [running,   setRunning]   = useState(null)   // 'verify' | 'reminder' | null
  const [logType,   setLogType]   = useState('ALL')
  const [expandLog, setExpandLog] = useState(null)
  const [toast,     setToast]     = useState(null)
  const [showEdit,  setShowEdit]  = useState(false)

  const load = useCallback(() => {
    return Promise.all([
      api.get('/admin/autocheck/status'),
      api.get(`/admin/autocheck/logs?type=${logType}`),
    ]).then(([s, l]) => {
      setStatus(s.data)
      setLogs(l.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [logType])

  useEffect(() => { load() }, [load])

  // auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4500)
  }

  const trigger = async (type) => {
    setRunning(type)
    try {
      const url = type === 'verify'  ? '/admin/autocheck/run/verify'
                : type === 'cleanup' ? '/admin/autocheck/run/cleanup'
                :                      '/admin/autocheck/run/reminders'
      const res = await api.post(url)
      const d = res.data
      if (type === 'verify') {
       showToast(`✅ ${t('admin.autoCheck.verifyComplete', { verified: d.verified ?? 0, skipped: d.skipped ?? 0, errors: d.errors ?? 0 })}`)
      } else {
        showToast(`✅ ${t('admin.autoCheck.runComplete')}`)
      }
      await load()
    } catch (e) {
      showToast('❌ ' + (e?.response?.data?.message || t('admin.autoCheck.errorOccurred')), false)
    } finally {
      setRunning(null)
    }
  }

  const handleSettingsSaved = async () => {
    setShowEdit(false)
    showToast(`✅ ${t('admin.autoCheck.settingsSaved')}`)
    await load()
  }

  if (loading) return (
    <div className="text-center py-5">
      <div className="spinner-border" style={{ color: 'var(--primary)' }}></div>
    </div>
  )

  const lastVerify   = status?.lastRuns?.AUTO_VERIFY
  const lastReminder = status?.lastRuns?.REMINDER
  const lastCleanup  = status?.lastRuns?.REVISION_CLEANUP

  const verifyMM   = cronToMyanmarTime(status?.verifyCron)
  const reminderMM = cronToMyanmarTime(status?.reminderCron)

  return (
    <div className="fade-in">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? '#dcfce7' : '#fee2e2',
          color: toast.ok ? '#16a34a' : '#dc2626',
          border: `1px solid ${toast.ok ? '#86efac' : '#fca5a5'}`,
          borderRadius: 10, padding: '0.75rem 1.25rem',
          fontWeight: 600, fontSize: '0.85rem', boxShadow: '0 4px 20px rgba(0,0,0,.12)',
          maxWidth: 460,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Settings modal */}
      {showEdit && (
        <SettingsModal
          status={status}
          onClose={() => setShowEdit(false)}
          onSaved={handleSettingsSaved}
        />
      )}

      {/* Header */}
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <i className="bi bi-robot me-2" style={{ color: 'var(--primary)' }}></i>
            {t('admin.autoCheck.title')}
          </h4>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.88rem' }}>
            {t('admin.autoCheck.subtitle')}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: status?.enabled ? '#dcfce7' : '#fee2e2',
            color: status?.enabled ? '#16a34a' : '#dc2626',
            border: `1px solid ${status?.enabled ? '#86efac' : '#fca5a5'}`,
            borderRadius: 8, padding: '0.35rem 0.85rem', fontWeight: 700, fontSize: '0.82rem',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%',
              background: status?.enabled ? '#16a34a' : '#dc2626',
              display: 'inline-block', animation: status?.enabled ? 'pulse 2s infinite' : 'none' }}></span>
            {status?.enabled ? t('admin.autoCheck.statusActive') : t('admin.autoCheck.statusDisabled')}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: status?.aiEnabled ? '#eff6ff' : '#f8fafc',
            color: status?.aiEnabled ? '#1d4ed8' : '#94a3b8',
            border: `1px solid ${status?.aiEnabled ? '#bfdbfe' : '#e2e8f0'}`,
            borderRadius: 8, padding: '0.35rem 0.85rem', fontWeight: 600, fontSize: '0.8rem',
          }}>
            <i className="bi bi-stars"></i>
            {status?.aiEnabled ? t('admin.autoCheck.aiEnabledBadge') : t('admin.autoCheck.aiMissingBadge')}
          </span>
          {/* ← Edit settings button */}
          <button type="button" onClick={() => setShowEdit(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0.35rem 0.9rem', borderRadius: 8, border: '1.5px solid var(--border)',
              background: 'var(--bg-primary)', color: 'var(--text-primary)',
              fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
            }}>
             <i className="bi bi-gear"></i> {t('admin.autoCheck.editSettingsBtn')}
          </button>
        </div>
      </div>


      {/* Stats row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
           <StatCard icon="bi-shield-check" label={t('admin.autoCheck.todayVerified')} value={status?.todayVerified ?? 0}
             color="#1d4ed8" bg="#eff6ff" sub={t('admin.autoCheck.todayVerifiedSub')} />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon="bi-bell-fill" label={t('admin.autoCheck.todayReminders')} value={status?.todayReminders ?? 0}
             color="#d97706" bg="#fffbeb" sub={t('admin.autoCheck.remindersSentSub')} />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon="bi-clock"
             label={t('admin.autoCheck.verifyTime')}
            value={verifyMM ?? '—'}
            color="#7c3aed" bg="#f5f3ff"
             sub={`${t('admin.autoCheck.myanmarTime')} • ${status?.verifyCron ?? ''}`} />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon="bi-alarm"
             label={t('admin.autoCheck.reminderTime')}
            value={reminderMM ?? '—'}
            color="#0891b2" bg="#ecfeff"
             sub={`${t('admin.autoCheck.myanmarTime')} • ${status?.reminderCron ?? ''}`} />
        </div>
      </div>

      {/* Configuration + Last runs */}
      <div className="row g-4 mb-4">
        {/* Scheduler config */}
        <div className="col-12 col-lg-5">
          <div className="card-custom h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                <i className="bi bi-gear me-2" style={{ color: 'var(--primary)' }}></i>
                 {t('admin.autoCheck.schedulerSettingsTitle')}
              </h6>
              <button type="button" onClick={() => setShowEdit(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700, padding: 0 }}>
                 <i className="bi bi-pencil me-1"></i>{t('admin.autoCheck.editSettingsBtn')}
              </button>
            </div>
            <div className="d-flex flex-column gap-3">
              {[
                {
                   label: t('admin.autoCheck.verifyTimeLabel'),
                   value: verifyMM ? `${verifyMM} (${t('admin.autoCheck.myanmarTime')}) · ${status?.verifyCron}` : (status?.verifyCron ?? '—'),
                  icon: 'bi-shield-check', color: '#1d4ed8'
                },
                {
                   label: t('admin.autoCheck.reminderTimeLabel'),
                   value: reminderMM ? `${reminderMM} (${t('admin.autoCheck.myanmarTime')}) · ${status?.reminderCron}` : (status?.reminderCron ?? '—'),
                  icon: 'bi-bell', color: '#d97706'
                },
                {
                   label: t('admin.autoCheck.cleanupCronLabel'),
                  value: status?.revisionCleanupCron ?? '—',
                  icon: 'bi-trash3', color: '#dc2626'
                },
                {
                   label: t('admin.autoCheck.minPendingHours'),
                   value: `${status?.minPendingHours ?? '—'} ${t('admin.autoCheck.hours')}`,
                  icon: 'bi-hourglass', color: '#7c3aed'
                },
                {
                   label: t('admin.autoCheck.currentMyanmarTime'),
                  value: status?.currentTimeMM ?? '—',
                  icon: 'bi-clock', color: '#0891b2'
                },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <i className={`bi ${row.icon}`} style={{ color: row.color, fontSize: '0.9rem' }}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{row.label}</div>
                    <code style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, wordBreak: 'break-all' }}>
                      {row.value}
                    </code>
                  </div>
                </div>
              ))}
            </div>
            {status?.settingsUpdatedAt && (
              <div style={{ marginTop: 12, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                 {t('admin.autoCheck.lastUpdatedLabel')}: {new Date(status.settingsUpdatedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Last runs */}
        <div className="col-12 col-lg-7">
          <div className="card-custom h-100">
            <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              <i className="bi bi-clock-history me-2" style={{ color: 'var(--primary)' }}></i>
               {t('admin.autoCheck.lastRunsTitle')}
            </h6>
            <div className="d-flex flex-column gap-3">
              {[
                { key: 'AUTO_VERIFY',      data: lastVerify   },
                { key: 'REMINDER',         data: lastReminder },
                { key: 'REVISION_CLEANUP', data: lastCleanup  },
              ].map(({ key, data }) => {
                 const type = TYPE_META[key]
                return (
                  <div key={key} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '0.85rem 1rem' }}>
                    <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                      <div className="d-flex align-items-center gap-2">
                         <i className={`bi ${type.icon}`} style={{ color: type.color, fontSize: '1rem' }}></i>
                         <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t(`admin.autoCheck.${type.labelKey}`)}</span>
                      </div>
                       {data ? <Badge status={data.status} t={t} /> : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('admin.autoCheck.noRecord')}</span>}
                    </div>
                    {data && (
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{data.summary}</div>
                        <div className="d-flex gap-3 flex-wrap">
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                             {t('admin.autoCheck.checkedLabel')}: <b style={{ color: 'var(--text-primary)' }}>{data.totalChecked}</b>
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                             {t('admin.autoCheck.resultLabel')}: <b style={{ color: '#16a34a' }}>{data.affectedCount}</b>
                          </span>
                          {data.aiAssisted && (
                            <span style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: 600 }}>
                               <i className="bi bi-stars me-1"></i>{t('admin.autoCheck.aiAssisted')}
                            </span>
                          )}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {data.createdAt ? new Date(data.createdAt).toLocaleString() : '—'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Manual trigger buttons */}
      <div className="card-custom mb-4">
        <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          <i className="bi bi-play-circle me-2" style={{ color: 'var(--primary)' }}></i>
           {t('admin.autoCheck.manualRunTitle')}
        </h6>
        <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
           {t('admin.autoCheck.manualRunDesc')}
        </p>
        <div className="d-flex gap-3 flex-wrap">
          <button type="button" onClick={() => trigger('verify')} disabled={running !== null}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0.55rem 1.25rem', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: running === 'verify' ? '#e2e8f0' : 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              color: running === 'verify' ? '#64748b' : '#fff',
              fontWeight: 700, fontSize: '0.85rem', transition: 'all .15s',
            }}>
            {running === 'verify'
               ? <><span className="spinner-border spinner-border-sm"></span> {t('admin.autoCheck.runningLabel')}</>
              : <><i className="bi bi-shield-check"></i> {t('admin.autoCheck.runNow')}</>}
          </button>
          <button type="button" onClick={() => trigger('reminder')} disabled={running !== null}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0.55rem 1.25rem', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: running === 'reminder' ? '#e2e8f0' : 'linear-gradient(135deg, #d97706, #f59e0b)',
              color: running === 'reminder' ? '#64748b' : '#fff',
              fontWeight: 700, fontSize: '0.85rem', transition: 'all .15s',
            }}>
            {running === 'reminder'
               ? <><span className="spinner-border spinner-border-sm"></span> {t('admin.autoCheck.sendingLabel')}</>
              : <><i className="bi bi-bell"></i> {t('admin.autoCheck.runNow')}</>}
          </button>
        </div>
      </div>

      {/* Log table */}
      <div className="card-custom p-0">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            <i className="bi bi-list-ul me-2" style={{ color: 'var(--primary)' }}></i>
             {t('admin.autoCheck.logTableTitle')}
          </div>
          <div className="d-flex gap-1" style={{ background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 8 }}>
            {['ALL', 'AUTO_VERIFY', 'REMINDER', 'REVISION_CLEANUP'].map(filterType => (
              <button key={filterType} type="button" onClick={() => setLogType(filterType)}
                style={{
                  padding: '0.3rem 0.75rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.75rem',
                   background: logType === filterType ? 'var(--bg-primary)' : 'transparent',
                   color: logType === filterType ? 'var(--text-primary)' : 'var(--text-muted)',
                   boxShadow: logType === filterType ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                }}>
                 {filterType === 'ALL' ? t('admin.autoCheck.logAll') : filterType === 'AUTO_VERIFY' ? t('admin.autoCheck.filterVerify') : filterType === 'REMINDER' ? t('admin.autoCheck.filterReminder') : t('admin.autoCheck.filterCleanup')}
              </button>
            ))}
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <i className="bi bi-inbox" style={{ fontSize: '2rem', opacity: 0.3, display: 'block', marginBottom: 8 }}></i>
             {t('admin.autoCheck.noLogsMsg')}
          </div>
        ) : (
          <div>
            {logs.map((log, idx) => {
               const type = TYPE_META[log.checkType] || { labelKey: null, icon: 'bi-circle', color: '#64748b' }
              const isOpen = expandLog === idx
              return (
                <div key={log.id} style={{ borderBottom: idx < logs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div
                    onClick={() => setExpandLog(isOpen ? null : idx)}
                    style={{ padding: '0.75rem 1.25rem', cursor: 'pointer',
                      background: isOpen ? 'var(--bg-secondary)' : 'transparent',
                      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem 1rem' }}>
                    <div className="d-flex align-items-center gap-2" style={{ minWidth: 180 }}>
                       <i className={`bi ${type.icon}`} style={{ color: type.color, fontSize: '0.9rem' }}></i>
                       <span style={{ fontWeight: 600, fontSize: '0.83rem', color: 'var(--text-primary)' }}>{type.labelKey ? t(`admin.autoCheck.${type.labelKey}`) : log.checkType}</span>
                    </div>
                     <Badge status={log.status} t={t} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flex: 1 }}>{log.summary}</span>
                    <div className="d-flex align-items-center gap-3">
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                         {t('admin.autoCheck.checkedLabel')}: <b>{log.totalChecked}</b> · {t('admin.autoCheck.resultLabel')}: <b style={{ color: '#16a34a' }}>{log.affectedCount}</b>
                      </span>
                       {log.aiAssisted && <i className="bi bi-stars" style={{ color: '#1d4ed8', fontSize: '0.85rem' }} title={t('admin.autoCheck.aiAssisted')}></i>}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                      </span>
                      <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}></i>
                    </div>
                  </div>

                  {isOpen && log.details?.length > 0 && (
                    <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 1.25rem 0.75rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                         {t('admin.autoCheck.detailsLabel')} ({log.details.length} {t('admin.autoCheck.items')})
                      </div>
                      <div className="d-flex flex-column gap-1" style={{ maxHeight: 280, overflowY: 'auto' }}>
                        {log.details.map((d, i) => {
                          const outcome = d.outcome || d.status || 'UNKNOWN'
                          const s = STATUS_STYLE[outcome] || STATUS_STYLE.SKIPPED
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem 0.75rem',
                              background: 'var(--bg-primary)', borderRadius: 7, padding: '0.4rem 0.75rem',
                              border: '1px solid var(--border)', fontSize: '0.78rem' }}>
                              <span style={{ background: s.bg, color: s.color, borderRadius: 4,
                                padding: '0.1rem 0.4rem', fontWeight: 700, fontSize: '0.7rem' }}>{outcome}</span>
                               {d.paymentId   && <span style={{ color: 'var(--text-muted)' }}>{t('admin.autoCheck.payment')} #{d.paymentId}</span>}
                              {d.customer    && <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.customer}</span>}
                              {d.customerName && <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.customerName}</span>}
                              {d.policy      && <span style={{ color: 'var(--text-secondary)' }}>{d.policy}</span>}
                              {d.amount      && <span style={{ color: '#16a34a', fontWeight: 700 }}>{Number(d.amount).toLocaleString()} MMK</span>}
                              {d.period      && <span style={{ color: '#7c3aed' }}>{d.period}</span>}
                              {d.urgency     && <span style={{ color: d.urgency === 'OVERDUE' ? '#dc2626' : '#d97706', fontWeight: 600 }}>{d.urgency}</span>}
                              {d.reason      && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>({d.reason})</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
