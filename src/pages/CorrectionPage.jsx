import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { Button, Input, Textarea } from '../components/ui'
import { useLanguage } from '../i18n/LanguageContext'
import { correctionCopy } from '../i18n/correctionCopy'
import { CORRECTION_PRODUCTS, productName, priceLabel } from '../lib/correctionProducts'
import { correctionRequest, prepareFile } from '../lib/correctionApi'
export default function CorrectionPage() {
  const { language, path } = useLanguage(),
    c = correctionCopy(language)
  const [query] = useSearchParams(),
    navigate = useNavigate()
  const [productId, setProduct] = useState(() =>
    Object.hasOwn(CORRECTION_PRODUCTS, query.get('product'))
      ? query.get('product')
      : query.get('question') === '53'
        ? 'q53'
        : 'q54',
  )
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    currentLevel: 'first',
    targetLevel: '3',
    examDate: '',
    depositorName: '',
  })
  const [answers, setAnswers] = useState({
    53: { questionText: '', answerText: '', file: null },
    54: { questionText: '', answerText: '', file: null },
  })
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const attempt = useRef(null),
    submitting = useRef(false)
  const product = CORRECTION_PRODUCTS[productId]
  const setAnswer = (n, key, value) =>
    setAnswers((current) => ({ ...current, [n]: { ...current[n], [key]: value } }))
  async function submit(event) {
    event.preventDefault()
    if (submitting.current) return
    if (
      !consent ||
      product.questionNumbers.some((n) => !answers[n].answerText.trim() && !answers[n].file)
    ) {
      setError(c.requiredAnswer)
      return
    }
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const submissions = await Promise.all(
        product.questionNumbers.map(async (n) => ({
          questionNumber: n,
          questionText: answers[n].questionText,
          answerText: answers[n].answerText,
          attachments: answers[n].file ? [await prepareFile(answers[n].file)] : [],
        })),
      )
      const body = { productId, customer, submissions, consent }
      const signature = JSON.stringify(body)
      if (attempt.current?.signature !== signature)
        attempt.current = { signature, id: crypto.randomUUID() }
      const order = await correctionRequest('/api/corrections', {
        method: 'POST',
        body: { ...body, idempotencyKey: attempt.current.id },
      })
      navigate(path(`/correction/complete/${order.orderId}`))
    } catch (e) {
      setError(e.message)
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  return (
    <Layout>
      <main className="correction-page page-width">
        <header className="correction-heading">
          <span className="correction-kicker">TOPIK II 53·54 · TEACHER CORRECTION</span>
          <h1>{c.formTitle}</h1>
          <p>{c.noLogin}</p>
          <p>{c.slaDetail}</p>
        </header>
        <form onSubmit={submit} className="correction-form">
          <fieldset disabled={busy}>
            <legend>{c.product}</legend>
            <div className="correction-grid">
              {Object.values(CORRECTION_PRODUCTS).map((p) => (
                <label
                  key={p.id}
                  className={`product-option ${productId === p.id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="product"
                    value={p.id}
                    checked={p.id === productId}
                    onChange={() => setProduct(p.id)}
                  />
                  <span>
                    {productName(p, language)}
                    <strong>{priceLabel(p.price)}</strong>
                    {p.id === 'q54' ? <small>{c.recommended}</small> : null}
                  </span>
                </label>
              ))}
            </div>
            <p>{c.paid}</p>
          </fieldset>
          <fieldset disabled={busy}>
            <legend>{c.customer}</legend>
            <div className="correction-grid two">
              {['name', 'email', 'depositorName'].map((key) => (
                <Input
                  key={key}
                  label={c[key]}
                  name={key}
                  type={key === 'email' ? 'email' : 'text'}
                  required
                  maxLength={key === 'email' ? 254 : 100}
                  autoComplete={key === 'depositorName' ? 'off' : key}
                  value={customer[key]}
                  onChange={(e) => setCustomer({ ...customer, [key]: e.target.value })}
                />
              ))}
              {['currentLevel', 'targetLevel'].map((key) => (
                <label className="field" key={key}>
                  <span className="field-label">{c[key]}</span>
                  <select
                    value={customer[key]}
                    onChange={(e) => setCustomer({ ...customer, [key]: e.target.value })}
                  >
                    {(key === 'currentLevel'
                      ? ['first', '1', '2', '3', '4', '5', '6']
                      : ['3', '4', '5', '6']
                    ).map((level) => (
                      <option key={level} value={level}>
                        {level === 'first'
                          ? c.first
                          : language === 'ko'
                            ? `${level}급`
                            : `Level ${level}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <Input
                label={c.examDate}
                type="date"
                value={customer.examDate}
                onChange={(e) => setCustomer({ ...customer, examDate: e.target.value })}
              />
            </div>
          </fieldset>
          {product.questionNumbers.map((n) => (
            <fieldset disabled={busy} key={n}>
              <legend>TOPIK II {n}</legend>
              <Textarea
                label={`${n} · ${c.question}`}
                required
                maxLength={10000}
                rows={5}
                value={answers[n].questionText}
                onChange={(e) => setAnswer(n, 'questionText', e.target.value)}
              />
              <Textarea
                label={`${n} · ${c.answer}`}
                maxLength={10000}
                rows={9}
                value={answers[n].answerText}
                onChange={(e) => setAnswer(n, 'answerText', e.target.value)}
              />
              <Input
                label={`${n} · ${c.image}`}
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => setAnswer(n, 'file', e.target.files?.[0] || null)}
              />
              <p>{c.imageHint}</p>
            </fieldset>
          ))}
          <fieldset disabled={busy}>
            <legend>{c.consentTitle}</legend>
            <p>{c.privacy}</p>
            <label className="feedback-consent">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>{c.consent}</span>
            </label>
            <p>{c.faq[5][1]}</p>
          </fieldset>
          <div className="correction-submit">
            <strong>
              {productName(product, language)} · {priceLabel(product.price)}
            </strong>
            <p>{c.sla}</p>
            <Button type="submit" loading={busy}>
              {busy ? c.submitting : c.submit}
            </Button>
            {error ? (
              <p className="field-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </form>
      </main>
    </Layout>
  )
}
