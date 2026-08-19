import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { toast } from 'react-toastify'
import { apiError } from '../../utils/apiError'
import ServerPagination from '../../components/ServerPagination'
import PaymentMethodIcon, { PAYMENT_METHODS } from '../../components/PaymentMethodIcon'

export default function AdminPaymentsPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0, size: 20 })
  const [filter, setFilter] = useState(() => {
    const f = searchParams.get('filter')
    return f && ['ALL','PENDING','VERIFIED','APPROVED','REJECTED'].includes(f) ? f : 'PENDING'
  })
  const [actionId, setActionId] = useState(null)
  const [actionNote, setActionNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [screenshotFor, setScreenshotFor] = useState(null)
  const [screenshotUrl, setScreenshotUrl] = useState(null)
  const [screenshotLoading, setScreenshotLoading] = useState(false)

  const fetchPayments = (targetPage = page) => {
    const params = new URLSearchParams({ page: String(targetPage), size: '20' })
    if (filter !== 'ALL') params.set('status', filter)
    api.get(`/admin/payments/page?${params.toString()}`)
      .then(res => {
        const data = res.data || {}
        setPayments(Array.isArray(data.content) ? data.content : [])
        setPageInfo({ totalPages: data.totalPages || 0, totalElements: data.totalElements || 0, size: data.size || 20 })
      })
      .catch(() => { setPayments([]); setPageInfo({ totalPages: 0, totalElements: 0, size: 20 }) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { setPage(0); setLoading(true); fetchPayments(0) }, [filter])

  const handleAction = async (id, action) => {
    if (action === 'reject' && !actionNote.trim()) { toast.error(t('admin.payments.rejectionReason')); return }
    setSubmitting(true)
    try {
      await api.put(`/admin/payments/${id}/${action}`, { note: actionNote })
      toast.success(action === 'verify' ? t('admin.payments.verifiedSuccess') : t('admin.payments.rejectedSuccess'))
      setActionId(null); setActionNote(''); fetchPayments()
    } catch (err) {
      apiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const openScreenshot = async (payment) => {
    setScreenshotFor(payment)
    setScreenshotLoading(true)
    try {
      const res = await api.get(`/admin/payments/${payment.id}/screenshot`, { responseType: 'blob' })
      setScreenshotUrl(URL.createObjectURL(res.data))
    } catch {
      toast.error(t('admin.payments.screenshotFailed'))
      setScreenshotFor(null)
    } finally {
      setScreenshotLoading(false)
    }
  }

  const closeScreenshot = () => {
    if (screenshotUrl) URL.revokeObjectURL(screenshotUrl)
    setScreenshotUrl(null)
    setScreenshotFor(null)
  }

  return (
    <div className="fade-in">
      <div className="mb-4">
        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('admin.payments.title')}</h4>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>{t('admin.payments.subtitle')}</p>
      </div>

      <div className="d-flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'ALL',      label: t('admin.payments.filterAll') },
          { key: 'PENDING',  label: t('admin.payments.filterPending') },
          { key: 'VERIFIED', label: t('admin.payments.filterVerified') },
          { key: 'REJECTED', label: t('admin.payments.filterRejected') },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: '0.4rem 1rem', borderRadius: 20, border: '1px solid',
            borderColor: filter === key ? 'var(--primary)' : 'var(--border)',
            background: filter === key ? 'var(--primary)' : 'var(--bg-card)',
            color: filter === key ? '#fff' : 'var(--text-secondary)',
            fontSize: '0.85rem', cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--primary)' }}></div></div>
      ) : payments.length === 0 ? (
        <div className="card-custom text-center py-5">
          <i className="bi bi-credit-card" style={{ fontSize: '3rem', color: 'var(--border)' }}></i>
          <h5 style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{t('admin.payments.noFound')} "{filter}"</h5>
        </div>
      ) : (
        <div className="card-custom p-0">
          <div className="table-custom">
            <table className="w-100">
              <thead>
                <tr>
                  {[t('admin.payments.tableId'), t('admin.payments.tableCustomer'), t('admin.payments.tablePolicy'), t('admin.payments.tableAmount'), t('admin.payments.tableMethod'), t('admin.payments.tableProof'), t('admin.payments.tableStatus'), t('admin.payments.tableSubmitted'), t('admin.payments.tableActions')].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>#{p.id}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.customerEmail}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{p.policyName} <span style={{ color: 'var(--text-muted)' }}>({p.policyNumber})</span></td>
                    <td>{p.amount != null ? Number(p.amount).toLocaleString() : '—'}</td>
                    <td>
                      {p.paymentMethod ? (
                        <div className="d-flex align-items-center gap-2">
                          <PaymentMethodIcon method={p.paymentMethod} size={22} />
                          <span style={{ fontSize: '0.8rem' }}>{PAYMENT_METHODS.find(m => m.id === p.paymentMethod)?.label || p.paymentMethod}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      {p.hasScreenshot ? (
                        <button className="btn-outline-custom" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }} onClick={() => openScreenshot(p)}>
                          <i className="bi bi-image me-1"></i>View
                        </button>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>}
                    </td>
                    <td><span className={`badge-status badge-${p.status?.toLowerCase()}`}>{p.status}</span></td>
                    <td style={{ fontSize: '0.82rem' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                      {p.status === 'PENDING' ? (
                        actionId === p.id ? (
                          <div style={{ minWidth: 200 }}>
                            <textarea rows={2} className="form-control-custom w-100 mb-2" style={{ resize: 'vertical', fontSize: '0.8rem' }}
                              placeholder={t('admin.payments.notePlaceholder')}
                              value={actionNote} onChange={e => setActionNote(e.target.value)} />
                            <div className="d-flex gap-1">
                              <button className="btn-success-sm" disabled={submitting} onClick={() => handleAction(p.id, 'verify')}>{t('admin.payments.verify')}</button>
                              <button className="btn-danger-sm" disabled={submitting} onClick={() => handleAction(p.id, 'reject')}>{t('admin.payments.reject')}</button>
                              <button className="btn-outline-custom" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }} onClick={() => { setActionId(null); setActionNote('') }}>{t('admin.common.cancel')}</button>
                            </div>
                          </div>
                        ) : (
                          <button className="btn-outline-custom" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }} onClick={() => setActionId(p.id)}>
                            {t('admin.payments.reviewBtn')}
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.verifiedBy || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      <ServerPagination
        page={page} totalPages={pageInfo.totalPages} totalElements={pageInfo.totalElements} pageSize={pageInfo.size}
        onPageChange={(next) => { setPage(next); setLoading(true); fetchPayments(next) } }
      />
      {screenshotFor && (
        <div className="modal show d-block modal-custom" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {t('admin.payments.proofModalTitle')} — #{screenshotFor.id}
                </h5>
                <button className="icon-btn" onClick={closeScreenshot}><i className="bi bi-x-lg"></i></button>
              </div>
              <div className="modal-body text-center">
                {screenshotLoading ? (
                  <div className="spinner-border" style={{ color: 'var(--primary)' }}></div>
                ) : screenshotUrl ? (
                  <img src={screenshotUrl} alt="Payment proof" style={{ maxWidth: '100%', borderRadius: 8 }} />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
