import { useEffect, useRef } from 'react'

/**
 * DeleteConfirmModal — Attractive centered delete confirmation dialog.
 *
 * Props:
 *   open       {boolean}  — whether the modal is visible
 *   title      {string}   — headline (e.g. "Delete User?")
 *   message    {string}   — body text explaining the consequence
 *   onConfirm  {fn}       — called when "Delete" is clicked
 *   onCancel   {fn}       — called when "Cancel" or backdrop is clicked
 *   loading    {boolean}  — shows spinner on Delete button while working
 *   confirmLabel {string} — override Delete button label (default "Delete")
 *   danger     {boolean}  — false → use warning amber instead of red (optional)
 */
export default function DeleteConfirmModal({
  open,
  title = 'ဖျက်မည်လား?',
  message = 'ဤလုပ်ဆောင်ချက်ကို ပြန်မလုပ်နိုင်ပါ။',
  onConfirm,
  onCancel,
  loading = false,
  confirmLabel = 'Delete',
  danger = true,
}) {
  const confirmRef = useRef(null)

  // Focus the cancel button when opened so Escape / Tab works naturally
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => confirmRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape' && !loading) onCancel?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, loading, onCancel])

  if (!open) return null

  const accentColor = danger ? '#dc2626' : '#d97706'
  const accentBg    = danger ? '#fef2f2' : '#fffbeb'
  const accentRing  = danger ? 'rgba(220,38,38,0.18)' : 'rgba(217,119,6,0.18)'
  const gradientBtn = danger
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 60%, #b91c1c 100%)'
    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)'

  return (
    <div
      className="delete-modal-backdrop"
      onClick={() => { if (!loading) onCancel?.() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="delete-modal-card"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Animated icon ── */}
        <div className="delete-modal-icon-wrap" style={{ '--accent': accentColor, '--accent-bg': accentBg, '--accent-ring': accentRing }}>
          <div className="delete-modal-icon-ring" />
          <div className="delete-modal-icon-circle">
            <i className="bi bi-trash3-fill" style={{ fontSize: '1.6rem', color: accentColor }} />
          </div>
        </div>

        {/* ── Text ── */}
        <h5 id="delete-modal-title" className="delete-modal-title">
          {title}
        </h5>
        <p className="delete-modal-message">{message}</p>

        {/* ── Divider ── */}
        <div className="delete-modal-divider" />

        {/* ── Actions ── */}
        <div className="delete-modal-actions">
          <button
            type="button"
            className="delete-modal-btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            <i className="bi bi-x-lg me-1" />
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="delete-modal-btn-confirm"
            style={{ background: gradientBtn }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2" role="status" />{confirmLabel}နေသည်…</>
              : <><i className="bi bi-trash3 me-2" />{confirmLabel}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
