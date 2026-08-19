import { useEffect, useState } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from './Navbar'
import ProfileAvatar from './ProfileAvatar'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function DashboardLayout({ title, links, badgeApi, externalBadge }) {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [badge, setBadge] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!badgeApi || externalBadge !== undefined) return
    const load = () => api.get(badgeApi.url).then(r => setBadge(r.data?.count ?? 0)).catch(() => {})
    load(); const id = setInterval(load, 30000); return () => clearInterval(id)
  }, [badgeApi, externalBadge])
  useEffect(() => { if (externalBadge !== undefined) setBadge(externalBadge) }, [externalBadge])
  useEffect(() => { document.body.style.overflow = drawerOpen ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [drawerOpen])

  const roleLabel = user?.role === 'ADMIN' ? t('workspace.roles.admin') : user?.role === 'AGENT' ? t('workspace.roles.agent') : t('workspace.roles.customer')
  const profilePath = user?.role === 'ADMIN' ? '/admin/profile' : user?.role === 'AGENT' ? '/agent/profile' : '/customer/profile'

  const handleLogout = () => {
    logout()
    setDrawerOpen(false)
    navigate('/')
  }

  const Links = ({ close }) => <div className="workspace-nav-list">
    {links.map(link => <NavLink key={link.to} to={link.to} onClick={() => { close?.(); if (link.badge) setBadge(0) }} className={({isActive}) => `workspace-nav-link ${isActive ? 'active' : ''}`}>
      <span className="workspace-nav-icon"><i className={`bi ${link.icon}`}></i></span>
      <span className="workspace-nav-text">{link.label}</span>
      {link.badge && badge > 0 && <span className="workspace-badge">{badge > 99 ? '99+' : badge}</span>}
    </NavLink>)}
  </div>

  const Sidebar = ({ mobile = false }) => <aside className={mobile ? 'workspace-mobile-panel' : 'workspace-sidebar'}>
    <div className="workspace-brand-panel">
      <img src="/dicp-logo.svg" alt="DICP" />
      <div><strong>{t('brand')}</strong><span>{title}</span></div>
      {mobile && <button className="workspace-close" onClick={() => setDrawerOpen(false)}><i className="bi bi-x-lg" /></button>}
    </div>
    <Link to={profilePath} className="workspace-user-card" onClick={() => setDrawerOpen(false)}>
      <ProfileAvatar fetchUrl="/auth/profile/picture" hasPicture={user?.hasProfilePicture} name={user?.name} size={48} />
      <div className="workspace-user-copy"><strong>{user?.name || 'User'}</strong><span>{roleLabel}</span></div>
      <i className="bi bi-chevron-right" />
    </Link>
    <div className="workspace-nav-heading">{t('workspace.heading')}</div>
    <Links close={mobile ? () => setDrawerOpen(false) : undefined} />
    <div className="workspace-sidebar-footer">
      <div className="workspace-security"><i className="bi bi-shield-check"/><div><strong>{t('workspace.secureTitle')}</strong><span>{t('workspace.secureSubtitle')}</span></div></div>
      <button type="button" className="workspace-logout-btn" onClick={handleLogout}>
        <span className="workspace-nav-icon"><i className="bi bi-box-arrow-right" /></span>
        <span>{t('nav.logout')}</span>
      </button>
    </div>
  </aside>

  return <div className="workspace-shell">
    <Navbar />
    <div className="workspace-frame">
      <div className="d-none d-lg-block"><Sidebar /></div>
      <div className={`workspace-mobile-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`workspace-mobile-drawer ${drawerOpen ? 'open' : ''}`}><Sidebar mobile /></div>
      <main className="workspace-main">
        <div className="workspace-topbar">
          <div className="workspace-topbar-title">
            <button className="workspace-menu-btn d-lg-none" onClick={() => setDrawerOpen(true)} aria-label="Open menu"><i className="bi bi-list" /></button>
            <strong>{title}</strong>
          </div>
        </div>
        <div className="workspace-content"><Outlet /></div>
      </main>
    </div>
  </div>
}
