import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { toast } from 'react-toastify'
import DeleteConfirmModal from '../../components/DeleteConfirmModal'

const EMPTY = { name: '', methodKey: '', color: '#1d4ed8', active: true }

export default function AdminPaymentMethodsPage() {
  const { t } = useTranslation()
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [logoFile, setLogoFile] = useState(null)
  const [qrFile, setQrFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, loading: false })
  const logoRef = useRef()
  const qrRef = useRef()

  const fetch = () => {
    api.get('/admin/payment-methods')
      .then(r => setMethods(Array.isArray(r.data) ? r.data : []))
      .catch(() => setMethods([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const resetForm = () => {
    setForm(EMPTY); setEditing(null); setLogoFile(null); setQrFile(null)
    if (logoRef.current) logoRef.current.value = ''
    if (qrRef.current) qrRef.current.value = ''
  }

  const handleEdit = m => {
    setEditing(m.id)
    setForm({ name: m.name, methodKey: m.methodKey, color: m.color || '#1d4ed8', active: m.active })
    setLogoFile(null); setQrFile(null)
    if (logoRef.current) logoRef.current.value = ''
    if (qrRef.current) qrRef.current.value = ''
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error(t('admin.paymentMethods.nameRequired')); return }
    if (!editing && !form.methodKey.trim()) { toast.error(t('admin.paymentMethods.keyRequired')); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      if (!editing) fd.append('methodKey', form.methodKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_'))
      fd.append('color', form.color)
      fd.append('active', form.active)
      if (logoFile) fd.append('logo', logoFile)
      if (qrFile) fd.append('qrCode', qrFile)

      if (editing) {
        await api.put(`/admin/payment-methods/${editing}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success(t('admin.paymentMethods.updatedSuccess'))
      } else {
        await api.post('/admin/payment-methods', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success(t('admin.paymentMethods.createdSuccess'))
      }
      setShowForm(false); resetForm(); fetch()
    } catch (err) {
      toast.error(err.response?.data?.message || t('admin.paymentMethods.saveFailed'))
    } finally { setSaving(false) }
  }

  const handleToggle = async m => {
    try {
      await api.put(`/admin/payment-methods/${m.id}/toggle`)
      toast.success(m.active ? t('admin.common.deactivate') : t('admin.common.activate'))
      fetch()
    } catch { toast.error(t('admin.paymentMethods.saveFailed')) }
  }

  const handleDelete = id => {
    setDeleteModal({ open: true, id, loading: false })
  }

  const confirmDelete = async () => {
    setDeleteModal(m => ({ ...m, loading: true }))
    try {
      await api.delete(`/admin/payment-methods/${deleteModal.id}`)
      toast.success(t('admin.paymentMethods.deletedSuccess'))
      setDeleteModal({ open: false, id: null, loading: false })
      fetch()
    } catch {
      toast.error(t('admin.paymentMethods.saveFailed'))
      setDeleteModal(m => ({ ...m, loading: false }))
    }
  }

  return (
    <div className="fade-in">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('admin.paymentMethods.title')}</h4>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            {t('admin.paymentMethods.descLabel')}
          </p>
        </div>
        <button className="btn-primary-custom" style={{ fontSize: '0.88rem', padding: '0.45rem 1rem' }}
          onClick={() => { if (showForm) { setShowForm(false); resetForm() } else { setShowForm(true); setEditing(null); setForm(EMPTY) } }}>
          <i className={`bi bi-${showForm ? 'arrow-left' : 'plus-circle'} me-1`}></i>
          {showForm ? t('admin.paymentMethods.backBtn') : t('admin.paymentMethods.addMethodBtn')}
        </button>
      </div>

      {/* ── FORM ── */}
      {showForm && (
        <div className="card-custom mb-4 fade-in">
          <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
            <i className={`bi bi-${editing ? 'pencil-square' : 'plus-circle-fill'} me-2`} style={{ color: 'var(--primary)' }}></i>
            {editing ? t('admin.paymentMethods.editFormTitle') : t('admin.paymentMethods.newFormTitle')}
          </h6>
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12 col-md-5">
                <label className="form-label-custom">{t('admin.paymentMethods.nameLabel')}</label>
                <input className="form-control-custom w-100" required placeholder="e.g. KBZ Pay"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              {!editing && (
                <div className="col-12 col-md-4">
                  <label className="form-label-custom">
                    {t('admin.paymentMethods.methodKeyLabel')} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({t('admin.paymentMethods.methodKeyUniqueCode')})</span>
                  </label>
                  <input className="form-control-custom w-100" required placeholder="e.g. KBZ_PAY"
                    value={form.methodKey}
                    onChange={e => setForm(f => ({ ...f, methodKey: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') }))} />
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                    {t('admin.paymentMethods.methodKeyOnlyCapital')}
                  </p>
                </div>
              )}
              <div className="col-12 col-md-3">
                <label className="form-label-custom">{t('admin.paymentMethods.brandColorLabel')}</label>
                <div className="d-flex align-items-center gap-2">
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    style={{ width: 48, height: 38, border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: 3 }} />
                  <input className="form-control-custom flex-grow-1" value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="#1d4ed8" />
                </div>
              </div>

              {/* Logo Upload */}
              <div className="col-12 col-md-6">
                <label className="form-label-custom">
                  <i className="bi bi-image me-1"></i>{t('admin.paymentMethods.logoLabel')} {editing && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({t('admin.paymentMethods.logoChangeHint')})</span>}
                </label>
                <input ref={logoRef} type="file" accept="image/*" className="form-control-custom w-100"
                  onChange={e => setLogoFile(e.target.files[0] || null)} />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                  <i className="bi bi-info-circle me-1"></i>{t('admin.paymentMethods.logoFileHint')}
                </p>
              </div>

              {/* QR Code Upload */}
              <div className="col-12 col-md-6">
                <label className="form-label-custom">
                  <i className="bi bi-qr-code me-1"></i>{t('admin.paymentMethods.qrLabel')} {editing && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({t('admin.paymentMethods.qrChangeHint')})</span>}
                </label>
                <input ref={qrRef} type="file" accept="image/*" className="form-control-custom w-100"
                  onChange={e => setQrFile(e.target.files[0] || null)} />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                  <i className="bi bi-info-circle me-1"></i>{t('admin.paymentMethods.qrFileHint')}
                </p>
              </div>

              {/* Active toggle */}
              <div className="col-12">
                <div className="d-flex align-items-center gap-2">
                  <input type="checkbox" id="pmActive" checked={form.active}
                    onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                  <label htmlFor="pmActive" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    {t('admin.paymentMethods.activeCheckHint')}
                  </label>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '0.75rem 1rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                {form.name ? form.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{form.name || t('admin.paymentMethods.previewName')}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{form.methodKey || 'METHOD_KEY'} · {form.color}</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: 99, background: form.active ? '#dcfce7' : '#fee2e2', color: form.active ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                {form.active ? t('admin.paymentMethods.activeStatus') : t('admin.paymentMethods.inactiveStatus')}
              </span>
            </div>

            <div className="d-flex gap-2 mt-4">
              <button type="submit" disabled={saving} className="btn-primary-custom" style={{ justifyContent: 'center', minWidth: 140 }}>
                {saving
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('admin.paymentMethods.savingBtn')}</>
                  : (editing ? t('admin.paymentMethods.updateBtn') : t('admin.paymentMethods.createBtn'))}
              </button>
              <button type="button" className="btn-outline-custom" onClick={() => { setShowForm(false); resetForm() }}>
                {t('admin.paymentMethods.cancelBtn')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── LIST ── */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--primary)' }}></div></div>
      ) : methods.length === 0 ? (
        <div className="card-custom text-center py-5">
          <i className="bi bi-qr-code" style={{ fontSize: '3rem', color: 'var(--border)' }}></i>
          <h5 style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{t('admin.paymentMethods.noMethodsTitle')}</h5>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('admin.paymentMethods.noMethodsHint')}</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {methods.map(m => (
            <div key={m.id} className="card-custom">
              <div className="row align-items-center g-3">
                {/* Icon + info */}
                <div className="col-12 col-md-5">
                  <div className="d-flex align-items-center gap-3">
                    <div style={{ position: 'relative' }}>
                      {m.hasLogo ? (
                        <img src={`/api/admin/payment-methods/${m.id}/logo`}
                          alt={m.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${m.color}40` }} />
                      ) : (
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: m.color || '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.25rem' }}>
                          {m.name.charAt(0)}
                        </div>
                      )}
                      <span style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: m.active ? '#16a34a' : '#dc2626', border: '2px solid var(--bg-primary)' }}></span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{m.name}</div>
                      <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>{m.methodKey}</code>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: m.color }}>
                          <span style={{ width: 12, height: 12, borderRadius: '50%', background: m.color, display: 'inline-block' }}></span>
                          {m.color}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR preview */}
                <div className="col-12 col-md-4">
                  <div className="d-flex gap-3 align-items-center">
                    {m.hasQr ? (
                      <div style={{ textAlign: 'center' }}>
                        <img src={`/api/admin/payment-methods/${m.id}/qr`}
                          alt="QR" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', padding: 4 }} />
                        <div style={{ fontSize: '0.65rem', color: '#16a34a', marginTop: 2, fontWeight: 700 }}>{t('admin.paymentMethods.qrPresent')}</div>
                      </div>
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: 8, border: '1.5px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'var(--bg-secondary)' }}>
                        <i className="bi bi-qr-code" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', opacity: 0.4 }}></i>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{t('admin.paymentMethods.noQr')}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <div><i className="bi bi-image me-1" style={{ color: 'var(--text-muted)' }}></i>{t('admin.paymentMethods.logoStat')}: {m.hasLogo ? <span style={{ color: '#16a34a' }}>✓</span> : <span style={{ color: '#dc2626' }}>✗</span>}</div>
                      <div><i className="bi bi-qr-code me-1" style={{ color: 'var(--text-muted)' }}></i>{t('admin.paymentMethods.qrCodeStat')}: {m.hasQr ? <span style={{ color: '#16a34a' }}>✓</span> : <span style={{ color: '#dc2626' }}>✗</span>}</div>
                      <div style={{ marginTop: 4 }}>
                        <span className={`badge-status ${m.active ? 'badge-active' : 'badge-cancelled'}`}>{m.active ? t('admin.paymentMethods.activeStatus') : t('admin.paymentMethods.inactiveStatus')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-12 col-md-3">
                  <div className="d-flex gap-1 flex-wrap justify-content-md-end">
                    <button className="btn-primary-sm" onClick={() => handleEdit(m)} style={{ padding: '0.3rem 0.6rem' }} title={t('admin.common.edit')}>
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn-outline-custom" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }} onClick={() => handleToggle(m)}>
                      {m.active ? t('admin.common.deactivate') : t('admin.common.activate')}
                    </button>
                    <button className="btn-danger-sm" onClick={() => handleDelete(m.id)} style={{ padding: '0.3rem 0.6rem' }} title={t('admin.common.delete')}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="card-custom mt-4" style={{ background: 'var(--bg-secondary)' }}>
        <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: '0.88rem' }}>
          <i className="bi bi-lightbulb me-2" style={{ color: '#d97706' }}></i>{t('admin.paymentMethods.tips')}
        </h6>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div><i className="bi bi-check2 me-2" style={{ color: '#16a34a' }}></i>{t('admin.paymentMethods.tip1')}</div>
          <div><i className="bi bi-check2 me-2" style={{ color: '#16a34a' }}></i>{t('admin.paymentMethods.tip2')}</div>
          <div><i className="bi bi-check2 me-2" style={{ color: '#16a34a' }}></i>{t('admin.paymentMethods.tip3')}</div>
          <div><i className="bi bi-check2 me-2" style={{ color: '#16a34a' }}></i>{t('admin.paymentMethods.tip4')}</div>
        </div>
      </div>

      <DeleteConfirmModal
        open={deleteModal.open}
        title={t('admin.paymentMethods.deleteModalTitle')}
        message={t('admin.paymentMethods.deleteModalMsg')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ open: false, id: null, loading: false })}
        loading={deleteModal.loading}
      />
    </div>
  )
}
