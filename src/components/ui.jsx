import { forwardRef } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`button button-${variant} button-${size} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <LoaderCircle className="spin" size={18} /> : null}
      {children}
    </button>
  )
}
export function Card({ children, className = '', ...props }) {
  return (
    <section className={`card ${className}`} {...props}>
      {children}
    </section>
  )
}
export const Input = forwardRef(function Input({ label, error, hint, ...props }, ref) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input ref={ref} className={error ? 'has-error' : ''} {...props} />
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </label>
  )
})
export const Textarea = forwardRef(function Textarea({ label, error, ...props }, ref) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea ref={ref} className={error ? 'has-error' : ''} {...props} />
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
})
export function ProgressBar({ value, label }) {
  return (
    <div className="progress-wrap" aria-label={`${label} ${value}%`}>
      <div className="progress-meta">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
export function LoadingScreen() {
  const { t } = useLanguage()
  return (
    <main className="loading-screen">
      <img className="loading-logo" src="/assets/favicon.svg" alt="" />
      <LoaderCircle className="spin" />
      <p>{t('common.loading')}</p>
    </main>
  )
}
