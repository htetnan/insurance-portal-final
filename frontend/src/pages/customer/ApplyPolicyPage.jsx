import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { toast } from 'react-toastify'
import AgentProfileCard from '../../components/AgentProfileCard'
import DigitalSignatureCanvas from '../../components/DigitalSignatureCanvas'
import DynamicFormFields from '../../components/DynamicFormFields'
import { getTypeMeta } from '../../utils/typeMeta'

export default function ApplyPolicyPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const preselectedId = location.state?.planId

  const signatureRef = useRef()
  const [signatureData, setSignatureData] = useState(null)

  const [step, setStep] = useState(1)
  const [plans, setPlans] = useState([])
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [coverage, setCoverage] = useState('')
  const [duration, setDuration] = useState(1)
  const [notes, setNotes] = useState('')

  const [template, setTemplate] = useState(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [fieldValues, setFieldValues] = useState({})
  const [fieldFiles, setFieldFiles]   = useState({})

  const [submitting, setSubmitting] = useState(false)

  const STEPS = [
    { id: 1, title: t('applyPolicy.step1'), icon: 'bi-grid-3x3-gap' },
    { id: 2, title: t('applyPolicy.step2'), icon: 'bi-ui-checks' },
    { id: 3, title: t('applyPolicy.step3'), icon: 'bi-check2-circle' },
  ]

  useEffect(() => {
    api.get('/packages/public').then(res => {
      const pkgs = Array.isArray(res.data) ? res.data : []
      setPlans(pkgs)
      if (preselectedId) {
        const p = pkgs.find(x => x.id === Number(preselectedId))
        if (p) { selectPlan(p) }
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedPlan) { setTemplate(null); return }
    setTemplateLoading(true)
    setFieldValues({})
    setFieldFiles({})
    api.get(`/forms/public?packageId=${selectedPlan.id}&formType=APPLICATION`)
      .then(res => {
        const tmpl = res.data
        setTemplate(tmpl)
        if (tmpl?.fields && user) {
          const prefill = {}
          tmpl.fields.forEach(f => {
            if (f.fieldType === 'NAME')  prefill[String(f.id)] = user.name  || ''
            if (f.fieldType === 'EMAIL') prefill[String(f.id)] = user.email || ''
          })
          if (Object.keys(prefill).length > 0) setFieldValues(prefill)
        }
      })
      .catch(() => setTemplate(null))
      .finally(() => setTemplateLoading(false))
  }, [selectedPlan?.id])

  const selectPlan = (plan) => {
    setSelectedPlan(plan)
    setCoverage(String(plan.coverageMin || ''))
    setDuration((plan.durationTiers?.[0]?.years) || 1)
    setStep(2)
  }

  const handleFieldValue = (fieldId, value) => setFieldValues(v => ({ ...v, [String(fieldId)]: value }))
  const handleFieldFile  = (fieldId, file)  => setFieldFiles(v => ({ ...v, [String(fieldId)]: file }))
  const handleCheckboxOption = (fieldId, option, checked) => {
    setFieldValues(prev => {
      const current = Array.isArray(prev[String(fieldId)]) ? prev[String(fieldId)] : []
      const next = checked ? [...current, option] : current.filter(o => o !== option)
      return { ...prev, [String(fieldId)]: next }
    })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const formDataObj = {}
      Object.entries(fieldValues).forEach(([k, v]) => {
        formDataObj[k] = Array.isArray(v) ? JSON.stringify(v) : v
      })

      if (!signatureData) {
        toast.error(t('applyPolicy.sigMissing'))
        setSubmitting(false)
        return
      }

      const mergedFormData = {
        __name: user?.name || '',
        __email: user?.email || '',
        __signature: signatureData,
        ...formDataObj,
      }

      const fd = new FormData()
      fd.append('packageId', selectedPlan.id)
      fd.append('coverageAmount', coverage)
      fd.append('duration', duration)
      fd.append('notes', notes)
      fd.append('formData', JSON.stringify(mergedFormData))

      Object.entries(fieldFiles).forEach(([fieldId, file]) => {
        if (file) fd.append(`file_${fieldId}`, file)
      })

      await api.post('/customer/applications', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(t('applyPolicy.submitSuccess'))
      navigate('/customer/applications')
    } catch (err) {
      toast.error(err.response?.data?.message || t('applyPolicy.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPlans = typeFilter === 'ALL' ? plans : plans.filter(p => p.type === typeFilter)
  const durations = selectedPlan?.durationTiers?.map(t => t.years) || []
  const selectedTier = selectedPlan?.durationTiers?.find(t => t.years === duration)
  const premium = selectedTier && coverage
    ? Math.round(Number(coverage) * selectedTier.premiumRate * duration)
    : null
  const meta2 = selectedPlan ? getTypeMeta(selectedPlan.type) : {}

  return (
    <div className="fade-in">
      <div className="mb-4">
        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('applyPolicy.title')}</h4>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>{t('applyPolicy.subtitle')}</p>
      </div>

      {/* Step indicator */}
      <div className="d-flex align-items-center gap-0 mb-5" style={{ maxWidth: 500 }}>
        {STEPS.map((s, idx) => (
          <React.Fragment key={s.id}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: idx < STEPS.length - 1 ? 'none' : 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step >= s.id ? 'var(--primary)' : 'var(--bg-secondary)',
                color: step >= s.id ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s',
                border: `2px solid ${step >= s.id ? 'var(--primary)' : 'var(--border)'}`
              }}>
                {step > s.id ? <i className="bi bi-check2"></i> : s.id}
              </div>
              <span style={{ fontSize: '0.72rem', color: step >= s.id ? 'var(--primary)' : 'var(--text-muted)', marginTop: 4, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.title}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: step > s.id ? 'var(--primary)' : 'var(--border)', margin: '0 8px', marginBottom: 20, transition: 'all 0.2s' }}></div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 1: Plan selection ── */}
      {step === 1 && (
        <>
          <div className="d-flex gap-2 mb-4 flex-wrap">
            {['ALL', ...[...new Set(plans.map(p => p.type))]].map(tp => {
              const meta = tp === 'ALL' ? null : getTypeMeta(tp)
              return (
                <button key={tp} onClick={() => setTypeFilter(tp)} style={{
                  padding: '0.4rem 1rem', borderRadius: 20, border: `2px solid ${typeFilter === tp ? (meta?.color || 'var(--primary)') : 'transparent'}`,
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                  background: typeFilter === tp ? (meta?.bg || 'var(--bg-secondary)') : 'var(--bg-secondary)',
                  color: typeFilter === tp ? (meta?.color || 'var(--primary)') : 'var(--text-secondary)',
                }}>
                  {meta && <i className={`bi ${meta.icon} me-1`}></i>}{tp === 'ALL' ? t('applyPolicy.allFilter') : meta?.label || tp}
                </button>
              )
            })}
          </div>
          {filteredPlans.length === 0 ? (
            <div className="card-custom text-center py-5">
              <i className="bi bi-box-seam" style={{ fontSize: '3rem', color: 'var(--border)' }}></i>
              <h5 style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{t('applyPolicy.noPlans')}</h5>
            </div>
          ) : (
            <div className="row g-3">
              {filteredPlans.map(plan => {
                const meta = getTypeMeta(plan.type)
                return (
                  <div key={plan.id} className="col-12 col-md-6">
                    <div onClick={() => selectPlan(plan)} style={{
                      padding: '1.25rem', borderRadius: 14, cursor: 'pointer',
                      border: `2px solid ${meta.color || 'var(--border)'}22`,
                      background: meta.bg || 'var(--bg-secondary)',
                      transition: 'all 0.15s',
                    }} className="h-100">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
                        <i className={`bi ${meta.icon || 'bi-shield'}`} style={{ fontSize: '1.5rem', color: meta.color }}></i>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{plan.name}</div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: meta.color }}>{plan.type}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>{plan.description}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{Number(plan.coverageMin).toLocaleString()} – {Number(plan.coverageMax).toLocaleString()} MMK</span>
                        <span style={{ fontWeight: 700, color: meta.color }}>{plan.durationTiers?.length > 0 ? `${(Math.min(...plan.durationTiers.map(t => t.premiumRate)) * 100).toFixed(1)}%` : '—'}/{t('applyPolicy.year')}</span>
                      </div>
                      {(plan.minPolicyTerm || plan.policyTerm) && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                          <i className="bi bi-clock me-1"></i>
                          {t('applyPolicy.policyTermLabel')}: {plan.minPolicyTerm && plan.policyTerm
                            ? `${plan.minPolicyTerm} – ${plan.policyTerm} ${t('applyPolicy.yrs')}`
                            : plan.policyTerm
                              ? `${t('applyPolicy.upTo')} ${plan.policyTerm} ${t('applyPolicy.yrs')}`
                              : `${t('applyPolicy.from')} ${plan.minPolicyTerm} ${t('applyPolicy.yrs')}`}
                        </div>
                      )}
                      {plan.eligibility && (
                        <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.65rem', borderRadius: 8, background: 'rgba(255,255,255,0.6)', border: `1px solid ${meta.color}22` }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                            <i className="bi bi-person-check me-1"></i>{t('applyPolicy.eligibility')}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{plan.eligibility}</div>
                        </div>
                      )}
                      <button style={{
                        marginTop: '0.75rem', width: '100%', padding: '0.5rem', borderRadius: 8,
                        border: 'none', background: meta.color, color: '#fff',
                        fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                      }}>{t('applyPolicy.selectPlanBtn')}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Step 2: Fill Form ── */}
      {step === 2 && selectedPlan && (
        <div className="row g-4">
          <div className="col-12 col-lg-8">
            {/* Hero banner */}
            <div style={{
              borderRadius: '16px 16px 0 0',
              background: 'linear-gradient(135deg, ' + meta2.color + ' 0%, ' + meta2.color + 'bb 100%)',
              padding: '1.75rem 1.75rem 2.5rem',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
                <div style={{ width: 54, height: 54, borderRadius: 14, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`bi ${meta2.icon}`} style={{ fontSize: '1.6rem', color: '#fff' }}></i>
                </div>
                <div className="flex-grow-1">
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{selectedPlan.type}</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.2 }}>{selectedPlan.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', marginTop: 3 }}>
                    {(selectedPlan.premiumRate * 100).toFixed(1)}% {t('applyPolicy.premiumRate')} &nbsp;·&nbsp; {Number(selectedPlan.coverageMin).toLocaleString()} – {Number(selectedPlan.coverageMax).toLocaleString()} MMK
                  </div>
                </div>
                <button onClick={() => { setStep(1); setSelectedPlan(null) }} style={{
                  background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff', borderRadius: 8, padding: '0.35rem 0.75rem',
                  cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, backdropFilter: 'blur(4px)',
                  flexShrink: 0,
                }}>
                  <i className="bi bi-arrow-left me-1"></i>{t('applyPolicy.changeLabel')}
                </button>
              </div>
            </div>

            <div className="card-custom" style={{ borderRadius: '0 0 16px 16px', marginTop: 0, borderTop: 'none', paddingTop: '1.5rem' }}>

              {/* Coverage & duration */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: meta2.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  <i className="bi bi-sliders me-1"></i>{t('applyPolicy.coverageDetails')}
                </div>
                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label-custom">{t('applyPolicy.coverageAmount')}</label>
                    <input type="number" className="form-control-custom w-100"
                      value={coverage}
                      min={selectedPlan.coverageMin} max={selectedPlan.coverageMax}
                      onChange={e => setCoverage(e.target.value)} />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {t('applyPolicy.rangeLabel')}: {Number(selectedPlan.coverageMin).toLocaleString()} – {Number(selectedPlan.coverageMax).toLocaleString()} MMK
                    </small>
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label-custom">{t('applyPolicy.durationYears')}</label>
                    <select className="form-select-custom w-100" value={duration} onChange={e => setDuration(Number(e.target.value))}>
                      {(Array.isArray(durations) ? durations : String(durations).split(',').map(Number)).map(d => (
                        <option key={d} value={d}>{d} {d > 1 ? t('applyPolicy.years') : t('applyPolicy.year')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic form fields */}
              {templateLoading && (
                <div className="text-center py-3">
                  <span className="spinner-border spinner-border-sm me-2" style={{ color: meta2.color }}></span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('applyPolicy.loadingForm')}</span>
                </div>
              )}

              {!templateLoading && template && template.fields?.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: meta2.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                    <i className="bi bi-ui-checks me-1"></i>{template.name}
                  </div>
                  <DynamicFormFields
                    fields={template.fields.filter(f => !(f.fieldType === 'LABEL' && f.fieldLabel?.toLowerCase().includes('personal information')))}
                    fieldValues={fieldValues}
                    fieldFiles={fieldFiles}
                    onValue={handleFieldValue}
                    onFile={handleFieldFile}
                    onCheckboxOption={handleCheckboxOption}
                    user={user}
                    autoFilledLabel={t('applyPolicy.autoFilled')}
                  />
                </div>
              )}

              {!templateLoading && !template && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: 8, background: '#fef3c7', border: '1px solid #fcd34d', marginBottom: '1rem', fontSize: '0.85rem', color: '#92400e' }}>
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {t('applyPolicy.noFormNote')}
                </div>
              )}

              {/* Additional notes */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.75rem' }}>
                <label className="form-label-custom">{t('applyPolicy.additionalNotes')}</label>
                <textarea rows={2} className="form-control-custom w-100" style={{ resize: 'vertical' }}
                  placeholder={t('applyPolicy.notesPlaceholder')}
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              {/* Digital Signature */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.75rem' }}>
                <div className="info-box-blue-sm mb-3">
                  <i className="bi bi-pen me-2"></i>
                  <strong>Digital Signature</strong> — {t('applyPolicy.sigRequired').replace('Digital Signature — ', '')}
                </div>
                <DigitalSignatureCanvas
                  ref={signatureRef}
                  label={t('applyPolicy.sigLabel')}
                  required
                  onChange={data => setSignatureData(data)}
                  height={160}
                />
              </div>

              <div className="d-flex gap-2 mt-4">
                <button
                  onClick={() => {
                    if (!signatureData) {
                      toast.error(t('applyPolicy.sigMissing'))
                      return
                    }
                    setStep(3)
                  }}
                  className="btn-primary-custom flex-grow-1"
                  style={{ justifyContent: 'center', background: meta2.color, borderColor: meta2.color }}
                  disabled={templateLoading}
                >
                  {t('applyPolicy.reviewBtn')}
                </button>
                <button onClick={() => { setStep(1); setSelectedPlan(null) }} className="btn-outline-custom">
                  {t('applyPolicy.backBtn')}
                </button>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="col-12 col-lg-4">
            <AgentProfileCard packageType={selectedPlan?.type} style={{ marginBottom: '1rem' }} />
            <div className="card-custom">
              <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>{t('applyPolicy.premiumEstimate')}</h6>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem' }}>
                {[
                  [t('applyPolicy.plan'), selectedPlan.name],
                  [t('applyPolicy.type'), selectedPlan.type],
                  [t('applyPolicy.coverage'), coverage ? Number(coverage).toLocaleString() + ' MMK' : '—'],
                  [t('applyPolicy.duration'), `${duration} ${duration > 1 ? t('applyPolicy.years') : t('applyPolicy.year')}`],
                  [t('applyPolicy.rate'), `${(selectedPlan.premiumRate * 100).toFixed(1)}%/${t('applyPolicy.year')}`],
                  ...(selectedPlan.minPolicyTerm || selectedPlan.policyTerm ? [[t('applyPolicy.policyTerm'), selectedPlan.minPolicyTerm && selectedPlan.policyTerm ? `${selectedPlan.minPolicyTerm} – ${selectedPlan.policyTerm} ${t('applyPolicy.yrs')}` : selectedPlan.policyTerm ? `${t('applyPolicy.upTo')} ${selectedPlan.policyTerm} ${t('applyPolicy.yrs')}` : `${t('applyPolicy.from')} ${selectedPlan.minPolicyTerm} ${t('applyPolicy.yrs')}`]] : []),
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.6rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem' }}>
                    <span>{t('applyPolicy.estPremium')}</span>
                    <span style={{ color: 'var(--primary)' }}>
                      {premium ? Number(premium).toLocaleString() + ' MMK' : '—'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {t('applyPolicy.finalNote')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Submit ── */}
      {step === 3 && selectedPlan && (
        <div className="row g-4">
          <div className="col-12 col-lg-8">
            <div className="card-custom">
              <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>{t('applyPolicy.reviewTitle')}</h6>

              <ReviewRow label={t('applyPolicy.plan')} value={selectedPlan.name} />
              <ReviewRow label={t('applyPolicy.type')} value={selectedPlan.type} />
              <ReviewRow label={t('applyPolicy.coverage')} value={Number(coverage).toLocaleString() + ' MMK'} />
              <ReviewRow label={t('applyPolicy.duration')} value={`${duration} ${duration > 1 ? t('applyPolicy.years') : t('applyPolicy.year')}`} />
              <ReviewRow label={t('applyPolicy.estPremium')} value={premium ? Number(premium).toLocaleString() + ' MMK' : '—'} />
              {notes && <ReviewRow label={t('applyPolicy.notes')} value={notes} />}
              {signatureData && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    <i className="bi bi-pen me-1"></i>{t('applyPolicy.sigSection')}
                  </div>
                  <img src={signatureData} alt="Signature" style={{ maxHeight: 80, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', padding: 4 }} />
                  <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: 4 }}>
                    <i className="bi bi-check-circle me-1"></i>{t('applyPolicy.sigDone')}
                  </div>
                </div>
              )}

              {/* Dynamic form summary */}
              {template?.fields && template.fields.filter(f => f.fieldType !== 'LABEL').length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                    {t('applyPolicy.formDetails')}
                  </div>
                  {template.fields.filter(f => f.fieldType !== 'LABEL').map(field => {
                    const val = fieldValues[String(field.id)]
                    const file = fieldFiles[String(field.id)]
                    let display = '—'
                    if ((field.fieldType === 'IMAGE_UPLOAD' || field.fieldType === 'PDF_UPLOAD') && file) {
                      display = file.name
                    } else if (Array.isArray(val)) {
                      display = val.join(', ') || '—'
                    } else if (val) {
                      display = val
                    }
                    return <ReviewRow key={field.id} label={field.fieldLabel} value={display} />
                  })}
                </div>
              )}

              <div className="d-flex gap-2 mt-4">
                <button onClick={handleSubmit} disabled={submitting} className="btn-primary-custom flex-grow-1" style={{ justifyContent: 'center' }}>
                  {submitting
                    ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('applyPolicy.submitting')}</>
                    : <><i className="bi bi-send me-2"></i>{t('applyPolicy.submitBtn')}</>}
                </button>
                <button onClick={() => setStep(2)} className="btn-outline-custom" disabled={submitting}>{t('applyPolicy.backBtn')}</button>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <div className="card-custom">
              <h6 style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>📋 {t('applyPolicy.whatNext')}</h6>
              {[
                t('applyPolicy.next1'),
                t('applyPolicy.next2'),
                t('applyPolicy.next3'),
                t('applyPolicy.next4'),
                t('applyPolicy.next5'),
              ].map((s, i) => (
                <div key={i} className="d-flex align-items-start gap-2 mb-2">
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewRow({ label, value }) {
  return (
    <div className="d-flex gap-2 mb-2" style={{ fontSize: '0.88rem' }}>
      <span style={{ color: 'var(--text-muted)', minWidth: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{value || '—'}</span>
    </div>
  )
}

