import GraphQuestion from '../components/GraphQuestion'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { Button, Input, Textarea } from '../components/ui'
import { useLanguage } from '../i18n/LanguageContext'
import { correctionCopy } from '../i18n/correctionCopy'
import { CORRECTION_PRODUCTS, productName, priceLabel } from '../lib/correctionProducts'
import { correctionRequest, prepareFile } from '../lib/correctionApi'
import { useApp } from '../context/AppContext'
import {
  correctionPrompts,
  correctionQuestionText,
  correctionSavedAnswer,
  randomCorrectionAnswer,
} from '../lib/correctionPrompts'
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
  const { answers: savedAnswers, isInitializing } = useApp()
  const linkedId = query.get('answerId')
  const linkedApplied = useRef(false)
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    currentLevel: 'first',
    targetLevel: '3',
    examDate: '',
    depositorName: '',
  })
  const [answers, setAnswers] = useState(() => ({
    53: linkedId
      ? { source: 'external', questionText: '', answerText: '', file: null }
      : randomCorrectionAnswer(53),
    54: linkedId
      ? { source: 'external', questionText: '', answerText: '', file: null }
      : randomCorrectionAnswer(54),
  }))
  const [pendingChange, setPendingChange] = useState(null)
  useEffect(() => {
    if (!linkedId || linkedApplied.current || isInitializing) return
    linkedApplied.current = true
    const answer = savedAnswers.find(
      (item) => item.id === linkedId && [53, 54].includes(item.promptNumber),
    )
    if (answer) {
      setAnswers((current) => ({
        ...current,
        [answer.promptNumber]: correctionSavedAnswer(answer),
        [answer.promptNumber === 53 ? 54 : 53]: randomCorrectionAnswer(
          answer.promptNumber === 53 ? 54 : 53,
        ),
      }))
      if (query.get('product') !== 'bundle') setProduct(`q${answer.promptNumber}`)
    }
  }, [linkedId, savedAnswers, isInitializing, query])
  function applySource(n, source) {
    linkedApplied.current = true
    let next
    if (source === 'random') {
      next = randomCorrectionAnswer(
        n,
        answers[n].source.startsWith('prompt:') ? answers[n].source.slice(7) : undefined,
      )
    } else if (source.startsWith('answer:')) {
      const answer = savedAnswers.find(
        (item) => `answer:${item.id}` === source && item.promptNumber === n,
      )
      if (!answer) return
      next = correctionSavedAnswer(answer)
    } else {
      next = { source: 'external', questionText: '', answerText: '', file: null }
    }
    setAnswers((current) => ({ ...current, [n]: next }))
    setPendingChange(null)
  }
  function selectSource(n, source) {
    if (
      answers[n].answerText.trim() ||
      answers[n].file ||
      (answers[n].source === 'external' && answers[n].questionText.trim())
    ) {
      setPendingChange({ number: n, source })
    } else applySource(n, source)
  }
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const attempt = useRef(null),
    submitting = useRef(false)
  const product = CORRECTION_PRODUCTS[productId]
  function providedPrompt(n) {
    const source = answers[n].source
    const promptId = source.startsWith('answer:')
      ? savedAnswers.find((answer) => `answer:${answer.id}` === source)?.promptId
      : source.startsWith('prompt:')
        ? source.slice(7)
        : null
    return correctionPrompts(n).find((prompt) => prompt.id === promptId)
  }
  const graphPrompt = providedPrompt(53)
  const essayPrompt = providedPrompt(54)
  const setAnswer = (n, key, value) =>
    setAnswers((current) => ({ ...current, [n]: { ...current[n], [key]: value } }))
  const problemField = (n) => (
    <Textarea
      label={`${n} · ${c.question}`}
      required
      readOnly={Boolean(providedPrompt(n))}
      maxLength={10000}
      rows={5}
      value={answers[n].questionText}
      onChange={(e) => {
        linkedApplied.current = true
        setAnswer(n, 'questionText', e.target.value)
      }}
    />
  )
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
          {linkedId && !isInitializing && !savedAnswers.some((item) => item.id === linkedId) ? (
            <p role="status">{c.savedUnavailable}</p>
          ) : null}
          {product.questionNumbers.map((n) => (
            <fieldset disabled={busy} key={n}>
              <legend>TOPIK II {n}</legend>
              <label className="field">
                <span className="field-label">
                  {n} · {c.problemSource}
                </span>
                <select
                  value={
                    answers[n].source.startsWith('prompt:')
                      ? 'random'
                      : answers[n].source.startsWith('answer:')
                        ? 'saved'
                        : 'external'
                  }
                  disabled={Boolean(linkedId && isInitializing)}
                  onChange={(e) =>
                    selectSource(
                      n,
                      e.target.value === 'saved'
                        ? `answer:${savedAnswers.find((answer) => answer.promptNumber === n).id}`
                        : e.target.value,
                    )
                  }
                >
                  <option value="random">{c.randomProblem}</option>
                  {savedAnswers.some((answer) => answer.promptNumber === n) ? (
                    <option value="saved">{c.savedAnswers}</option>
                  ) : null}
                  <option value="external">{c.externalProblem}</option>
                </select>
              </label>
              {answers[n].source.startsWith('answer:') ? (
                <label className="field">
                  <span className="field-label">
                    {n} · {c.savedAnswers}
                  </span>
                  <select
                    value={answers[n].source}
                    onChange={(e) => selectSource(n, e.target.value)}
                  >
                    {savedAnswers
                      .filter((answer) => answer.promptNumber === n)
                      .map((answer) => (
                        <option key={answer.id} value={`answer:${answer.id}`}>
                          {answer.title} · {answer.promptDate || answer.createdAt?.slice(0, 10)}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}
              {answers[n].source.startsWith('prompt:') ? (
                <div className="random-problem-controls">
                  <p role="status">{c.randomAssigned}</p>
                  <Button type="button" variant="outline" onClick={() => selectSource(n, 'random')}>
                    {n} · {c.randomNext}
                  </Button>
                </div>
              ) : null}
              {pendingChange?.number === n ? (
                <div className="random-problem-confirm">
                  <p role="alert">{c.resetAnswerWarning}</p>
                  <Button type="button" onClick={() => applySource(n, pendingChange.source)}>
                    {c.confirmProblemChange}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setPendingChange(null)}>
                    {c.cancelProblemChange}
                  </Button>
                </div>
              ) : null}
              <p>{c.problemHint}</p>
              {n === 53 && graphPrompt ? (
                <>
                  <GraphQuestion prompt={graphPrompt} />
                  <p>{c.graphSourceNote}</p>
                </>
              ) : null}
              {n === 54 && essayPrompt ? (
                <section className="exam-essay-question">
                  <h2>{essayPrompt.title}</h2>
                  <p>{essayPrompt.topic}</p>
                  <p>{essayPrompt.description}</p>
                  <ol>
                    {essayPrompt.questions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ol>
                  <small>{essayPrompt.source}</small>
                </section>
              ) : null}
              {answers[n].source.startsWith('answer:') && !answers[n].questionText ? (
                <p role="status">{c.originalMissing}</p>
              ) : null}
              {providedPrompt(n) ? (
                <details className="random-problem-text">
                  <summary>{c.originalProblemText}</summary>
                  {problemField(n)}
                </details>
              ) : (
                problemField(n)
              )}
              <Textarea
                label={`${n} · ${c.answer}`}
                maxLength={10000}
                rows={9}
                value={answers[n].answerText}
                onChange={(e) => {
                  linkedApplied.current = true
                  setAnswer(n, 'answerText', e.target.value)
                }}
              />
              <Input
                key={answers[n].source}
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
