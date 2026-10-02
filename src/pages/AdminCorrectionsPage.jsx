import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { Button, Input } from '../components/ui'
import { correctionRequest, prepareFile } from '../lib/correctionApi'
import { CORRECTION_PRODUCTS, priceLabel } from '../lib/correctionProducts'
const filters = {
  all: '전체',
  pending: '입금 대기',
  confirmed: '입금 확인',
  submitted: '첨삭 대기',
  in_review: '첨삭 중',
  completed: '첨삭 완료',
  sent: '발송 완료',
}
const statusLabels = { ...filters, not_sent: '미발송' }
export default function AdminCorrectionsPage() {
  // Short-lived token lives in memory only. Reloading requires administrator authentication.
  const [token, setToken] = useState(''),
    [secret, setSecret] = useState(''),
    [orders, setOrders] = useState([]),
    [selectedId, setSelectedId] = useState(null),
    [filter, setFilter] = useState('all'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('')
  const selected = orders.find((o) => o.id === selectedId)
  function fail(e) {
    setError(e.message)
    if (e.status === 401) {
      setToken('')
      setOrders([])
      setSelectedId(null)
    }
  }
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    correctionRequest('/api/admin-corrections', { token, signal: controller.signal })
      .then((data) => setOrders(data.orders))
      .catch((e) => {
        if (!controller.signal.aborted) fail(e)
      })
    return () => controller.abort()
  }, [token])
  async function login(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await correctionRequest('/api/admin-corrections?action=auth', {
        method: 'POST',
        body: { secret },
      })
      setSecret('')
      setToken(data.token)
    } catch (e) {
      fail(e)
    } finally {
      setSecret('')
      setBusy(false)
    }
  }
  async function refresh() {
    setBusy(true)
    setError('')
    try {
      setOrders((await correctionRequest('/api/admin-corrections', { token })).orders)
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }
  async function update(body, file) {
    if (!selected || busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const data = await correctionRequest(
        `/api/admin-corrections?id=${selected.id}${file ? '&action=report' : ''}`,
        {
          method: file ? 'POST' : 'PATCH',
          token,
          body: file ? await prepareFile(file, true) : body,
        },
      )
      setOrders((current) => current.map((o) => (o.id === data.order.id ? data.order : o)))
      setNotice('저장되었습니다.')
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }
  async function download(kind, question) {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(
        `/api/admin-corrections?id=${selected.id}&action=file&kind=${kind}&question=${question || ''}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!response.ok)
        throw Object.assign(new Error('파일을 불러오지 못했습니다.'), { status: response.status })
      const blob = await response.blob(),
        url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        kind === 'report' ? 'report.pdf' : blob.type === 'image/png' ? 'answer.png' : 'answer.jpg'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Layout simple>
      <main className="correction-page page-width" lang="ko">
        <header className="correction-heading">
          <span className="correction-kicker">TEACHER CORRECTION · ADMIN</span>
          <h1>관리자 주문 관리</h1>
        </header>
        {error ? (
          <p role="alert" className="field-error">
            {error}
          </p>
        ) : null}
        {notice ? <p role="status">{notice}</p> : null}
        {!token ? (
          <form className="card admin-login" onSubmit={login}>
            <Input
              label="관리자 Secret"
              type="password"
              required
              autoComplete="off"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <Button type="submit" loading={busy}>
              관리자 인증
            </Button>
            <p>관리자 인증은 30분 동안 유효합니다. 새로고침하면 다시 인증합니다.</p>
          </form>
        ) : (
          <>
            <div className="admin-toolbar">
              <label className="field">
                <span>주문 필터</span>
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  {Object.entries(filters).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <Button variant="outline" onClick={refresh} disabled={busy}>
                목록 새로고침
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setToken('')
                  setOrders([])
                  setSelectedId(null)
                  setNotice('')
                }}
              >
                관리자 로그아웃
              </Button>
            </div>
            <div className="admin-orders">
              {orders
                .filter(
                  (o) =>
                    filter === 'all' ||
                    [o.paymentStatus, o.correctionStatus, o.deliveryStatus].includes(filter),
                )
                .map((o) => (
                  <article
                    className={`card admin-order ${o.id === selectedId ? 'selected' : ''}`}
                    key={o.id}
                  >
                    <h2>
                      {o.customer.name} · {CORRECTION_PRODUCTS[o.productId].name}
                    </h2>
                    <p>{o.customer.email}</p>
                    <p>{o.id}</p>
                    <p>
                      {new Date(o.createdAt).toLocaleString('ko-KR')} · {priceLabel(o.amount)}
                    </p>
                    <p>
                      {statusLabels[o.paymentStatus]} · {statusLabels[o.correctionStatus]} · PDF{' '}
                      {o.report ? '있음' : '없음'} · {statusLabels[o.deliveryStatus]}
                    </p>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setSelectedId(o.id)
                        setNotice('')
                      }}
                    >
                      주문 상세 보기
                    </Button>
                  </article>
                ))}
              {!orders.length ? <p>신청된 주문이 없습니다.</p> : null}
            </div>
            {selected ? (
              <section className="card admin-detail" key={selected.id}>
                <h2>주문 상세 · {selected.customer.name}</h2>
                <p>
                  {selected.customer.email} · {priceLabel(selected.amount)}
                </p>
                <p>
                  현재 급수: {selected.customer.currentLevel} / 목표 급수:{' '}
                  {selected.customer.targetLevel}
                </p>
                <p>
                  시험 예정일: {selected.customer.examDate || '미정'} / 입금자명:{' '}
                  {selected.customer.depositorName}
                </p>
                <p>신청 시간: {selected.createdAt}</p>
                {selected.submissions.map((s) => (
                  <article key={s.questionNumber}>
                    <h3>{s.questionNumber}번 문제</h3>
                    <p className="preserve-lines">{s.questionText}</p>
                    <h3>{s.questionNumber}번 답안</h3>
                    <p className="preserve-lines">{s.answerText || '(이미지 제출)'}</p>
                    {s.attachments.length ? (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => download('answer', s.questionNumber)}
                      >
                        답안 이미지 다운로드 · {s.questionNumber}
                      </Button>
                    ) : null}
                  </article>
                ))}
                <div className="admin-toolbar">
                  <Button
                    disabled={busy || selected.paymentStatus === 'confirmed'}
                    onClick={() => update({ paymentStatus: 'confirmed' })}
                  >
                    입금 확인
                  </Button>
                  <Button
                    disabled={
                      busy ||
                      selected.paymentStatus !== 'confirmed' ||
                      selected.correctionStatus !== 'submitted'
                    }
                    onClick={() => update({ correctionStatus: 'in_review' })}
                  >
                    첨삭 시작
                  </Button>
                </div>
                <Input
                  label="PDF 리포트 업로드 (최대 3MB)"
                  type="file"
                  accept="application/pdf"
                  disabled={
                    busy ||
                    selected.paymentStatus !== 'confirmed' ||
                    selected.deliveryStatus === 'sent'
                  }
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void update(null, file)
                    e.target.value = ''
                  }}
                />
                {selected.report ? (
                  <p>
                    PDF 업로드: {selected.report.uploadedAt}{' '}
                    <Button variant="outline" disabled={busy} onClick={() => download('report')}>
                      PDF 다운로드
                    </Button>
                  </p>
                ) : null}
                <div className="admin-toolbar">
                  <Button
                    disabled={busy || !selected.report || selected.correctionStatus === 'completed'}
                    onClick={() => update({ correctionStatus: 'completed' })}
                  >
                    첨삭 완료
                  </Button>
                  <Button
                    disabled={
                      busy ||
                      !selected.report ||
                      selected.correctionStatus !== 'completed' ||
                      selected.deliveryStatus === 'sent'
                    }
                    onClick={() => update({ deliveryStatus: 'sent' })}
                  >
                    Gmail로 직접 보냈습니다 · 발송 완료
                  </Button>
                </div>
                <p>
                  PDF를 다운로드하여 Gmail에서 고객 이메일로 직접 발송한 뒤 발송 완료를 눌러 주세요.
                  이 버튼은 이메일을 보내지 않습니다.
                </p>
                {selected.sentAt ? <p>발송 완료 기록: {selected.sentAt}</p> : null}
                <details>
                  <summary>변경 이력</summary>
                  <ul>
                    {selected.statusHistory.map((entry, i) => (
                      <li key={i}>
                        {entry.at} · {entry.type} {entry.value}
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            ) : null}
          </>
        )}
      </main>
    </Layout>
  )
}
