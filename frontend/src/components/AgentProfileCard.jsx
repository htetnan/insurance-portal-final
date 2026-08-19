import { useEffect, useState } from 'react'
import api from '../services/api'
import ProfileAvatar from './ProfileAvatar'

/**
 * Shows the active agent assigned to a given insurance package type.
 * Fetches from GET /customer/agent/by-type?packageType=X
 *
 * Props:
 *   packageType  {string}  e.g. "MOTOR", "LIFE"
 *   style        {object}  optional extra container styles
 */
export default function AgentProfileCard({ packageType, style }) {
  const [agent, setAgent]     = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!packageType) { setAgent(null); return }
    setLoading(true)
    api.get(`/customer/agent/by-type?packageType=${encodeURIComponent(packageType)}`)
      .then(res => setAgent(res.data))
      .catch(() => setAgent(null))
      .finally(() => setLoading(false))
  }, [packageType])

  if (!packageType) return null

  return (
    <div style={{
      padding: '0.875rem 1rem', borderRadius: 10,
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      ...style
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
        <i className="bi bi-person-badge me-1"></i>
        တာဝန်ခံ Agent · Assigned Agent
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <span className="spinner-border spinner-border-sm"></span>
          ဆွဲယူနေသည်… · Loading…
        </div>
      ) : !agent ? (
        <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
          <i className="bi bi-person-dash me-1"></i>
          ဤ အမျိုးအစားအတွက် Agent မသတ်မှတ်ရသေးပါ · No agent assigned for this type yet
        </div>
      ) : (
        <div className="d-flex align-items-center gap-3">
          <ProfileAvatar
            fetchUrl={agent.hasProfilePicture ? `/customer/agent/${agent.id}/picture` : null}
            hasPicture={agent.hasProfilePicture}
            name={agent.name}
            size={44}
          />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{agent.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
              <span className="type-badge-pill" style={{ fontSize: '0.72rem', padding: '0.1rem 0.5rem' }}>
                {agent.insuranceType}
              </span>
              {agent.phone && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <i className="bi bi-telephone me-1"></i>{agent.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
