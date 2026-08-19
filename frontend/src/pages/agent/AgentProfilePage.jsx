import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'
import ProfileAvatar from '../../components/ProfileAvatar'

const Field = ({ icon, label, value }) => <div className="profile-detail-item"><div className="profile-detail-icon"><i className={`bi ${icon}`}/></div><div><span>{label}</span><strong>{value || '—'}</strong></div></div>

export default function AgentProfilePage() {
  const { user, setUser } = useAuth(); const { t } = useTranslation(); const [photoKey, setPhotoKey] = useState(0)
  return <div className="profile-page-modern fade-in">
    <div className="page-heading-modern"><div><span>ACCOUNT</span><h2>{t('agent.profile.title')}</h2><p>{t('agent.profile.subtitle')}</p></div></div>
    <section className="profile-hero-card">
      <div className="profile-cover-pattern" />
      <div className="profile-identity-row">
        <div className="profile-avatar-ring">
          <ProfileAvatar key={photoKey} fetchUrl="/auth/profile/picture" uploadUrl="/auth/profile/picture" hasPicture={user?.hasProfilePicture} name={user?.name} size={112} editable onUploaded={data => { setUser(data); setPhotoKey(k=>k+1) }} />
        </div>
        <div className="profile-identity-copy"><span className="profile-role-pill">Insurance Agent</span><h3>{user?.name}</h3><p>{user?.email}</p><small><i className="bi bi-camera me-1"/>You can update your profile photo. Other agent details are managed by an administrator.</small></div>
      </div>
    </section>
    <div className="profile-modern-grid">
      <section className="profile-panel-modern"><div className="profile-panel-title"><div><span>PROFILE DETAILS</span><h5>Personal & work information</h5></div><i className="bi bi-person-vcard"/></div><div className="profile-detail-grid">
        <Field icon="bi-person" label={t('agent.profile.nameLabel')} value={user?.name}/><Field icon="bi-envelope" label={t('agent.profile.emailLabel')} value={user?.email}/><Field icon="bi-telephone" label={t('agent.profile.phoneLabel')} value={user?.phone}/><Field icon="bi-shield" label={t('agent.profile.insuranceTypeLabel')} value={user?.insuranceType}/><Field icon="bi-geo-alt" label={t('agent.profile.addressLabel')} value={user?.address}/><Field icon="bi-activity" label={t('agent.profile.statusLabel')} value={user?.active ? t('agent.profile.statusActive') : t('agent.profile.statusInactive')}/>
      </div></section>
      <aside className="profile-side-modern"><div className="profile-status-card"><i className="bi bi-patch-check-fill"/><div><span>ACCOUNT STATUS</span><strong>{user?.active ? 'Active account' : 'Inactive account'}</strong><p>Your profile photo is visible in your workspace and account menu.</p></div></div><div className="profile-status-card"><i className="bi bi-calendar3"/><div><span>MEMBER SINCE</span><strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</strong><p>DICP Insurance Agent Network</p></div></div></aside>
    </div>
  </div>
}
