import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import FormDetailModal from '../../components/FormDetailModal'
import RevisionFormModal from '../../components/RevisionFormModal'

export default function MyClaimsPage() {
  const { t } = useTranslation()
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewItem, setViewItem] = useState(null)
  const [reviseItem, setReviseItem] = useState(null)

  const fetchClaims = () => {
    api.get('/customer/claims')
      .then(res => setClaims(Array.isArray(res.data) ? res.data : []))
      .catch(() => setClaims([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetchClaims() }, [])

  return (
    <div className="fade-in">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('myClaims.title')}</h4>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>{t('myClaims.subtitle')}</p>
        </div>
        <Link to="/customer/submit-claim" className="btn-primary-custom" style={{ fontSize: '0.88rem', padding: '0.45rem 1rem' }}>
          <i className="bi bi-plus-circle me-1"></i>{t('myClaims.newClaim')}
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--primary)' }}></div></div>
      ) : claims.length === 0 ? (
        <div className="card-custom text-center py-5">
          <i className="bi bi-file-earmark-medical" style={{ fontSize: '3rem', color: 'var(--border)' }}></i>
          <h5 style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{t('myClaims.noClaims')}</h5>
          <Link to="/customer/submit-claim" className="btn-primary-custom mt-3" style={{ display: 'inline-flex' }}>{t('myClaims.submitNow')}</Link>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {claims.map(claim => {
            const isRevision = claim.status === 'REVISION_REQUESTED'
            return (
              <div key={claim.id} className="card-custom">
                {/* Revision alert banner */}
                {isRevision && (
                  <div style={{
                    padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '0.75rem',
                    background: '#fefce8', border: '1px solid #fcd34d'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e', marginBottom: '0.3rem' }}>
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>{t('myClaims.revisionAlert')}
                    </div>
                    {claim.adminNote && (
                      <div style={{ fontSize: '0.82rem', color: '#78350f', marginBottom: claim.agentNote ? '0.2rem' : 0 }}>
                        <span style={{ fontWeight: 700 }}>Admin: </span>{claim.adminNote}
                      </div>
                    )}
                    {claim.agentNote && (
                      <div style={{ fontSize: '0.82rem', color: '#78350f' }}>
                        <span style={{ fontWeight: 700 }}>Agent: </span>{claim.agentNote}
                      </div>
                    )}
                  </div>
                )}

                <div className="row align-items-center g-2">
                  <div className="col-12 col-md-7">
                    <div className="d-flex align-items-center gap-3 mb-1">
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          {claim.policyName || claim.policy?.packageName}
                        </div>
                        <small style={{ color: 'var(--text-muted)' }}>
                          #{claim.id} · {claim.claimType} · {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : '—'}
                        </small>
                      </div>
                      <span className={`badge-status badge-${claim.status?.toLowerCase()}`}>{claim.status}</span>
                    </div>
                    <div className="d-flex gap-3 flex-wrap" style={{ fontSize: '0.83rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{t('myClaims.amountLabel')}: <strong style={{ color: 'var(--text-primary)' }}>{Number(claim.amount).toLocaleString()} MMK</strong></span>
                      {claim.incidentDate && <span style={{ color: 'var(--text-muted)' }}>{t('myClaims.incidentLabel')}: <strong style={{ color: 'var(--text-primary)' }}>{new Date(claim.incidentDate).toLocaleDateString()}</strong></span>}
                      {claim.agentName && <span style={{ color: 'var(--text-muted)' }}><i className="bi bi-person-badge me-1" style={{ color: '#1d4ed8' }}></i>{t('myClaims.agentLabel')}: <strong style={{ color: '#1d4ed8' }}>{claim.agentName}</strong></span>}
                    </div>
                    {!isRevision && claim.adminNote && <p style={{ color: '#16a34a', fontSize: '0.82rem', margin: '0.4rem 0 0' }}><i className="bi bi-check-circle me-1"></i>{claim.adminNote}</p>}
                    {!isRevision && claim.agentNote && <p style={{ color: '#1d4ed8', fontSize: '0.82rem', margin: '0.25rem 0 0' }}><i className="bi bi-person me-1"></i>Agent: {claim.agentNote}</p>}
                  </div>
                  <div className="col-12 col-md-5">
                    <div className="d-flex gap-2 justify-content-md-end flex-wrap">
                      <button onClick={() => setViewItem(claim)} style={{
                        padding: '0.4rem 0.9rem', borderRadius: 8, border: '1.5px solid #d97706',
                        background: 'transparent', color: '#d97706', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <i className="bi bi-eye"></i> {t('myClaims.viewFormBtn')}
                      </button>
                      {isRevision && (
                        <button onClick={() => setReviseItem(claim)} style={{
                          padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none',
                          background: '#d97706', color: '#fff', cursor: 'pointer',
                          fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <i className="bi bi-pencil-square"></i> {t('myClaims.editResubmitBtn')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <FormDetailModal
        show={!!viewItem} onClose={() => setViewItem(null)}
        type="claim" item={viewItem} role="customer" />

      <RevisionFormModal
        show={!!reviseItem} onClose={() => setReviseItem(null)}
        type="claim" item={reviseItem}
        onRevised={fetchClaims} />
    </div>
  )
}
