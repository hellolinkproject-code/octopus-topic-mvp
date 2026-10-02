import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { Button } from '../components/ui'
import { useLanguage } from '../i18n/LanguageContext'
import { correctionCopy } from '../i18n/correctionCopy'
import { correctionRequest } from '../lib/correctionApi'
import { priceLabel } from '../lib/correctionProducts'
export default function CorrectionCompletePage() {
  const { orderId } = useParams(),
    { language, path } = useLanguage(),
    c = correctionCopy(language)
  const [order, setOrder] = useState(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setOrder(null)
    setError('')
    correctionRequest(`/api/corrections?id=${encodeURIComponent(orderId)}`, {
      signal: controller.signal,
    })
      .then(setOrder)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message)
      })
    return () => controller.abort()
  }, [orderId, retry])
  return (
    <Layout>
      <main className="correction-page page-width narrow">
        {order ? (
          <>
            <span className="correction-kicker">APPLICATION RECEIVED</span>
            <h1>{c.complete}</h1>
            <section className="card completion-card">
              <h2>{language === 'ko' ? order.productName : order.productNameEn}</h2>
              <dl>
                <dt>{c.order}</dt>
                <dd>{order.orderId}</dd>
                <dt>{c.amount}</dt>
                <dd className="correction-price">{priceLabel(order.amount)}</dd>
              </dl>
              <h3>{c.bank}</h3>
              {order.bank ? (
                <p className="bank-details">
                  {order.bank.name}
                  <br />
                  {order.bank.account}
                  <br />
                  {order.bank.holder}
                </p>
              ) : (
                <p role="status">{c.bankMissing}</p>
              )}
              <p>{c.depositorNote}</p>
            </section>
            <h2>{c.afterPayment}</h2>
            <p>{c.completeSla}</p>
            <Link className="button button-outline" to={path('/writing')}>
              {c.practice}
            </Link>
          </>
        ) : error ? (
          <div role="alert">
            <h1>{c.order}</h1>
            <p>{error}</p>
            <Button onClick={() => setRetry((n) => n + 1)}>{c.retry}</Button>
          </div>
        ) : (
          <p role="status">{c.loading}</p>
        )}
      </main>
    </Layout>
  )
}
