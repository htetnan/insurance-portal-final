import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useNotifCount } from '../context/NotifCountContext'
import ProfileAvatar from './ProfileAvatar'

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { unreadCount } = useNotifCount()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'my' : 'en')
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const dashboardPath = user?.role === 'ADMIN' ? '/admin/dashboard'
    : user?.role === 'AGENT' ? '/agent/dashboard'
    : '/customer/dashboard'

  // Nav links ordered by role — Contact removed from all roles
  const navLinks = user?.role === 'CUSTOMER'
    ? [
        { to: '/plans', label: t('nav.plans') },
        { to: '/how-it-works', label: t('nav.howItWorks') },
        { to: '/customer/applications', label: t('nav.applications') },
        { to: '/customer/claims', label: t('nav.claims') },
      ]
    : [
        { to: '/plans', label: t('nav.plans') },
        { to: '/how-it-works', label: t('nav.howItWorks') },
      ]

  return (
    <nav className="navbar-custom">
      <div className="container">
        <div className="d-flex align-items-center justify-content-between w-100">

          {/* Brand */}
          <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none" style={{ flexShrink: 0 }}>
            <div className="navbar-logo-wrap">
              <img src="/dicp-logo.svg" alt="DICP Logo" className="navbar-logo-img" />
            </div>
            <span className="navbar-brand-text d-none d-sm-inline">
              {t('brand')}
            </span>
          </Link>

          {/* Center nav links – desktop */}
          <div className="d-none d-lg-flex align-items-center gap-1">
            {navLinks.map(link => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) =>
                `navbar-nav-link ${isActive ? 'active' : ''}`}>
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Right controls */}
          <div className="d-flex align-items-center gap-2">
            {/* Language toggle */}
            <button className="icon-btn" onClick={toggleLang} title="Switch Language">
              <span style={{ fontSize: '0.78rem', fontWeight: 600, lineHeight: 1 }}>
                {i18n.language === 'en' ? 'မြန်မာ' : 'EN'}
              </span>
            </button>

            {/* Theme toggle */}
            <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
              <i className={`bi bi-${theme === 'light' ? 'sun' : 'moon-stars'}`}></i>
            </button>

            {/* Notification bell — visible immediately for logged-in customers */}
            {user?.role === 'CUSTOMER' && (
              <Link
                to="/customer/notifications"
                className="icon-btn"
                title="Notifications"
                style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <i className="bi bi-bell" style={{ fontSize: '1.05rem' }}></i>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 0, right: 0,
                    transform: 'translate(35%, -35%)',
                    background: '#dc2626', color: '#fff',
                    borderRadius: '999px', fontSize: '0.6rem', fontWeight: 700,
                    minWidth: 15, height: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', lineHeight: 1, pointerEvents: 'none'
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Auth buttons or user menu */}
            {!user ? (
              <>
                <Link to="/login" className="btn-login d-none d-sm-inline">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="btn-register">
                  {t('nav.register')}
                </Link>
              </>
            ) : (
              <div className="dropdown">
                <button className="icon-btn d-flex align-items-center gap-1" data-bs-toggle="dropdown">
                  <ProfileAvatar
                    fetchUrl="/auth/profile/picture"
                    hasPicture={user.hasProfilePicture}
                    name={user.name}
                    size={32}
                  />
                </button>
                <ul className="dropdown-menu dropdown-menu-end" style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '10px', minWidth: '180px', boxShadow: 'var(--shadow-lg)'
                }}>
                  <li>
                    <span className="dropdown-item-text" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem 1rem' }}>
                      {user.name}
                      <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>{user.role}</div>
                    </span>
                  </li>
                  <li><hr className="dropdown-divider" style={{ borderColor: 'var(--border)' }} /></li>
                  <li>
                    <Link className="dropdown-item" to={dashboardPath} style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                      <i className="bi bi-speedometer2 me-2"></i>{t('nav.dashboard')}
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to={dashboardPath.replace('/dashboard', '/profile')} style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                      <i className="bi bi-person-circle me-2"></i>{t('workspace.myProfile')}
                    </Link>
                  </li>
                  {user.role === 'CUSTOMER' && (
                    <li>
                      <Link className="dropdown-item" to="/customer/notifications" style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                        <i className="bi bi-bell me-2"></i>{t('nav.notifications')}
                      </Link>
                    </li>
                  )}
                  <li><hr className="dropdown-divider" style={{ borderColor: 'var(--border)' }} /></li>
                  <li>
                    <button className="dropdown-item" onClick={handleLogout} style={{ color: '#dc2626', fontSize: '0.88rem' }}>
                      <i className="bi bi-box-arrow-right me-2"></i>{t('nav.logout')}
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {/* Mobile hamburger */}
            <button className="icon-btn d-lg-none" onClick={() => setMenuOpen(v => !v)}>
              <i className={`bi bi-${menuOpen ? 'x-lg' : 'list'}`}></i>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="d-lg-none mt-2 pb-2 border-top" style={{ borderColor: 'var(--border)' }}>
            <div className="d-flex flex-column gap-1 pt-2">
              {navLinks.map(link => (
                <NavLink key={link.to} to={link.to}
                  className={({ isActive }) => `navbar-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}>
                  {link.label}
                </NavLink>
              ))}
              {!user && (
                <div className="d-flex gap-2 mt-1">
                  <Link to="/login" className="btn-login" onClick={() => setMenuOpen(false)}>
                    {t('nav.login')}
                  </Link>
                  <Link to="/register" className="btn-register" onClick={() => setMenuOpen(false)}>
                    {t('nav.register')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
