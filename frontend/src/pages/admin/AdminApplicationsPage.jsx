import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { toast } from 'react-toastify'
import FormDetailModal from '../../components/FormDetailModal'
import DigitalSignatureCanvas from '../../components/DigitalSignatureCanvas'
import { apiError } from '../../utils/apiError'
import ServerPagination from '../../components/ServerPagination'

const STATUS_KEYS = ['ALL', 'PENDING', 'VERIFIED', 'APPROVED', 'REJECTED']

export default function AdminApplicationsPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0, size: 20 })
  const [filter, setFilter] = useState(() => {
    const f = searchParams.get('filter')
    return f && STATUS_KEYS.includes(f) ? f : 'VERIFIED'
  })
  const [selected, setSelected] = useState(null)
  const [actionNote, setActionNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [viewItem, setViewItem] = useState(null)
  const [signatureData, setSignatureData] = useState(null)

  const statusLabel = (key) => t(`admin.applications.status_${key}`)

  const fetchApps = (targetPage = page) => {
    const params = new URLSearchParams({ page: String(targetPage), size: '20' })
    if (filter !== 'ALL') params.set('status', filter)
    api.get(`/admin/applications/page?${params.toString()}`)
      .then(res => {
        const data = res.data || {}
        setApps(Array.isArray(data.content) ? data.content : [])
        setPageInfo({ totalPages: data.totalPages || 0, totalElements: data.totalElements || 0, size: data.size || 20 })
      })
      .catch(() => { setApps([]); setPageInfo({ totalPages: 0, totalElements: 0, size: 20 }) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { setPage(0); setLoading(true); fetchApps(0) }, [filter])

  const handleAction = async (id, action) => {
    if ((action === 'reject' || action === 'revise') && !actionNote.trim()) {
      toast.error(t('admin.applications.reasonRequired')); return
    }
    if (action === 'approve' && !signatureData) {
      toast.error(t('admin.applications.signatureRequired')); return
    }
    setSubmitting(true)
    try {
      await api.put(`/admin/applications/${id}/${action}`, {
        note: actionNote,
        ...(action === 'approve' ? { signature: signatureData } : {}),
      })
      toast.success(
        action === 'approve' ? t('admin.applications.approvedSuccess')
        : action === 'reject' ? t('admin.applications.rejectedSuccess')
        : t('admin.applications.revisedSuccess')
      )
      setSelected(null); setActionNote(''); setSignatureData(null); fetchApps()
    } catch (err) { apiError(err) } finally { setSubmitting(false) }
  }

  return (
    <div className="fade-in">
      <div className="mb-4">
        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('admin.applications.title')}</h4>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>{t('admin.applications.subtitle')}</p>
      </div>

      {/* Status filter buttons */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {STATUS_KEYS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '0.4rem 1rem', borderRadius: 20, border: '1px solid',
            borderColor: filter === f ? 'var(--primary)' : 'var(--border)',
            background: filter === f ? 'var(--primary)' : 'var(--bg-card)',
            color: filter === f ? '#fff' : 'var(--text-secondary)',
            fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s'
          }}>{statusLabel(f)}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--primary)' }}></div></div>
      ) : apps.length === 0 ? (
        <div className="card-custom text-center py-5">
          <i className="bi bi-file-earmark-check" style={{ fontSize: '3rem', color: 'var(--border)' }}></i>
          <h5 style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
            {t('admin.applications.noFound')} "{statusLabel(filter)}"
          </h5>
        </div>
      ) : (
        <div className="row g-4">
          {apps.map(app => (
            <div key={app.id} className="col-12">
              <div className="card-custom">
                <div className="row align-items-start">
                  <div className="col-12 col-md-8">
                    <div className="d-flex align-items-center gap-3 mb-2">
                      <div>
                        <h6 style={{ fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          #{app.id} — {app.customerName || app.customer?.name}
                        </h6>
                        <small style={{ color: 'var(--text-muted)' }}>{app.customerEmail || app.customer?.email}</small>
                      </div>
                      <span className={`badge-status badge-${app.status?.toLowerCase()}`}>
                        {statusLabel(app.status) || app.status}
                      </span>
                    </div>
                    <div className="d-flex gap-3 flex-wrap mb-2">
                      {[
                        { label: t('admin.applications.planLabel'),     value: app.packageName || app.package?.name },
                        { label: t('admin.applications.typeLabel'),     value: app.packageType || app.package?.type },
                        { label: t('admin.applications.coverageLabel'), value: `${Number(app.coverageAmount).toLocaleString()} MMK` },
                        { label: t('admin.applications.durationLabel'), value: `${app.duration} ${t('admin.applications.yearSuffix')}` },
                        { label: t('admin.applications.agentLabel'),    value: app.agentName || app.agent?.name || t('admin.common.na') },
                        { label: t('admin.applications.appliedLabel'),  value: app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—' },
                      ].map(item => (
                        <div key={item.label} style={{ minWidth: 100 }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.label}</div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {/* View button */}
                    <button onClick={() => setViewItem(app)} style={{
                      padding: '0.3rem 0.8rem', borderRadius: 7, border: '1.5px solid var(--border)',
                      background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                      <i className="bi bi-eye"></i> {t('admin.applications.viewDetails')}
                    </button>
                    {app.agentNote && (
                      <p style={{ color: '#1d4ed8', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
                        {t('admin.applications.agentNote')}: {app.agentNote}
                      </p>
                    )}
                  </div>
                  {app.status === 'VERIFIED' && (
                    <div className="col-12 col-md-4 mt-3 mt-md-0">
                      {selected === app.id ? (
                        <div>
                          <DigitalSignatureCanvas
                            label={t('admin.applications.signatureLabel')}
                            required
                            onChange={setSignatureData}
                            height={120}
                          />
                          <textarea rows={2} className="form-control-custom w-100 mb-2" style={{ resize: 'vertical' }}
                            placeholder={t('admin.applications.notePlaceholder')}
                            value={actionNote} onChange={e => setActionNote(e.target.value)} />
                          <div className="d-flex gap-1 flex-wrap">
                            <button className="btn-success-sm" onClick={() => handleAction(app.id, 'approve')} disabled={submitting}>
                              {submitting ? <span className="spinner-border spinner-border-sm"></span> : `✓ ${t('admin.common.approve')}`}
                            </button>
                            <button className="btn-danger-sm" onClick={() => handleAction(app.id, 'reject')} disabled={submitting}>
                              ✗ {t('admin.common.reject')}
                            </button>
                            <button style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '0.4rem 0.7rem', fontSize: '0.82rem', cursor: 'pointer' }}
                              onClick={() => handleAction(app.id, 'revise')} disabled={submitting}>
                              ↩ {t('admin.common.revise')}
                            </button>
                            <button className="btn-outline-custom" style={{ padding: '0.3rem 0.6rem', fontSize: '0.82rem' }}
                              onClick={() => setSelected(null)}>
                              {t('admin.common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn-primary-custom" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
                           onClick={() => { setSelected(app.id); setActionNote(''); setSignatureData(null) }}>
                          {t('admin.applications.reviewApplication')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


      <ServerPagination
        page={page} totalPages={pageInfo.totalPages} totalElements={pageInfo.totalElements} pageSize={pageInfo.size}
        onPageChange={(next) => { setPage(next); setLoading(true); fetchApps(next) } }
      />
      <FormDetailModal
        show={!!viewItem} onClose={() => setViewItem(null)}
        type="application" item={viewItem} role="admin" />
    </div>
  )
}
