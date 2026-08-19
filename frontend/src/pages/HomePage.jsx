import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../services/api'
import { getTypeMeta } from '../utils/typeMeta'

const TYPE_KEYS = {
  LIFE: 'life', HEALTH: 'health', TRAVEL: 'travel', MOTOR: 'motor', VEHICLE: 'vehicle',
  EDUCATION: 'education', PROPERTY: 'property', FIRE: 'fire', MARINE: 'marine',
  ACCIDENT: 'accident', BUSINESS: 'business', CROP: 'crop'
}

function AiText({ text }) {
  return String(text || '').split('\n').map((line, lineIndex) => <div key={lineIndex} className={line ? '' : 'home-ai-blank-line'}>
    {line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
    )}
  </div>)
}

function AiAssistant() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('dicpAiChat') || '[]')
      return Array.isArray(saved) ? saved.slice(-30) : []
    } catch { return [] }
  })
  const end = useRef()

  useEffect(() => {
    if (!messages.length) setMessages([{ from: 'ai', text: t('homeRedesign.aiWelcome') }])
  }, [messages.length, t])
  useEffect(() => {
    try { localStorage.setItem('dicpAiChat', JSON.stringify(messages.slice(-30))) } catch {}
    if (open) end.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const clearChat = () => {
    const fresh = [{ from: 'ai', text: t('homeRedesign.aiWelcome') }]
    setMessages(fresh)
    try { localStorage.setItem('dicpAiChat', JSON.stringify(fresh)) } catch {}
  }

  const send = async (preset) => {
    const text = String(preset || input).trim()
    if (!text || loading) return
    setInput('')
    const previous = messages
    setMessages(m => [...m, { from: 'user', text }])
    setLoading(true)
    try {
      const history = previous.slice(-20).map(m => ({ role: m.from === 'ai' ? 'assistant' : 'user', content: m.text }))
      const { data } = await api.post('/ai/chat', {
        message: text,
        language: i18n.language,
        currentPath: location.pathname,
        history
      }, { timeout: 30000 })
      setMessages(m => [...m, { from: 'ai', text: data.reply, source: data.source }])
    } catch (e) {
      const detail = e?.response?.data?.reply || t('homeRedesign.aiError')
      setMessages(m => [...m, { from: 'ai', text: detail, source: 'error' }])
    } finally { setLoading(false) }
  }

  const prompts = [1,2,3].map(n => t(`homeRedesign.aiPrompt${n}`))

  return <>
    <button className="home-ai-button" onClick={() => setOpen(v => !v)} aria-label={t('homeRedesign.aiAssistant')}>
      <span className="home-ai-pulse" />
      <i className={`bi ${open ? 'bi-x-lg' : 'bi-chat-heart-fill'}`} />
      <span>{t('homeRedesign.aiAssistant')}</span>
    </button>
    {open && <div className="home-ai-panel" role="dialog" aria-label={t('homeRedesign.aiAssistant')}>
      <div className="home-ai-head">
        <div className="home-ai-icon"><i className="bi bi-shield-heart" /></div>
        <div><strong>{t('homeRedesign.aiName')}</strong><span>{t('homeRedesign.aiSupport')}</span></div>
        <div className="home-ai-head-actions">
          <button onClick={clearChat} aria-label="Clear conversation" title="Clear conversation"><i className="bi bi-trash3" /></button>
          <button onClick={() => setOpen(false)} aria-label={t('homeRedesign.close')}><i className="bi bi-x-lg" /></button>
        </div>
      </div>
      <div className="home-ai-scope"><i className="bi bi-stars" /> Ask detailed insurance, policy, claim, website, or general questions. Follow-up questions remember the conversation.</div>
      <div className="home-ai-messages">
        {messages.map((m, i) => <div key={i} className={`home-ai-message ${m.from}`}><AiText text={m.text} /></div>)}
        {messages.length <= 1 && <div className="home-ai-prompts">{prompts.map((p,i) => <button key={i} onClick={() => send(p)}>{p}</button>)}</div>}
        {loading && <div className="home-ai-message ai home-ai-thinking"><span/><span/><span/></div>}
        <div ref={end} />
      </div>
      <div className="home-ai-input">
        <textarea rows="2" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder={t('homeRedesign.aiPlaceholder')} />
        <button onClick={() => send()} disabled={loading || !input.trim()} aria-label={t('homeRedesign.aiSend')}><i className="bi bi-arrow-up" /></button>
      </div>
      <div className="home-ai-hint">Enter to send · Shift+Enter for a new line</div>
    </div>}
  </>
}

function NeedsCheck() {
  const { t } = useTranslation()
  const [selected, setSelected] = useState([])
  const choices = [
    ['family','bi-people'], ['health','bi-heart-pulse'], ['car','bi-car-front'],
    ['home','bi-house-heart'], ['travel','bi-airplane'], ['business','bi-shop']
  ]
  const toggle = key => setSelected(s => s.includes(key) ? s.filter(x => x !== key) : [...s, key])
  const suggested = useMemo(() => selected.map(x => t(`homeRedesign.needResult.${x}`)), [selected, t])
  return <div className="home-needs-card">
    <div className="home-needs-copy">
      <span className="home-eyebrow">{t('homeRedesign.needsLabel')}</span>
      <h2>{t('homeRedesign.needsTitle')}</h2>
      <p>{t('homeRedesign.needsDescription')}</p>
      <div className="home-needs-options">
        {choices.map(([key, icon]) => <button key={key} className={selected.includes(key) ? 'active' : ''} onClick={() => toggle(key)}>
          <i className={`bi ${icon}`} /><span>{t(`homeRedesign.need.${key}`)}</span><i className={`bi ${selected.includes(key) ? 'bi-check-circle-fill' : 'bi-plus-circle'}`} />
        </button>)}
      </div>
    </div>
    <div className="home-needs-result">
      <div className="home-needs-result-icon"><i className="bi bi-compass" /></div>
      <span>{t('homeRedesign.yourStartingPoint')}</span>
      <h3>{selected.length ? t('homeRedesign.needsResultTitle') : t('homeRedesign.needsEmptyTitle')}</h3>
      <p>{selected.length ? t('homeRedesign.needsResultDesc') : t('homeRedesign.needsEmptyDesc')}</p>
      {selected.length > 0 && <ul>{suggested.map((s,i) => <li key={i}><i className="bi bi-check2" /> {s}</li>)}</ul>}
      <Link to="/plans" className="home-primary-btn">{t('homeRedesign.seeMatchingPlans')} <i className="bi bi-arrow-right" /></Link>
      <small>{t('homeRedesign.needsDisclaimer')}</small>
    </div>
  </div>
}

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const [types, setTypes] = useState(() => {
    try {
      const c = JSON.parse(sessionStorage.getItem('publicInsuranceTypes') || 'null')
      return Array.isArray(c?.data) ? c.data : []
    } catch { return [] }
  })
  useEffect(() => {
    api.get('/insurance-types/public')
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : []
        setTypes(data)
        try { sessionStorage.setItem('publicInsuranceTypes', JSON.stringify({ at: Date.now(), data })) } catch {}
      })
      .catch(() => {})
  }, [])
  const shown = types.slice(0, 6)
  const typeName = type => {
    const code = String(type?.code || type?.type || type?.name || '').toUpperCase()
    const key = TYPE_KEYS[code]
    return key ? t(`homeRedesign.typeNames.${key}`) : type?.name
  }
  const fallbackTypes = [
    ['LIFE', 'bi-heart-pulse'], ['HEALTH', 'bi-hospital'], ['VEHICLE', 'bi-car-front'],
    ['PROPERTY', 'bi-house-check'], ['TRAVEL', 'bi-airplane'], ['ACCIDENT', 'bi-bandaid']
  ]
  const processSteps = [1,2,3,4].map(n => ({ no:`0${n}`, title:t(`homeRedesign.step${n}Title`), desc:t(`homeRedesign.step${n}Desc`) }))

  return <div className="public-redesign"><Navbar />
    <main>
      <section className="home-hero-human">
        <div className="container home-hero-human-grid">
          <div className="home-hero-copy">
            <div className="home-trust-label"><i className="bi bi-shield-check" /> {t('homeRedesign.trustLabel')}</div>
            <h1>{t('homeRedesign.heroTitle')} <span>{t('homeRedesign.heroHighlight')}</span></h1>
            <p className="home-hero-lead">{t('homeRedesign.heroDescription')}</p>
            <div className="home-hero-actions">
              <Link to="/plans" className="home-primary-btn">{t('homeRedesign.explorePlans')} <i className="bi bi-arrow-right" /></Link>
              <button className="home-secondary-btn" onClick={() => document.querySelector('.home-ai-button')?.click()}><i className="bi bi-chat-heart" /> {t('homeRedesign.askAi')}</button>
            </div>
            <div className="home-human-proof">
              <div className="home-proof-avatars"><span>U</span><span>A</span><span>D</span></div>
              <div><strong>{t('homeRedesign.humanSupport')}</strong><span>{t('homeRedesign.humanSupportDesc')}</span></div>
            </div>
          </div>
          <div className="home-life-visual">
            <div className="home-life-card main">
              <div className="home-life-photo home-family-scene">
                <div className="home-scene-sun"/><div className="home-scene-house"><i className="bi bi-house-heart-fill" /></div>
                <div className="home-scene-people"><i className="bi bi-people-fill" /></div>
              </div>
              <div className="home-life-card-copy"><span>{t('homeRedesign.protectWhatMatters')}</span><strong>{t('homeRedesign.lifeCardTitle')}</strong><p>{t('homeRedesign.lifeCardDesc')}</p></div>
            </div>
            <div className="home-life-chip chip-one"><i className="bi bi-heart-pulse-fill" /><span>{t('homeRedesign.healthReady')}</span></div>
            <div className="home-life-chip chip-two"><i className="bi bi-check-circle-fill" /><span>{t('homeRedesign.simpleClaim')}</span></div>
            {/* <div className="home-life-chip chip-three"><i className="bi bi-lock-fill" /><span>{t('homeRedesign.secureRecords')}</span></div> */}
          </div>
        </div>
      </section>

      <section className="home-quick-strip"><div className="container home-quick-grid">
        {[['bi-search-heart','quick1Title','quick1Desc'],['bi-calculator','quick2Title','quick2Desc'],['bi-person-check','quick3Title','quick3Desc'],['bi-chat-dots','quick4Title','quick4Desc']].map(([icon,title,desc],i)=><div key={i}><i className={`bi ${icon}`}/><div><strong>{t(`homeRedesign.${title}`)}</strong><span>{t(`homeRedesign.${desc}`)}</span></div></div>)}
      </div></section>

      <section className="home-section home-needs-section"><div className="container"><NeedsCheck /></div></section>

      <section className="home-section"><div className="container">
        <div className="home-section-head"><div><span>{t('homeRedesign.protectionLabel')}</span><h2>{t('homeRedesign.chooseConfidence')}</h2></div><p>{t('homeRedesign.chooseDescription')}</p></div>
        <div className="home-products-grid home-products-six">
          {(shown.length ? shown : fallbackTypes.map(([code]) => ({ code, name: code }))).map((type, i) => {
            const meta = getTypeMeta(type.code || type.type || type.name)
            const fallbackIcon = fallbackTypes.find(x => x[0] === String(type.code || '').toUpperCase())?.[1]
            return <Link to="/plans" className="home-product-card" key={type.id || i}>
              <div className="home-product-icon"><i className={`bi ${meta?.icon || fallbackIcon || 'bi-shield-check'}`} /></div>
              <div><span>{t('homeRedesign.insurance')}</span><h4>{typeName(type)}</h4><p>{i18n.language === 'my' ? t('homeRedesign.flexibleProtection') : (type.description || t('homeRedesign.flexibleProtection'))}</p></div>
              <i className="bi bi-arrow-up-right" />
            </Link>
          })}
        </div>
      </div></section>

      <section className="home-process-section"><div className="container"><div className="home-process-card">
        <div className="home-process-intro"><span>{t('homeRedesign.simpleJourney')}</span><h2>{t('homeRedesign.journeyTitle')}</h2><p>{t('homeRedesign.journeyDescription')}</p><Link to="/register" className="home-primary-btn">{t('homeRedesign.createAccount')} <i className="bi bi-arrow-right" /></Link></div>
        <div className="home-process-steps">{processSteps.map(x => <div className="home-process-step" key={x.no}><span>{x.no}</span><div><strong>{x.title}</strong><p>{x.desc}</p></div></div>)}</div>
      </div></div></section>

      <section className="home-ai-feature"><div className="container home-ai-feature-card">
        <div className="home-ai-feature-icon"><i className="bi bi-chat-heart-fill"/></div>
        <div><span>{t('homeRedesign.aiFeatureLabel')}</span><h2>{t('homeRedesign.aiFeatureTitle')}</h2><p>{t('homeRedesign.aiFeatureDesc')}</p></div>
        <button className="home-primary-btn" onClick={() => document.querySelector('.home-ai-button')?.click()}>{t('homeRedesign.startChat')} <i className="bi bi-arrow-up-right"/></button>
      </div></section>

      <section className="home-cta"><div className="container"><div className="home-cta-card"><div><span>{t('homeRedesign.readyLabel')}</span><h2>{t('homeRedesign.ctaTitle')}</h2><p>{t('homeRedesign.ctaDescription')}</p></div><div className="d-flex gap-2 flex-wrap"><Link to="/plans" className="home-primary-btn light">{t('homeRedesign.viewPlans')}</Link><Link to="/register" className="home-secondary-btn light">{t('homeRedesign.createAccountShort')}</Link></div></div></div></section>
    </main>
    <Footer /><AiAssistant />
  </div>
}
