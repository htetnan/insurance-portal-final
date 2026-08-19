import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const steps = [
  { num: 1, icon: 'bi-person-plus', titleKey: 'step1Title', descKey: 'step1Desc' },
  { num: 2, icon: 'bi-search', titleKey: 'step2Title', descKey: 'step2Desc' },
  { num: 3, icon: 'bi-file-earmark-text', titleKey: 'step3Title', descKey: 'step3Desc' },
  { num: 4, icon: 'bi-person-badge', titleKey: 'step4Title', descKey: 'step4Desc' },
  { num: 5, icon: 'bi-clipboard-check', titleKey: 'step5Title', descKey: 'step5Desc' },
  { num: 6, icon: 'bi-credit-card', titleKey: 'step6Title', descKey: 'step6Desc' },
  { num: 7, icon: 'bi-file-earmark-pdf', titleKey: 'step7Title', descKey: 'step7Desc' },
  { num: 8, icon: 'bi-shield-check', titleKey: 'step8Title', descKey: 'step8Desc' },
]

const claimSteps = [
  { icon: 'bi-exclamation-triangle', titleKey: 'claim1Title', descKey: 'claim1Desc' },
  { icon: 'bi-file-earmark-plus', titleKey: 'claim2Title', descKey: 'claim2Desc' },
  { icon: 'bi-person-badge', titleKey: 'claim3Title', descKey: 'claim3Desc' },
  { icon: 'bi-check2-all', titleKey: 'claim4Title', descKey: 'claim4Desc' },
  { icon: 'bi-cash-coin', titleKey: 'claim5Title', descKey: 'claim5Desc' },
]

export default function HowItWorksPage() {
  const { t } = useTranslation()

  return (
    <div>
      <Navbar />

      <section style={{ background: 'var(--bg)', padding: '3.5rem 0 2rem', borderBottom: '1px solid var(--border)' }}>
        <div className="container text-center">
          <h1 className="section-title">{t('how.title')}</h1>
          <p className="section-subtitle mx-auto">{t('how.subtitle')}</p>
        </div>
      </section>

      {/* Getting Started */}
      <section style={{ background: 'var(--bg-secondary)', padding: '4rem 0' }}>
        <div className="container">
          <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2rem', fontSize: '1.5rem' }}>
            {t('how.gettingStarted')}
          </h2>
          <div className="row g-4">
            {steps.map((step, idx) => (
              <div key={step.num} className="col-12 col-md-6 col-lg-3">
                <div className="card-custom h-100">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="step-number">{step.num}</div>
                    <i className={`bi ${step.icon}`} style={{ fontSize: '1.3rem', color: 'var(--accent)' }}></i>
                  </div>
                  <h6 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>{t(`how.${step.titleKey}`)}</h6>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{t(`how.${step.descKey}`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Claims Process */}
      <section style={{ background: 'var(--bg)', padding: '4rem 0' }}>
        <div className="container">
          <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
            {t('how.claimsProcess')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{t('how.claimsSubtitle')}</p>
          <div className="row g-4 align-items-start">
            {claimSteps.map((step, idx) => (
              <div key={step.titleKey} className="col-12 col-sm-6 col-lg">
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'var(--bg-secondary)', border: '2px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem', fontSize: '1.5rem', color: 'var(--primary)'
                  }}>
                    <i className={`bi ${step.icon}`}></i>
                  </div>
                  <h6 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{t(`how.${step.titleKey}`)}</h6>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>{t(`how.${step.descKey}`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section style={{ background: 'var(--bg-secondary)', padding: '4rem 0' }}>
        <div className="container">
          <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2rem', fontSize: '1.5rem' }}>
            {t('how.rolesTitle')}
          </h2>
          <div className="row g-4">
            {[
              { icon: 'bi-person', color: '#1d4ed8', bg: '#eff6ff', titleKey: 'customerTitle', descKey: 'customerDesc' },
              { icon: 'bi-person-badge', color: '#16a34a', bg: '#f0fdf4', titleKey: 'agentTitle', descKey: 'agentDesc' },
              { icon: 'bi-shield-lock', color: '#9333ea', bg: '#faf5ff', titleKey: 'adminTitle', descKey: 'adminDesc' },
            ].map(role => (
              <div key={role.titleKey} className="col-12 col-md-4">
                <div className="card-custom h-100">
                  <div style={{
                    width: 52, height: 52, borderRadius: 12,
                    background: role.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1rem'
                  }}>
                    <i className={`bi ${role.icon}`} style={{ fontSize: '1.4rem', color: role.color }}></i>
                  </div>
                  <h5 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{t(`how.${role.titleKey}`)}</h5>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>{t(`how.${role.descKey}`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--primary)', padding: '4rem 0' }}>
        <div className="container text-center">
          <h2 style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem' }}>{t('how.ctaTitle')}</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem', maxWidth: 460, margin: '0 auto 2rem' }}>
            {t('how.ctaDesc')}
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link to="/register" style={{
              background: '#fff', color: 'var(--primary)', padding: '0.75rem 2rem',
              borderRadius: 8, fontWeight: 600, textDecoration: 'none'
            }}>{t('how.registerNow')}</Link>
            <Link to="/plans" style={{
              border: '2px solid rgba(255,255,255,0.5)', color: '#fff', padding: '0.75rem 2rem',
              borderRadius: 8, fontWeight: 600, textDecoration: 'none'
            }}>{t('how.viewPlans')}</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
