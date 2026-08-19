import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { toast } from 'react-toastify'

const CATEGORIES = ['General', 'Claims', 'Payments', 'Policies', 'Applications', 'Support', 'Other']

export default function SendFeedbackPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ rating: 5, category: 'General', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const RATING_LABELS = ['', t('feedback.ratePoor'), t('feedback.rateFair'), t('feedback.rateGood'), t('feedback.rateVeryGood'), t('feedback.rateExcellent')]

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.message.trim()) { toast.error(t('feedback.validationError')); return }
    setSubmitting(true)
    try {
      await api.post('/customer/feedback', form)
      setSubmitted(true)
      toast.success(t('feedback.submitSuccess'))
    } catch (err) {
      toast.error(err.response?.data?.message || t('feedback.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleNew = () => {
    setForm({ rating: 5, category: 'General', message: '' })
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div className="fade-in" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card-custom text-center py-5">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <i className="bi bi-check-circle-fill" style={{ fontSize: '2rem', color: '#16a34a' }}></i>
          </div>
          <h5 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{t('feedback.successTitle')}</h5>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {t('feedback.successDesc')}
          </p>
          <button className="btn-primary-custom" onClick={handleNew}>
            <i className="bi bi-plus-circle me-2"></i>{t('feedback.sendAnother')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="mb-4">
        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('feedback.title')}</h4>
        <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
          {t('feedback.subtitle')}
        </p>
      </div>

      <div className="card-custom">
        <form onSubmit={handleSubmit}>

          {/* Rating */}
          <div className="mb-4">
            <label className="form-label-custom mb-2">{t('feedback.ratingLabel')}</label>
            <div className="d-flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, rating: star }))}
                  style={{
                    background: 'none', border: 'none', padding: '0.15rem 0.1rem',
                    fontSize: '2rem', cursor: 'pointer', lineHeight: 1,
                    color: star <= form.rating ? '#f59e0b' : 'var(--border)',
                    transition: 'color 0.15s'
                  }}
                  title={`${star} star${star > 1 ? 's' : ''}`}
                >
                  <i className={`bi bi-star${star <= form.rating ? '-fill' : ''}`}></i>
                </button>
              ))}
              <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.88rem', alignSelf: 'center' }}>
                {RATING_LABELS[form.rating]}
              </span>
            </div>
          </div>

          {/* Category */}
          <div className="mb-3">
            <label className="form-label-custom">{t('feedback.categoryLabel')}</label>
            <select
              className="form-select-custom w-100"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Message */}
          <div className="mb-4">
            <label className="form-label-custom">
              {t('feedback.messageLabel')}
              <span style={{ float: 'right', color: 'var(--text-muted)', fontWeight: 400 }}>
                {t('feedback.charCount', { count: form.message.length })}
              </span>
            </label>
            <textarea
              required
              rows={5}
              maxLength={1000}
              className="form-control-custom w-100"
              style={{ resize: 'vertical' }}
              placeholder={t('feedback.messagePlaceholder')}
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !form.message.trim()}
            className="btn-primary-custom w-100"
            style={{ justifyContent: 'center' }}
          >
            {submitting
              ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('feedback.submitting')}</>
              : <><i className="bi bi-send me-2"></i>{t('feedback.submitBtn')}</>}
          </button>
        </form>
      </div>
    </div>
  )
}
