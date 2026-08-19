import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { toast } from 'react-toastify'
import PaymentMethodIcon, { PAYMENT_METHODS as FALLBACK_METHODS } from '../../components/PaymentMethodIcon'
import DigitalSignatureCanvas from '../../components/DigitalSignatureCanvas'

const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const STATUS_COLOR  = { PAID: '#16a34a', OVERDUE: '#dc2626', DUE: '#d97706', PENDING_VERIFICATION: '#7c3aed', UPCOMING: '#64748b' }
const STATUS_BG     = { PAID: '#dcfce7', OVERDUE: '#fee2e2', DUE: '#fef3c7', PENDING_VERIFICATION: '#ede9fe', UPCOMING: '#f1f5f9' }
const PAY_STATUS_COLOR = s => ({ PENDING: '#d97706', VERIFIED: '#16a34a', REJECTED: '#dc2626' }[s] || '#64748b')
const PAY_STATUS_BG    = s => ({ PENDING: '#fef3c7', VERIFIED: '#dcfce7', REJECTED: '#fee2e2' }[s] || '#f1f5f9')

const FREQ_LABEL_KEYS = {
  MONTHLY: 'လစဥ်', QUARTERLY: 'သုံးလတစ်ကြိမ်',
  HALF_YEARLY: 'ခြောက်လတစ်ကြိမ်', YEARLY: 'နှစ်စဥ်',
}

