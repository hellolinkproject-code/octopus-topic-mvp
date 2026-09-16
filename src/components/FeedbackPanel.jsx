import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Button, Card } from './ui'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../i18n/LanguageContext'
import { FEEDBACK_COST } from '../lib/writingTask'

export default function FeedbackPanel({ answer }) {
  const { points, requestFeedback, refreshState } = useApp()
  const { t, path } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const result = answer.aiFeedback
  async function submit() {
    if (inFlight.current || !consent || points < FEEDBACK_COST) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      await requestFeedback(answer.id)
    } catch (err) {
      setError(err.name === 'ApiError' ? err.message : t('feedback.networkError'))
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }
  async function refresh() {
    setRefreshing(true)
    try {
      await refreshState()
      setError('')
    } catch {
      setError(t('feedback.networkError'))
    } finally {
      setRefreshing(false)
    }
  }
  return (
    <Card className="ai-feedback" aria-labelledby="feedback-title">
      <div className="feedback-heading">
        <span>
          <Sparkles size={18} /> AI · TOPIK 54
        </span>
        <h2 id="feedback-title">{t('feedback.title')}</h2>
        <p>{t('feedback.disclaimer')}</p>
      </div>
      {result ? (
        <div className="feedback-result" aria-live="polite" lang="ko">
          <p className="feedback-receipt">
            {t('feedback.saved')} · {result.cost}P
          </p>
          <h3>{t('feedback.summary')}</h3>
          <p>{result.summary}</p>
          <div className="feedback-columns">
            <div>
              <h3>{t('feedback.strengths')}</h3>
              <ul>
                {result.strengths.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>{t('feedback.improvements')}</h3>
              <ul>
                {result.improvements.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            </div>
          </div>
          <h3>{t('feedback.corrections')}</h3>
          {result.corrections.length ? (
            result.corrections.map((item, i) => (
              <div className="sentence-correction" key={i}>
                <h4>{t('feedback.original')}</h4>
                <blockquote>{item.original}</blockquote>
                <h4>{t('feedback.revised')}</h4>
                <p className="revised-sentence">{item.revised}</p>
                <h4>{t('feedback.reason')}</h4>
                <p>{item.reason}</p>
              </div>
            ))
          ) : (
            <p>{t('feedback.noCorrections')}</p>
          )}
          <h3>{t('feedback.nextSteps')}</h3>
          <ol>
            {result.nextSteps.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="feedback-request">
          <p>{t('feedback.intro')}</p>
          <div className="feedback-balance">
            <strong>{FEEDBACK_COST}P</strong>
            <span>
              {t('feedback.balance')} {points}P
            </span>
          </div>
          <p className="feedback-note">{t('feedback.policy')}</p>
          {points < FEEDBACK_COST ? (
            <p className="feedback-warning">
              {t('feedback.insufficient')} <Link to={path('/dashboard')}>{t('feedback.earn')}</Link>
            </p>
          ) : null}
          <label className="feedback-consent">
            <input
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>{t('feedback.consent')}</span>
          </label>
          <div className="feedback-buttons">
            <Button
              loading={busy}
              disabled={busy || !consent || points < FEEDBACK_COST}
              onClick={() => void submit()}
            >
              {busy ? t('feedback.loading') : t('feedback.request')}
            </Button>
            <Button
              variant="outline"
              loading={refreshing}
              disabled={busy || refreshing}
              onClick={() => void refresh()}
            >
              {t('feedback.refresh')}
            </Button>
          </div>
          <p role="status">{busy ? t('feedback.wait') : ''}</p>
          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </Card>
  )
}
