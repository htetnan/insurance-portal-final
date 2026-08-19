import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { toast } from 'react-toastify'
import { getTypeMeta } from '../../utils/typeMeta'
import { downloadPdf } from '../../utils/pdfDownload'

const RISK_META = {
  LOW:    { color: '#16a34a', bg: '#f0fdf4', icon: 'bi-shield-check'       },
  MEDIUM: { color: '#d97706', bg: '#fffbeb', icon: 'bi-shield-exclamation' },
  HIGH:   { color: '#dc2626', bg: '#fef2f2', icon: 'bi-shield-x'          },
}

function PolicyCertificate({ policy, onClose }) {
  const { t } = useTranslation()
  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content certificate-modal-content">
          <div className="modal-header" style={{ background: 'linear-gradient(135deg, #1d4ed8, #4338ca)', borderRadius: '16px 16px 0 0' }}>
            <div>
              <h5 className="modal-title" style={{ color: '#fff', fontWeight: 700 }}>{t('policies.certTitle')}</h5>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>{t('policies.certSubtitle')}</div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, padding: '0.3rem 0.6rem', color: '#fff', cursor: 'pointer' }}><i className="bi bi-x-lg"></i></button>
          </div>
          <div className="modal-body" style={{ padding: '2rem' }}>
            <div className="certificate-body">
              <div className="text-center mb-4">
                <i className="bi bi-shield-fill-check" style={{ fontSize: '2.5rem', color: '#1d4ed8' }}></i>
                <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#1d4ed8', marginTop: 8 }}>{t('policies.certHeader')}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('policies.certActive')}</div>
              </div>
              <div className="row g-3">
                {[
                  [t('policies.certPolicyNumber'), policy.policyNumber || t('policies.certPending')],
                  [t('policies.certType'), policy.packageType],
                  [t('policies.certPlan'), policy.packageName],
                  [t('policies.certCoverage'), `${Number(policy.coverageAmount).toLocaleString()} MMK`],
                  [t('policies.certDuration'), `${policy.duration} ${policy.duration > 1 ? t('policies.years') : t('policies.year')}`],
                  [t('policies.certRisk'), policy.riskLevel || '—'],
                  [t('policies.certPremium'), policy.premiumAmount ? `${Number(policy.premiumAmount).toLocaleString()} MMK` : '—'],
                  [t('policies.certIssue'), policy.createdAt ? new Date(policy.createdAt).toLocaleDateString() : '—'],
                  [t('policies.certStatus'), t('policies.active')],
                ].map(([label, value]) => (
                  <div key={label} className="col-6">
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-outline-custom" onClick={onClose}>{t('policies.close')}</button>
            <button className="btn-primary-custom" style={{ justifyContent: 'center' }} onClick={() => window.print()}>
              <i className="bi bi-printer me-2"></i>{t('policies.printDownload')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CustomerPoliciesPage() {
  const { t } = useTranslation()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [certPolicy, setCertPolicy] = useState(null)
  const [renewing, setRenewing] = useState(null)
  const [verifiedPaymentIds, setVerifiedPaymentIds] = useState(new Set())

  const fetchPolicies = () => {
    Promise.all([
      api.get('/customer/policies').catch(() => ({ data: [] })),
      api.get('/customer/payments').catch(() => ({ data: [] })),
    ]).then(([policiesRes, paymentsRes]) => {
      setPolicies(Array.isArray(policiesRes.data) ? policiesRes.data : [])
      const payments = Array.isArray(paymentsRes.data) ? paymentsRes.data : []
      setVerifiedPaymentIds(new Set(
        payments.filter(p => p.status === 'VERIFIED').map(p => p.applicationId)
      ))
    }).catch(() => setPolicies([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetchPolicies() }, [])

  const [downloading, setDownloading] = useState(null)

  const handleRenew = async (id) => {
    if (!window.confirm(t('policies.renewConfirm'))) return
    setRenewing(id)
    try {
      await api.post(`/customer/applications/${id}/renew`)
      toast.success(t('policies.renewSuccess'))
    } catch (err) {
      toast.error(err.response?.data?.message || t('policies.renewFailed'))
    } finally { setRenewing(null) }
  }

  const handleDownloadCertificate = async (policy) => {
    setDownloading(policy.id)
    try {
      const res = await api.get(`/customer/applications/${policy.id}/policy-contract`)
      await downloadPdf(res.data, `policy_certificate_${policy.policyNumber || policy.id}.pdf`)
    } catch {
      toast.error('Failed to download certificate PDF')
    } finally { setDownloading(null) }
  }

  return (
    <div className="fade-in">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('policies.title')}</h4>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>{t('policies.subtitle')}</p>
        </div>
        <Link to="/customer/apply" className="btn-primary-custom" style={{ fontSize: '0.88rem', padding: '0.45rem 1rem' }}>
          <i className="bi bi-plus-circle me-1"></i>{t('policies.newPolicy')}
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--primary)' }}></div></div>
      ) : policies.length === 0 ? (
        <div className="card-custom text-center py-5">
          <i className="bi bi-shield-check" style={{ fontSize: '3rem', color: 'var(--border)' }}></i>
          <h5 style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{t('policies.noPolicies')}</h5>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('policies.noPoliciesDesc')}</p>
          <Link to="/customer/apply" className="btn-primary-custom mt-2" style={{ display: 'inline-flex' }}>{t('policies.applyNow')}</Link>
        </div>
      ) : (
        <div className="row g-4">
          {policies.map(policy => {
            const typeMeta = getTypeMeta(policy.packageType)
            const riskMeta = RISK_META[policy.riskLevel] || RISK_META['LOW']
            return (
              <div key={policy.id} className="col-12 col-md-6">
                <div className="card-custom h-100" style={{ border: `2px solid ${typeMeta.color}30` }}>
                  {/* Header */}
                  <div className="d-flex align-items-start justify-content-between mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: typeMeta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`bi ${typeMeta.icon}`} style={{ color: typeMeta.color, fontSize: '1.4rem' }}></i>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: typeMeta.color, textTransform: 'uppercase' }}>{policy.packageType}</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{policy.packageName}</div>
                      </div>
                    </div>
                    <span style={{ padding: '0.25rem 0.65rem', borderRadius: 99, background: '#dcfce7', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{t('policies.active')}</span>
                  </div>

                  {/* Policy Number */}
                  <div className="mb-3 p-2" style={{ background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('policies.policyNumber')}</div>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)', fontSize: '0.95rem' }}>{policy.policyNumber || t('policies.pendingAssignment')}</div>
                  </div>

                  {/* Stats grid */}
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.45rem 0.65rem' }}>
                        <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{t('policies.coverage')}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{Number(policy.coverageAmount).toLocaleString()} MMK</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.45rem 0.65rem' }}>
                        <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{t('policies.totalPremium')}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{policy.premiumAmount ? Number(policy.premiumAmount).toLocaleString() : '—'} MMK</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.45rem 0.65rem' }}>
                        <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{t('policies.duration')}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{policy.duration} {policy.duration > 1 ? t('policies.years') : t('policies.year')}</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div style={{ background: riskMeta.bg, borderRadius: 8, padding: '0.45rem 0.65rem' }}>
                        <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{t('policies.riskLevel')}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: riskMeta.color }}>
                          <i className={`bi ${riskMeta.icon} me-1`}></i>{policy.riskLevel || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {policy.agentName && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      <i className="bi bi-person-badge me-1"></i>{t('policies.agent')}: {policy.agentName}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="d-flex flex-wrap gap-2 mt-auto">
                    <button onClick={() => setCertPolicy(policy)} className="btn-primary-sm" style={{ flex: '1 1 auto' }}>
                      <i className="bi bi-file-earmark-text me-1"></i>{t('policies.certificate')}
                    </button>
                    <button
                      onClick={() => handleDownloadCertificate(policy)}
                      disabled={downloading === policy.id}
                      style={{ flex: '1 1 auto', padding: '0.4rem 0.85rem', borderRadius: 8, border: '1.5px solid #1d4ed8', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                      {downloading === policy.id
                        ? <span className="spinner-border spinner-border-sm"></span>
                        : <><i className="bi bi-download me-1"></i>PDF</>}
                    </button>
                    {verifiedPaymentIds.has(policy.id) ? (
                      <Link to="/customer/submit-claim" className="btn-outline-custom" style={{ textDecoration: 'none', padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
                        <i className="bi bi-file-earmark-plus me-1"></i>{t('policies.claim')}
                      </Link>
                    ) : (
                      <span
                        title={t('policies.claimPaymentRequired')}
                        style={{ padding: '0.4rem 0.85rem', borderRadius: 8, border: '1.5px solid #fcd34d', background: '#fef9c3', color: '#92400e', fontSize: '0.82rem', fontWeight: 600, cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <i className="bi bi-credit-card me-1"></i>{t('policies.payFirst')}
                      </span>
                    )}
                    <button onClick={() => handleRenew(policy.id)} disabled={renewing === policy.id} style={{ padding: '0.4rem 0.85rem', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                      {renewing === policy.id ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-arrow-repeat me-1"></i>{t('policies.renew')}</>}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {certPolicy && <PolicyCertificate policy={certPolicy} onClose={() => setCertPolicy(null)} />}
    </div>
  )
}
