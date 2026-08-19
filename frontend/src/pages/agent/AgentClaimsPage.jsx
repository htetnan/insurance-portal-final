import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { toast } from 'react-toastify'
import FormDetailModal from '../../components/FormDetailModal'
import DigitalSignatureCanvas from '../../components/DigitalSignatureCanvas'
import { apiError } from '../../utils/apiError'

const FILTERS = ['ALL', 'PENDING', 'VERIFIED', 'REVISION_REQUESTED', 'REJECTED']

export default function AgentClaimsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [rejectId, setRejectId] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [forwardId, setForwardId] = useState(null)
  const [forwardNote, setForwardNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [viewItem, setViewItem] = useState(null)
  const [signatureData, setSignatureData] = useState(null)

  const filter = (() => { const f = searchParams.get('filter'); return FILTERS.includes(f) ? f : 'ALL' })()

  const FILTER_LABELS = {
    ALL:                t('agent.apps.filterAll'),
    PENDING:            t('agent.apps.filterPending'),
    VERIFIED:           t('agent.apps.filterVerified'),
    REVISION_REQUESTED: t('agent.apps.filterRevision'),
    REJECTED:           t('agent.apps.filterRejected'),
  }

  const fetchClaims = () => {
    setLoading(true)
    const url = filter && filter !== 'ALL' ? `/agent/claims?status=${filter}` : '/agent/claims?status=ALL'
    api.get(url)
      .then(res => setClaims(Array.isArray(res.data) ? res.data : []))
      .catch(() => setClaims([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetchClaims() }, [filter])

  const clearActions = () => {
    setSelected(null); setNote('')
    setSignatureData(null)
    setRejectId(null); setRejectNote('')
    setForwardId(null); setForwardNote('')
  }

  const handleVerify = async (id) => {
    if (!signatureData) { toast.error(t('agent.claims.signatureRequired')); return }
    setSubmitting(true)
    try {
      await api.put(`/agent/claims/${id}/verify`, { note, signature: signatureData })
      toast.success(t('agent.claims.verifySuccess'))
      clearActions(); fetchClaims()
    } catch (err) { apiError(err) } finally { setSubmitting(false) }
  }

  const handleReject = async (id) => {
    if (!rejectNote.trim()) { toast.error(t('agent.claims.reasonRequired')); return }
    setSubmitting(true)
    try {
      await api.put(`/agent/claims/${id}/reject`, { note: rejectNote })
      toast.success(t('agent.claims.rejectSuccess'))
      clearActions(); fetchClaims()
    } catch (err) { apiError(err) } finally { setSubmitting(false) }
  }

  const handleForward = async (id) => {
    setSubmitting(true)
    try {
      await api.put(`/agent/claims/${id}/request-revision`, { note: forwardNote })
      toast.success(t('agent.claims.forwardSuccess'))
      clearActions(); fetchClaims()
    } catch (err) { apiError(err) } finally { setSubmitting(false) }
  }

  return (
    <div className="fade-in">
      <div className="mb-4">
        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {t('agent.claims.title')}
        </h4>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          {t('agent.claims.subtitle')}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="d-flex gap-2 flex-wrap mb-4">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setSearchParams(f === 'ALL' ? {} : { filter: f })} style={{
            padding: '0.35rem 0.85rem', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
            border: `1.5px solid ${filter === f ? 'var(--primary)' : 'var(--border)'}`,
            background: filter === f ? 'var(--primary)' : 'var(--bg-card)',
            color: filter === f ? '#fff' : 'var(--text-secondary)'
          }}>{FILTER_LABELS[f] || f}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--primary)' }}></div></div>
      ) : claims.length === 0 ? (
        <div className="card-custom text-center py-5">
          <i className="bi bi-check-circle" style={{ fontSize: '3rem', color: 'var(--secondary)' }}></i>
          <h5 style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
            {t('agent.claims.empty')}
          </h5>
        </div>
      ) : (
        <div className="row g-4">
          {claims.map(claim => {
            const isRevision = claim.status === 'REVISION_REQUESTED'
            const isPending = claim.status === 'PENDING'
            const activeAction = selected === claim.id ? 'verify'
              : rejectId === claim.id ? 'reject'
              : forwardId === claim.id ? 'forward'
              : null

            return (
              <div key={claim.id} className="col-12 col-lg-6">
                <div className="card-custom h-100">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {claim.customerName || claim.customer?.name}
                      </h6>
                      <small style={{ color: 'var(--text-muted)' }}>{claim.claimType}</small>
                    </div>
                    <span className={`badge-status badge-${claim.status?.toLowerCase()}`}>{claim.status}</span>
                  </div>

                  {/* Admin revision note */}
                  {isRevision && claim.adminNote && (
                    <div style={{
                      padding: '0.6rem 0.875rem', borderRadius: 8, marginBottom: '0.75rem',
                      background: '#fefce8', border: '1px solid #fcd34d', fontSize: '0.82rem'
                    }}>
                      <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        {t('agent.claims.adminRevision')}
                      </div>
                      <div style={{ color: '#78350f' }}>{claim.adminNote}</div>
                    </div>
                  )}
                  {isRevision && claim.agentNote && (
                    <div style={{
                      padding: '0.6rem 0.875rem', borderRadius: 8, marginBottom: '0.75rem',
                      background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.82rem'
                    }}>
                      <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 2 }}>
                        <i className="bi bi-person me-1"></i>
                        {t('agent.claims.yourNote')}
                      </div>
                      <div style={{ color: '#1d4ed8' }}>{claim.agentNote}</div>
                    </div>
                  )}

                  <div className="row g-2 mb-3">
                    {[
                      { label: t('agent.claims.policyLabel'),   value: claim.policyName || claim.policy?.packageName },
                      { label: t('agent.claims.amountLabel'),   value: `${Number(claim.amount).toLocaleString()} MMK` },
                      { label: t('agent.claims.incidentLabel'), value: claim.incidentDate ? new Date(claim.incidentDate).toLocaleDateString() : '—' },
                      { label: t('agent.claims.submittedLabel'),value: claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : '—' },
                    ].map(item => (
                      <div key={item.label} className="col-6">
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '0.5rem 0.75rem' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.label}</div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setViewItem(claim)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0.4rem 0.9rem', borderRadius: 8, border: '1.5px solid var(--border)',
                    background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                    fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.75rem', width: '100%', justifyContent: 'center'
                  }}>
                    <i className="bi bi-eye"></i>
                    {t('agent.claims.viewForm')}
                  </button>

                  {(isPending || isRevision) && (
                    <>
                      {activeAction === 'verify' && (
                        <div>
                          <DigitalSignatureCanvas
                            label={t('agent.claims.signatureLabel')}
                            required
                            onChange={setSignatureData}
                            height={120}
                          />
                          <textarea rows={2} className="form-control-custom w-100 mb-2" style={{ resize: 'vertical' }}
                            placeholder={t('agent.claims.verifyPlaceholder')}
                            value={note} onChange={e => setNote(e.target.value)} />
                          <div className="d-flex gap-2">
                            <button className="btn-success-sm flex-grow-1" onClick={() => handleVerify(claim.id)} disabled={submitting}>
                              {submitting
                                ? <span className="spinner-border spinner-border-sm"></span>
                                : t('agent.claims.markVerified')}
                            </button>
                            <button className="btn-outline-custom" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }} onClick={clearActions}>
                              {t('agent.claims.cancel')}
                            </button>
                          </div>
                        </div>
                      )}
                      {activeAction === 'reject' && (
                        <div>
                          <textarea rows={2} className="form-control-custom w-100 mb-2" style={{ resize: 'vertical' }}
                            placeholder={t('agent.claims.rejectPlaceholder')}
                            value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
                          <div className="d-flex gap-2">
                            <button className="btn-danger-sm flex-grow-1" onClick={() => handleReject(claim.id)} disabled={submitting}>
                              {t('agent.claims.reject')}
                            </button>
                            <button className="btn-outline-custom" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }} onClick={clearActions}>
                              {t('agent.claims.cancel')}
                            </button>
                          </div>
                        </div>
                      )}
                      {activeAction === 'forward' && (
                        <div>
                          <textarea rows={2} className="form-control-custom w-100 mb-2" style={{ resize: 'vertical' }}
                            placeholder={t('agent.claims.forwardPlaceholder')}
                            value={forwardNote} onChange={e => setForwardNote(e.target.value)} />
                          <div className="d-flex gap-2">
                            <button style={{
                              flex: 1, padding: '0.45rem 0.75rem', borderRadius: 8, border: 'none',
                              background: '#d97706', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                            }} onClick={() => handleForward(claim.id)} disabled={submitting}>
                              {submitting
                                ? <span className="spinner-border spinner-border-sm"></span>
                                : <><i className="bi bi-send me-1"></i>{t('agent.claims.notifyCustomer')}</>}
                            </button>
                            <button className="btn-outline-custom" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }} onClick={clearActions}>
                              {t('agent.claims.cancel')}
                            </button>
                          </div>
                        </div>
                      )}
                      {activeAction === null && (
                        <div className="d-flex flex-column gap-2">
                          {isRevision && (
                            <button onClick={() => setForwardId(claim.id)} style={{
                              width: '100%', padding: '0.5rem', borderRadius: 8, border: 'none',
                              background: '#d97706', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                            }}>
                              <i className="bi bi-send"></i>{t('agent.claims.forwardToCustomer')}
                            </button>
                          )}
                          <div className="d-flex gap-2">
                            <button onClick={() => { setSelected(claim.id); setSignatureData(null) }} style={{
                              flex: 1, padding: '0.5rem', borderRadius: 8, border: 'none',
                              background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                            }}>
                              <i className="bi bi-check-circle"></i>{t('agent.claims.verify')}
                            </button>
                            <button onClick={() => setRejectId(claim.id)} style={{
                              flex: 1, padding: '0.5rem', borderRadius: 8, border: 'none',
                              background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                            }}>
                              <i className="bi bi-x-circle"></i>{t('agent.claims.reject')}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <FormDetailModal
        show={!!viewItem} onClose={() => setViewItem(null)}
        type="claim" item={viewItem} role="agent" />
    </div>
  )
}