export default function MyPaymentsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('schedule')
  const [payments, setPayments]   = useState([])
  const [schedules, setSchedules] = useState([])
  const [payMethods, setPayMethods] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [payForm, setPayForm]     = useState({
    applicationId: '', paymentMethod: '', screenshot: null,
    notes: '', periodNumber: null, periodLabel: '', installmentAmount: null,
    transactionLastSixDigits: '', transactionAmount: '',
  })
  const [paySignature, setPaySignature] = useState(null)
  const paySignatureRef = useRef()
  const [submitting, setSubmitting] = useState(false)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      api.get('/customer/payments').catch(() => ({ data: [] })),
      api.get('/customer/payment-schedule').catch(() => ({ data: [] })),
      api.get('/payment-methods/public').catch(() => ({ data: [] })),
    ]).then(([paymentsRes, scheduleRes, methodsRes]) => {
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : [])
      setSchedules(Array.isArray(scheduleRes.data) ? scheduleRes.data : [])
      const dbMethods = Array.isArray(methodsRes.data) ? methodsRes.data : []
      setPayMethods(dbMethods.length > 0 ? dbMethods : FALLBACK_METHODS.map(m => ({
        id: m.id, methodKey: m.id, name: m.label, color: m.color, hasQr: false, hasLogo: false
      })))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const openModal = ({ appId = '', periodNumber = null, periodLabel = '', installmentAmount = null } = {}) => {
    setPayForm({ applicationId: String(appId), paymentMethod: '', screenshot: null, notes: '', periodNumber, periodLabel, installmentAmount, transactionLastSixDigits: '', transactionAmount: '' })
    setPaySignature(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setPaySignature(null)
    if (paySignatureRef.current) paySignatureRef.current.clear?.()
  }

  const handleSubmitPayment = async e => {
    e.preventDefault()
    if (!payForm.applicationId) { toast.error(t('payments.policyMissing')); return }
    if (!payForm.paymentMethod) { toast.error(t('payments.methodMissing')); return }
    if (!payForm.screenshot)    { toast.error(t('payments.screenshotMissing')); return }
    if (!paySignature)          { toast.error(t('payments.sigMissing')); return }
    const last6 = (payForm.transactionLastSixDigits || '').replace(/[^0-9]/g, '')
    if (last6.length !== 6)     { toast.error(t('payments.transactionDigitsMissing')); return }
    if (!payForm.transactionAmount || Number(payForm.transactionAmount) <= 0) {
      toast.error(t('payments.transactionAmountMissing')); return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('applicationId', payForm.applicationId)
      fd.append('paymentMethod', payForm.paymentMethod)
      fd.append('screenshot',    payForm.screenshot)
      fd.append('notes',         payForm.notes)
      fd.append('signature',     paySignature)
      fd.append('transactionLastSixDigits', last6)
      fd.append('transactionAmount', payForm.transactionAmount)
      if (payForm.periodNumber != null) fd.append('periodNumber', payForm.periodNumber)
      if (payForm.periodLabel)          fd.append('periodLabel',  payForm.periodLabel)
      await api.post('/customer/payments', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(t('payments.submitSuccess'))
      closeModal()
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit payment')
    } finally { setSubmitting(false) }
  }

  const selectedMethod = payMethods.find(m => (m.methodKey || m.id) === payForm.paymentMethod)

  const paidOrPendingAppIds = new Set(
    payments.filter(p => p.status === 'PENDING' || p.status === 'VERIFIED')
            .map(p => p.applicationId).filter(Boolean)
  )

  const urgentCount = schedules.reduce((sum, s) =>
    sum + s.schedule.filter(e => e.status === 'OVERDUE' || e.status === 'DUE').length, 0)

  const tabs = [
    { key: 'schedule', label: t('payments.scheduleTab'), icon: 'bi-calendar2-check', count: urgentCount, badgeColor: '#dc2626', badgeBg: '#fee2e2' },
    { key: 'history',  label: t('payments.historyTab'),  icon: 'bi-receipt', count: payments.length, badgeColor: 'var(--primary)', badgeBg: '#eff6ff' },
  ]

  const STATUS_LABEL = {
    PAID: t('payments.statusPaid'),
    OVERDUE: t('payments.statusOverdue'),
    DUE: t('payments.statusDue'),
    PENDING_VERIFICATION: t('payments.statusPendingVerification'),
    UPCOMING: t('payments.statusUpcoming'),
  }

  return (
    <div className="fade-in">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('payments.title')}</h4>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>{t('payments.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="d-flex gap-1 mb-4" style={{
        background: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: 12, width: 'fit-content'
      }}>
        {tabs.map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.45rem 1.1rem', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.85rem', transition: 'all .15s',
              display: 'flex', alignItems: 'center', gap: 7,
              background: activeTab === tab.key ? 'var(--bg-primary)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            }}>
            <i className={`bi ${tab.icon}`}></i>
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                background: tab.badgeBg, color: tab.badgeColor, borderRadius: 99,
                fontSize: '0.7rem', fontWeight: 800, padding: '0.05rem 0.45rem',
                minWidth: 20, textAlign: 'center',
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--primary)' }}></div></div>
      ) : (
        <>
          {/* ── TAB: Schedule ── */}
          {activeTab === 'schedule' && (
            <div className="fade-in">
              {schedules.length === 0 ? (
                <div className="card-custom text-center py-5">
                  <i className="bi bi-calendar2" style={{ fontSize: '3rem', color: 'var(--border)' }}></i>
                  <h5 style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{t('payments.noSchedule')}</h5>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('payments.noScheduleDesc')}</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-4">
                  {schedules.map(sched => (
                    <PolicyScheduleCard
                      key={sched.applicationId}
                      sched={sched}
                      statusLabel={STATUS_LABEL}
                      onPay={({ periodNumber, periodLabel, installmentAmount }) =>
                        openModal({ appId: sched.applicationId, periodNumber, periodLabel, installmentAmount })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: History ── */}
          {activeTab === 'history' && (
            <div className="fade-in">
              {payments.length === 0 ? (
                <div className="card-custom text-center py-5">
                  <i className="bi bi-receipt" style={{ fontSize: '3rem', color: 'var(--border)' }}></i>
                  <h5 style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{t('payments.noHistory')}</h5>
                </div>
              ) : (
                <div className="card-custom p-0">
                  <div className="table-custom">
                    <table className="w-100">
                      <thead>
                        <tr>
                          {[t('payments.historyId'), t('payments.historyPolicy'), t('payments.historyPeriod'), t('payments.historyAmount'), t('payments.historyMethod'), t('payments.historyStatus'), t('payments.historyDate'), t('payments.historyVerifiedBy')].map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map(p => {
                          const method = payMethods.find(m => (m.methodKey || m.id) === p.paymentMethod)
                          return (
                            <tr key={p.id}>
                              <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>#{p.id}</td>
                              <td style={{ fontWeight: 500, maxWidth: 160 }}>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.policyName || '—'}
                                </div>
                                {p.policyNumber && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>#{p.policyNumber}</div>}
                              </td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {p.periodLabel || (p.periodNumber ? `Period ${p.periodNumber}` : '—')}
                              </td>
                              <td style={{ fontWeight: 600 }}>{p.amount != null ? Number(p.amount).toLocaleString() : '—'}</td>
                              <td>
                                {p.paymentMethod ? (
                                  <div className="d-flex align-items-center gap-2">
                                    {method?.hasLogo ? (
                                      <PaymentMethodIcon method={p.paymentMethod} size={22}
                                        logoUrl={`${BASE}/payment-methods/${method.id}/logo`}
                                        color={method.color} label={method.name} />
                                    ) : (
                                      <PaymentMethodIcon method={p.paymentMethod} size={22}
                                        color={method?.color} label={method?.name} />
                                    )}
                                    <span style={{ fontSize: '0.8rem' }}>{method?.name || p.paymentMethod}</span>
                                  </div>
                                ) : <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.paymentType}</span>}
                              </td>
                              <td>
                                <span style={{
                                  fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                                  borderRadius: 99, background: PAY_STATUS_BG(p.status), color: PAY_STATUS_COLOR(p.status)
                                }}>{p.status}</span>
                              </td>
                              <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{p.verifiedBy || '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Payment Modal ── */}
      {showModal && (
        <PaymentModal
          payForm={payForm} setPayForm={setPayForm}
          payMethods={payMethods} selectedMethod={selectedMethod}
          paySignatureRef={paySignatureRef} paySignature={paySignature}
          setPaySignature={setPaySignature} submitting={submitting}
          onSubmit={handleSubmitPayment} onClose={closeModal}
          BASE={BASE}
        />
      )}
    </div>
  )
}

// ── Policy Schedule Card ────────────────────────────────────────────────────

function PolicyScheduleCard({ sched, onPay, statusLabel }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const urgentEntries = sched.schedule.filter(e => e.status === 'OVERDUE' || e.status === 'DUE')
  const isOneTime = sched.totalInstallments === 1
  const paidAll = sched.paidCount === sched.totalInstallments

  return (
    <div className="card-custom">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div className="d-flex align-items-center gap-3">
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="bi bi-shield-check" style={{ fontSize: '1.4rem', color: 'var(--primary)' }}></i>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              {sched.packageName || 'Insurance Policy'}
              {sched.packageType && (
                <span className="type-badge-pill" style={{ marginLeft: 8, padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.7rem' }}>
                  {sched.packageType}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {sched.policyNumber} · {FREQ_LABEL_KEYS[sched.paymentFrequency] || sched.paymentFrequency || t('payments.onceFreq')}
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('payments.installmentLabel')}</div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>
              {Number(sched.installmentAmount).toLocaleString()} MMK
            </div>
          </div>
          {!isOneTime && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('payments.paidOutOf')}</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: paidAll ? '#16a34a' : 'var(--text-primary)' }}>
                {sched.paidCount}/{sched.totalInstallments}
              </div>
            </div>
          )}
          {!isOneTime && (
            <button type="button" onClick={() => setExpanded(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', color: 'var(--text-muted)', fontSize: '1rem' }}>
              <i className={`bi bi-chevron-${expanded ? 'up' : 'down'}`}></i>
            </button>
          )}
        </div>
      </div>

      {urgentEntries.length > 0 && (
        <div className="d-flex flex-column gap-2 mb-2">
          {urgentEntries.map(entry => (
            <InstallmentRow key={entry.periodNumber} entry={entry} statusLabel={statusLabel} onPay={() => onPay({
              periodNumber: entry.periodNumber,
              periodLabel: entry.periodLabel,
              installmentAmount: sched.installmentAmount,
            })} highlight />
          ))}
        </div>
      )}

      {(expanded || isOneTime) && (
        <div className="fade-in">
          {isOneTime ? (
            sched.schedule.map(entry => (
              <InstallmentRow key={entry.periodNumber} entry={entry} statusLabel={statusLabel} onPay={() => onPay({
                periodNumber: entry.periodNumber,
                periodLabel: entry.periodLabel,
                installmentAmount: sched.installmentAmount,
              })} />
            ))
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
              {sched.schedule.filter(e => e.status !== 'OVERDUE' && e.status !== 'DUE').map(entry => (
                <InstallmentRow key={entry.periodNumber} entry={entry} statusLabel={statusLabel} onPay={() => onPay({
                  periodNumber: entry.periodNumber,
                  periodLabel: entry.periodLabel,
                  installmentAmount: sched.installmentAmount,
                })} />
              ))}
            </div>
          )}
        </div>
      )}

      {!isOneTime && !expanded && urgentEntries.length === 0 && paidAll && (
        <div style={{ textAlign: 'center', padding: '0.5rem', color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>
          <i className="bi bi-check-circle-fill me-1"></i>{t('payments.allPaid')}
        </div>
      )}
    </div>
  )
}

function InstallmentRow({ entry, onPay, highlight, statusLabel }) {
  const { t } = useTranslation()
  const canPay = entry.status === 'DUE' || entry.status === 'OVERDUE'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
      padding: '0.55rem 0.75rem', borderRadius: 8,
      background: highlight && canPay ? (entry.status === 'OVERDUE' ? '#fff1f2' : '#fffbeb') : 'var(--bg-secondary)',
      border: `1px solid ${highlight && canPay ? (entry.status === 'OVERDUE' ? '#fecdd3' : '#fde68a') : 'var(--border)'}`,
    }}>
      <div className="d-flex align-items-center gap-2">
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', minWidth: 22 }}>#{entry.periodNumber}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{entry.periodLabel}</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {entry.dueDate ? new Date(entry.dueDate + 'T00:00:00').toLocaleDateString('my-MM') : ''}
        </span>
      </div>
      <div className="d-flex align-items-center gap-2">
        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
          {Number(entry.amount).toLocaleString()} MMK
        </span>
        <span style={{
          fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 99,
          background: STATUS_BG[entry.status] || '#f1f5f9',
          color: STATUS_COLOR[entry.status] || '#64748b',
        }}>{statusLabel[entry.status] || entry.status}</span>
        {canPay && (
          <button type="button" onClick={onPay}
            style={{
              padding: '0.25rem 0.65rem', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: entry.status === 'OVERDUE' ? '#dc2626' : 'var(--primary)',
              color: '#fff', fontSize: '0.75rem', fontWeight: 700,
            }}>
            <i className="bi bi-credit-card me-1"></i>{t('payments.payBtn')}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({ payForm, setPayForm, payMethods, selectedMethod, paySignatureRef,
  paySignature, setPaySignature, submitting, onSubmit, onClose, BASE }) {
  const { t } = useTranslation()
  return (
    <div className="modal show d-block modal-custom" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              <i className="bi bi-credit-card me-2" style={{ color: 'var(--primary)' }}></i>{t('payments.modalTitle')}
            </h5>
            <button className="icon-btn" onClick={onClose}><i className="bi bi-x-lg"></i></button>
          </div>

          <form onSubmit={onSubmit}>
            <div className="modal-body">
              {/* Amount due banner */}
              {payForm.installmentAmount != null && (
                <div style={{
                  background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                  border: '1.5px solid #bfdbfe', borderRadius: 12,
                  padding: '0.85rem 1.1rem', marginBottom: '1.25rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>
                      <i className="bi bi-info-circle me-1"></i>
                      {payForm.periodLabel ? `${t('payments.periodPrefix')}${payForm.periodLabel}` : t('payments.amountDueLabel')}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#3b82f6', marginTop: 2 }}>
                      {t('payments.amountDueLabel')}
                    </div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '1.5rem', color: '#1d4ed8' }}>
                    {Number(payForm.installmentAmount).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>MMK</span>
                  </div>
                </div>
              )}

              {/* Payment Method select */}
              <div className="mb-4">
                <label className="form-label-custom">{t('payments.selectMethod')}</label>
                <div className="row g-2">
                  {payMethods.map(m => {
                    const key = m.methodKey || m.id
                    const selected = payForm.paymentMethod === key
                    return (
                      <div key={key} className="col-6 col-sm-4">
                        <button type="button"
                          onClick={() => setPayForm(f => ({ ...f, paymentMethod: key }))}
                          style={{
                            width: '100%', padding: '0.65rem 0.5rem',
                            borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                            border: `2px solid ${selected ? m.color : 'var(--border)'}`,
                            background: selected ? `${m.color}14` : 'var(--bg-secondary)',
                            transition: 'all .15s', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: 6,
                          }}>
                          {m.hasLogo ? (
                            <img src={`${BASE}/payment-methods/${m.id}/logo`} alt={m.name}
                              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${m.color}40` }}
                              onError={e => e.target.style.display = 'none'} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem' }}>
                              {m.name.charAt(0)}
                            </div>
                          )}
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: selected ? m.color : 'var(--text-primary)' }}>
                            {m.name}
                          </span>
                          {selected && <i className="bi bi-check-circle-fill" style={{ color: m.color, fontSize: '0.85rem' }}></i>}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* QR Code + amount reminder */}
                {selectedMethod && (
                  <div className="fade-in mt-3" style={{
                    borderRadius: 12, padding: '1rem',
                    background: `linear-gradient(135deg, ${selectedMethod.color}12, ${selectedMethod.color}05)`,
                    border: `1.5px solid ${selectedMethod.color}40`,
                    textAlign: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.75rem' }}>
                      <i className="bi bi-exclamation-circle-fill" style={{ color: selectedMethod.color, fontSize: '1rem' }}></i>
                      <span style={{ fontWeight: 700, color: selectedMethod.color, fontSize: '0.88rem' }}>
                        {t('payments.payTo', { method: selectedMethod.name })} {payForm.installmentAmount != null ? `${Number(payForm.installmentAmount).toLocaleString()} MMK` : ''}
                      </span>
                    </div>

                    {selectedMethod.hasQr ? (
                      <div>
                        <img
                          src={`${BASE}/payment-methods/${selectedMethod.id}/qr`}
                          alt={`${selectedMethod.name} QR Code`}
                          style={{ maxWidth: 220, maxHeight: 220, borderRadius: 12, border: `2px solid ${selectedMethod.color}40`, background: '#fff', padding: 8 }}
                        />
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
                          {t('payments.scanQr')}
                        </p>
                      </div>
                    ) : (
                      <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <i className="bi bi-qr-code" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.3 }}></i>
                        {t('payments.noQr')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Transaction details */}
              <div className="mb-3" style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '1rem', border: '1.5px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  <i className="bi bi-hash me-1" style={{ color: 'var(--primary)' }}></i>
                  {t('payments.transactionDetails')}
                </div>
                <div className="row g-2">
                  <div className="col-12 col-sm-6">
                    <label className="form-label-custom">{t('payments.transactionDigits')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="form-control-custom w-100"
                      placeholder="123456"
                      value={payForm.transactionLastSixDigits}
                      onChange={e => setPayForm(f => ({ ...f, transactionLastSixDigits: e.target.value.replace(/[^0-9]/g, '').slice(0,6) }))}
                      style={{ letterSpacing: '0.15em', fontWeight: 700, fontSize: '1.1rem', textAlign: 'center' }}
                      required
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                      {t('payments.transactionDigitsHint')}
                    </small>
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label-custom">{t('payments.transactionAmount')}</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control-custom w-100"
                      placeholder="50000"
                      value={payForm.transactionAmount}
                      onChange={e => setPayForm(f => ({ ...f, transactionAmount: e.target.value }))}
                      style={{ fontWeight: 700 }}
                      required
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                      {t('payments.transactionAmountHint')}
                    </small>
                  </div>
                </div>
              </div>

              {/* Screenshot upload */}
              <div className="mb-3">
                <label className="form-label-custom">
                  <i className="bi bi-image me-1"></i>{t('payments.screenshotLabel')}
                </label>
                <input type="file" accept="image/*" required className="form-control-custom w-100"
                  onChange={e => setPayForm(f => ({ ...f, screenshot: e.target.files[0] }))} />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  {t('payments.screenshotHint', { method: selectedMethod?.name || '' })}
                </small>
              </div>

              {/* Notes */}
              <div className="mb-3">
                <label className="form-label-custom">{t('payments.notes')}</label>
                <textarea rows={2} className="form-control-custom w-100" style={{ resize: 'vertical' }}
                  value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={t('payments.notesPlaceholder')} />
              </div>

              {/* Digital Signature */}
              <div className="mb-2">
                <div className="info-box-blue-sm mb-2">
                  <i className="bi bi-pen me-2"></i>
                  <strong>Digital Signature</strong> — {t('payments.sigRequired').replace('Digital Signature — ', '')}
                </div>
                <DigitalSignatureCanvas
                  ref={paySignatureRef}
                  label={t('payments.sigLabel')}
                  required
                  onChange={data => setPaySignature(data)}
                  height={140}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-outline-custom" onClick={onClose}>{t('payments.cancel')}</button>
              <button type="submit" disabled={submitting} className="btn-primary-custom" style={{ justifyContent: 'center' }}>
                {submitting
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('payments.submitting')}</>
                  : <><i className="bi bi-send me-2"></i>{t('payments.submitBtn')}</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
