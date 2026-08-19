import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { toast } from 'react-toastify'
import AgentProfileCard from '../../components/AgentProfileCard'
import DigitalSignatureCanvas from '../../components/DigitalSignatureCanvas'
import DynamicFormFields from '../../components/DynamicFormFields'

const CLAIM_TYPES = ['Accident', 'Hospitalization', 'Death Benefit', 'Property Damage', 'Vehicle Damage', 'Critical Illness', 'Other']

export default function SubmitClaimPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activePolicies, setActivePolicies] = useState([])
  const [claimedIds, setClaimedIds] = useState(new Set())
  const [form, setForm] = useState({ applicationId: '', claimType: '', amount: '', description: '', incidentDate: '' })
  const [claimTemplate, setClaimTemplate] = useState(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [fieldValues, setFieldValues] = useState({})
  const [fieldFiles, setFieldFiles] = useState({})
  const [loading, setLoading] = useState(false)
  const [signatureData, setSignatureData] = useState(null)
  const signatureRef = useRef()
  const { user } = useAuth()

  const [verifiedPaymentIds, setVerifiedPaymentIds] = useState(new Set())

  useEffect(() => {
    Promise.all([
      api.get('/customer/applications?status=APPROVED').catch(() => ({ data: [] })),
      api.get('/customer/claims').catch(() => ({ data: [] })),
      api.get('/customer/payments').catch(() => ({ data: [] })),
    ]).then(([appsRes, claimsRes, paymentsRes]) => {
      setActivePolicies(Array.isArray(appsRes.data) ? appsRes.data : [])
      const claims = Array.isArray(claimsRes.data) ? claimsRes.data : []
      setClaimedIds(new Set(claims.map(c => c.applicationId)))
      const payments = Array.isArray(paymentsRes.data) ? paymentsRes.data : []
      setVerifiedPaymentIds(new Set(
        payments.filter(p => p.status === 'VERIFIED').map(p => p.applicationId)
      ))
    })
  }, [])

  // Policies that already have a claim
  // Policies eligible to submit a claim: approved + verified payment + no existing claim
  const availablePolicies = activePolicies.filter(p => !claimedIds.has(p.id) && verifiedPaymentIds.has(p.id))
  // Policies approved but payment not yet verified
  const pendingPaymentPolicies = activePolicies.filter(p => !claimedIds.has(p.id) && !verifiedPaymentIds.has(p.id))

  const selectedPolicy = activePolicies.find(p => String(p.id) === String(form.applicationId))
  const maxClaimAmount = selectedPolicy?.coverageAmount ? Number(selectedPolicy.coverageAmount) : null

  useEffect(() => {
    if (!form.applicationId) { setClaimTemplate(null); return }
    const selectedPolicy = activePolicies.find(p => String(p.id) === String(form.applicationId))
    if (!selectedPolicy?.packageId) { setClaimTemplate(null); return }
    setTemplateLoading(true)
    setFieldValues({})
    setFieldFiles({})
    api.get(`/forms/public?packageId=${selectedPolicy.packageId}&formType=CLAIM`)
      .then(res => {
        const tmpl = res.data
        setClaimTemplate(tmpl)
        if (tmpl?.fields && user) {
          const prefill = {}
          tmpl.fields.forEach(f => {
            if (f.fieldType === 'NAME')  prefill[String(f.id)] = user.name  || ''
            if (f.fieldType === 'EMAIL') prefill[String(f.id)] = user.email || ''
          })
          if (Object.keys(prefill).length > 0) setFieldValues(prefill)
        }
      })
      .catch(() => setClaimTemplate(null))
      .finally(() => setTemplateLoading(false))
  }, [form.applicationId])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const handleFieldValue = (fieldId, value) => setFieldValues(v => ({ ...v, [String(fieldId)]: value }))
  const handleFieldFile  = (fieldId, file)  => setFieldFiles(v => ({ ...v, [String(fieldId)]: file }))

  const handleCheckboxOption = (fieldId, option, checked) => {
    setFieldValues(prev => {
      const current = Array.isArray(prev[String(fieldId)]) ? prev[String(fieldId)] : []
      const next = checked ? [...current, option] : current.filter(o => o !== option)
      return { ...prev, [String(fieldId)]: next }
    })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.applicationId) { toast.error(t('submitClaim.selectPolicyError')); return }

    const enteredAmount = parseFloat(form.amount)
    if (!form.amount || isNaN(enteredAmount) || enteredAmount <= 0) {
      toast.error(t('submitClaim.amountError')); return
    }
    if (maxClaimAmount !== null && enteredAmount > maxClaimAmount) {
      toast.error(t('submitClaim.coverageExceeded', { amount: maxClaimAmount.toLocaleString() })); return
    }

    if (claimTemplate?.fields) {
      for (const field of claimTemplate.fields) {
        if (field.fieldType === 'LABEL') continue
        if (!field.required) continue
        const val = fieldValues[String(field.id)]
        const file = fieldFiles[String(field.id)]
        if ((field.fieldType === 'IMAGE_UPLOAD' || field.fieldType === 'PDF_UPLOAD') && !file) {
          toast.error(`"${field.fieldLabel}" is required`); return
        }
        if (field.fieldType !== 'IMAGE_UPLOAD' && field.fieldType !== 'PDF_UPLOAD') {
          if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
            toast.error(`"${field.fieldLabel}" is required`); return
          }
        }
      }
    }

    if (!signatureData) {
      toast.error(t('submitClaim.sigError'))
      return
    }

    setLoading(true)
    try {
      const formDataObj = {
        __name: user?.name || '',
        __email: user?.email || '',
        __signature: signatureData,
      }
      Object.entries(fieldValues).forEach(([k, v]) => {
        formDataObj[k] = Array.isArray(v) ? JSON.stringify(v) : v
      })

      const fd = new FormData()
      fd.append('applicationId', form.applicationId)
      fd.append('claimType', form.claimType || (claimTemplate ? 'General' : 'Other'))
      fd.append('amount', form.amount || '0')
      fd.append('description', form.description || '')
      fd.append('incidentDate', form.incidentDate || new Date().toISOString().split('T')[0])
      fd.append('formData', JSON.stringify(formDataObj))

      Object.entries(fieldFiles).forEach(([fieldId, file]) => {
        if (file) fd.append(`file_${fieldId}`, file)
      })

      await api.post('/customer/claims', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(t('submitClaim.submitSuccess'))
      navigate('/customer/claims')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit claim')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in">
      <div className="mb-4">
        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('submitClaim.title')}</h4>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>{t('submitClaim.subtitle')}</p>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="card-custom">
            <form onSubmit={handleSubmit}>

              {/* Policy selection */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  <i className="bi bi-shield-check me-1"></i>{t('submitClaim.selectPolicyLabel')}
                </div>
                <select name="applicationId" required className="form-select-custom w-100" value={form.applicationId} onChange={handleChange}>
                  <option value="">{t('submitClaim.choosePolicy')}</option>
                  {availablePolicies.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.packageName || p.package?.name} — {Number(p.coverageAmount).toLocaleString()} MMK
                    </option>
                  ))}
                </select>
                {activePolicies.length === 0 && (
                  <small style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{t('submitClaim.noPolicies')}</small>
                )}
                {activePolicies.length > 0 && availablePolicies.length === 0 && pendingPaymentPolicies.length === 0 && (
                  <small style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{t('submitClaim.allClaimed')}</small>
                )}
                {pendingPaymentPolicies.length > 0 && availablePolicies.length === 0 && (
                  <div style={{ marginTop: 8, padding: '0.7rem 0.9rem', borderRadius: 8, background: '#fef3c7', border: '1px solid #fcd34d', fontSize: '0.83rem', color: '#92400e' }}>
                    <i className="bi bi-credit-card me-2"></i>
                    <strong>{t('submitClaim.paymentRequiredTitle')}</strong><br />
                    <span>{t('submitClaim.paymentRequiredDesc')}</span>
                  </div>
                )}
              </div>

              {/* Agent card */}
              {form.applicationId && (() => {
                const sel = activePolicies.find(p => String(p.id) === String(form.applicationId))
                return sel?.packageType ? (
                  <AgentProfileCard packageType={sel.packageType} style={{ marginBottom: '1rem' }} />
                ) : null
              })()}

              {/* Claim Amount */}
              {form.applicationId && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    <i className="bi bi-currency-exchange me-1"></i>{t('submitClaim.claimAmountLabel')}
                  </div>
                  {maxClaimAmount !== null && (
                    <div className="info-box-blue-sm mb-3">
                      <i className="bi bi-info-circle me-1"></i>
                      {t('submitClaim.maxAmountNote')}: <strong>{maxClaimAmount.toLocaleString()} MMK</strong>
                    </div>
                  )}
                  <input
                    name="amount"
                    type="number"
                    required
                    min={1}
                    max={maxClaimAmount !== null ? maxClaimAmount : undefined}
                    step="1"
                    className="form-control-custom w-100"
                    placeholder={t('submitClaim.amountPlaceholder')}
                    value={form.amount}
                    onChange={e => {
                      handleChange(e)
                      const v = parseFloat(e.target.value)
                      if (maxClaimAmount !== null && !isNaN(v) && v > maxClaimAmount) {
                        e.target.setCustomValidity(t('submitClaim.maxLabel', { amount: maxClaimAmount.toLocaleString() }))
                      } else {
                        e.target.setCustomValidity('')
                      }
                    }}
                  />
                  {form.amount && maxClaimAmount !== null && parseFloat(form.amount) > 0 && parseFloat(form.amount) <= maxClaimAmount && (
                    <small style={{ color: '#16a34a', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                      ✓ {parseFloat(form.amount).toLocaleString()} MMK &nbsp;/&nbsp; {maxClaimAmount.toLocaleString()} MMK
                    </small>
                  )}
                  {form.amount && maxClaimAmount !== null && parseFloat(form.amount) > maxClaimAmount && (
                    <small style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                      ✗ {t('submitClaim.coverageExceeded', { amount: maxClaimAmount.toLocaleString() })}
                    </small>
                  )}
                </div>
              )}

              {/* Template loading */}
              {templateLoading && (
                <div className="text-center py-3">
                  <span className="spinner-border spinner-border-sm me-2" style={{ color: 'var(--primary)' }}></span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('submitClaim.loadingForm')}</span>
                </div>
              )}

              {/* Dynamic claim form fields */}
              {!templateLoading && form.applicationId && claimTemplate && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                    <i className="bi bi-ui-checks me-1"></i>{claimTemplate.name}
                  </div>
                  <DynamicFormFields
                    fields={claimTemplate.fields}
                    fieldValues={fieldValues}
                    fieldFiles={fieldFiles}
                    onValue={handleFieldValue}
                    onFile={handleFieldFile}
                    onCheckboxOption={handleCheckboxOption}
                    user={user}
                    autoFilledLabel={t('submitClaim.autoFilled')}
                  />
                </div>
              )}

              {/* No template fallback */}
              {!templateLoading && form.applicationId && !claimTemplate && (
                <>
                  <div style={{ padding: '0.75rem 1rem', borderRadius: 8, background: '#fef3c7', border: '1px solid #fcd34d', marginBottom: '1rem', fontSize: '0.85rem', color: '#92400e' }}>
                    <i className="bi bi-info-circle me-2"></i>
                    {t('submitClaim.noFormNote')}
                  </div>
                  <div className="row g-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label-custom">{t('submitClaim.claimType')}</label>
                      <select name="claimType" required className="form-select-custom w-100" value={form.claimType} onChange={handleChange}>
                        <option value="">{t('submitClaim.selectType')}</option>
                        {CLAIM_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label-custom">{t('submitClaim.incidentDate')}</label>
                      <input name="incidentDate" type="date" required className="form-control-custom w-100"
                        max={new Date().toISOString().split('T')[0]} value={form.incidentDate} onChange={handleChange} />
                    </div>
                    <div className="col-12">
                      <label className="form-label-custom">{t('submitClaim.description')}</label>
                      <textarea name="description" required rows={4} className="form-control-custom w-100"
                        placeholder={t('submitClaim.descPlaceholder')} value={form.description} onChange={handleChange} style={{ resize: 'vertical' }} />
                    </div>
                  </div>
                </>
              )}

              {/* Digital Signature */}
              {form.applicationId && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.75rem' }}>
                  <div style={{ padding: '0.6rem 0.9rem', borderRadius: 8, background: '#fef3c7', border: '1px solid #fcd34d', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#92400e' }}>
                    <i className="bi bi-pen me-2"></i>
                    <strong>Digital Signature</strong> — {t('submitClaim.sigRequired').replace('Digital Signature — ', '')}
                  </div>
                  <DigitalSignatureCanvas
                    ref={signatureRef}
                    label={t('submitClaim.sigLabel')}
                    required
                    onChange={data => setSignatureData(data)}
                    height={160}
                  />
                </div>
              )}

              {form.applicationId && (
                <button type="submit" disabled={loading || templateLoading} className="btn-primary-custom mt-4 w-100" style={{ justifyContent: 'center' }}>
                  {loading
                    ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('submitClaim.submitting')}</>
                    : <><i className="bi bi-send me-2"></i>{t('submitClaim.submitBtn')}</>}
                </button>
              )}
            </form>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card-custom">
            <h6 style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>📋 {t('submitClaim.processTitle')}</h6>
            {[
              t('submitClaim.step1'),
              t('submitClaim.step2'),
              t('submitClaim.step3'),
              t('submitClaim.step4'),
              t('submitClaim.step5'),
            ].map((s, i) => (
              <div key={i} className="d-flex align-items-start gap-2 mb-2">
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

