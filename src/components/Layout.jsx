import { BookOpenText, LogOut, Menu, Octagon, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Button } from './ui'
import { useLanguage } from '../i18n/LanguageContext'
export function Brand() {
  const { t, path } = useLanguage()
  return (
    <Link to={path('/')} className="brand" aria-label={t('layout.home')}>
      <img src="/assets/octopus-logo.svg" alt="Octopus TOPIK" />
    </Link>
  )
}
export default function Layout({ children, simple = false }) {
  const { user, points, logout } = useApp()
  const { language, options, t, path, changeLanguage } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate(path('/'))
  }
  const languageControl = (
    <label className="language-switcher">
      <span className="sr-only">{t('layout.language')}</span>
      <select
        value={language}
        onChange={(event) => changeLanguage(event.target.value)}
        aria-label={t('layout.language')}
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          {!simple && user ? (
            <>
              <button
                className="menu-toggle"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={t('layout.menu')}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X /> : <Menu />}
              </button>
              <nav className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label={t('layout.nav')}>
                <NavLink to={path('/dashboard')} onClick={() => setMenuOpen(false)}>
                  {t('layout.dashboard')}
                </NavLink>
                <NavLink to={path('/quiz/today')} onClick={() => setMenuOpen(false)}>
                  {t('layout.quiz')}
                </NavLink>
                <NavLink to={path('/writing')} onClick={() => setMenuOpen(false)}>
                  {t('layout.answers')}
                </NavLink>
                {languageControl}
                <div className="point-chip">
                  <Octagon size={15} />
                  {points.toLocaleString()} P
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut size={16} /> {t('layout.logout')}
                </Button>
              </nav>
            </>
          ) : (
            <div className="header-actions">
              {languageControl}
              <Link className="text-link" to={path('/login')}>
                {t('layout.login')}
              </Link>
              <Button size="sm" onClick={() => navigate(path('/login'))}>
                {t('layout.start')}
              </Button>
            </div>
          )}
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <Brand />
        <p>
          <BookOpenText size={16} /> {t('layout.footer')}
        </p>
        <span>© 2026 Octopus TOPIK</span>
      </footer>
    </div>
  )
}
