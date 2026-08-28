import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { languageOptions, supportedLanguages, translations } from './translations'

const LanguageContext = createContext(null)
const localeMap = Object.fromEntries(languageOptions.map((item) => [item.code, item.locale]))
const getValue = (source, key) => key.split('.').reduce((value, part) => value?.[part], source)
export function getLanguageFromPath(pathname) {
  const first = pathname.split('/').filter(Boolean)[0]
  return supportedLanguages.includes(first) ? first : null
}

export function LanguageProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const language = getLanguageFromPath(location.pathname) || 'ko'
  const t = useCallback(
    (key) => getValue(translations[language], key) ?? getValue(translations.ko, key) ?? key,
    [language],
  )
  const path = useCallback((value) => `/${language}${value === '/' ? '/' : value}`, [language])
  const changeLanguage = useCallback(
    (next) => {
      if (!supportedLanguages.includes(next)) return
      const parts = location.pathname.split('/').filter(Boolean)
      if (supportedLanguages.includes(parts[0])) parts.shift()
      const rest = `/${parts.join('/')}`
      try {
        localStorage.setItem('octopus-topic-language', next)
      } catch {}
      navigate(`/${next}${rest === '/' ? '/' : rest}${location.search}${location.hash}`)
    },
    [location, navigate],
  )
  useEffect(() => {
    const canonicalPath = `/${language}/`
    const isLanding = location.pathname === canonicalPath || location.pathname === `/${language}`
    const origin = 'https://octopus-topic-mvp.vercel.app'
    document.documentElement.lang = localeMap[language]
    document.title = t('meta.title')
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('meta.description'))
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }
    canonical.href = `${origin}${canonicalPath}`
    let robots = document.querySelector('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.append(robots)
    }
    robots.content = isLanding ? 'index,follow' : 'noindex,follow'
  }, [language, location.pathname, t])
  const value = useMemo(
    () => ({
      language,
      locale: localeMap[language],
      options: languageOptions,
      t,
      path,
      changeLanguage,
    }),
    [language, t, path, changeLanguage],
  )
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider')
  return value
}
