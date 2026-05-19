import { useState, useEffect } from 'react'
import { getStocks, createStock, updateStock, deleteStock } from '../api/client'

const EMPTY_FORM = { name: '', ticker: '', quantity: '', avg_price: '' }

const fmt = (n) => n == null ? '-' : Number(n).toLocaleString('ko-KR')
const fmtRate = (r) => r == null ? '-' : `${r > 0 ? '+' : ''}${r.toFixed(2)}%`

export default function StocksPage() {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const fetchStocks = async () => {
    setLoading(true)
    try {
      const res = await getStocks()
      setStocks(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStocks() }, [])

  const totalPurchase = stocks.reduce((s, st) => s + (st.purchase_value || 0), 0)
  const totalCurrent  = stocks.reduce((s, st) => s + (st.current_value || 0), 0)
  const totalProfit   = totalCurrent - totalPurchase
  const totalRate     = totalPurchase > 0 ? (totalProfit / totalPurchase * 100) : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.ticker || !form.quantity || !form.avg_price) return
    setSubmitting(true)
    setError('')
    try {
      const data = {
        name: form.name.trim(),
        ticker: form.ticker.trim().toUpperCase(),
        quantity: parseFloat(form.quantity),
        avg_price: parseFloat(form.avg_price),
      }
      if (editId) {
        await updateStock(editId, data)
      } else {
        await createStock(data)
      }
      setForm(EMPTY_FORM)
      setEditId(null)
      setShowForm(false)
      await fetchStocks()
    } catch (e) {
      setError(e.response?.data?.detail || '저장 실패')
    } finally {
      setSubmitting(false) }
  }

  const handleEdit = (st) => {
    setForm({ name: st.name, ticker: st.ticker, quantity: String(st.quantity), avg_price: String(st.avg_price) })
    setEditId(st.id)
    setShowForm(true)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`"${name}" 종목을 삭제하시겠습니까?`)) return
    await deleteStock(id)
    await fetchStocks()
  }

  const handleCancel = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(false)
    setError('')
  }

  return (
    <div className="page">

      {/* 총 평가 요약 */}
      <div className="card card-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>주식 포트폴리오</h2>
          <button className="btn primary" onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM) }}>+ 종목 추가</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: '매입금액', value: `${fmt(totalPurchase)}원`, color: 'var(--text-primary)' },
            { label: '평가금액', value: `${fmt(Math.round(totalCurrent))}원`, color: 'var(--text-primary)' },
            { label: '평가손익', value: `${totalProfit >= 0 ? '+' : ''}${fmt(Math.round(totalProfit))}원 (${fmtRate(totalRate)})`, color: totalProfit >= 0 ? 'var(--green)' : 'var(--red)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 종목 폼 */}
        {showForm && (
          <form onSubmit={handleSubmit} style={{ background: 'var(--bg)', borderRadius: 10, padding: '16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-row">
                <label>종목명</label>
                <input placeholder="예) 삼성전자" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-row">
                <label>티커</label>
                <input placeholder="예) 005930.KS / AAPL" value={form.ticker} onChange={(e) => setForm(p => ({ ...p, ticker: e.target.value }))} required />
              </div>
              <div className="form-row">
                <label>보유수량</label>
                <input type="number" placeholder="0" min="0" step="any" value={form.quantity} onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))} required />
              </div>
              <div className="form-row">
                <label>평균매입가 (원)</label>
                <input type="number" placeholder="0" min="0" step="any" value={form.avg_price} onChange={(e) => setForm(p => ({ ...p, avg_price: e.target.value }))} required />
              </div>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn secondary" onClick={handleCancel}>취소</button>
              <button type="submit" className="btn primary" disabled={submitting}>{submitting ? '저장 중...' : editId ? '수정' : '추가'}</button>
            </div>
          </form>
        )}

        {/* 종목 목록 */}
        {loading ? (
          <div className="loading-msg">시세 조회 중...</div>
        ) : stocks.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 13 }}>등록된 종목이 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stocks.map((st) => {
              const isProfit = st.profit != null && st.profit >= 0
              const profitColor = st.profit == null ? 'var(--text-muted)' : isProfit ? 'var(--green)' : 'var(--red)'
              return (
                <div key={st.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{st.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{st.ticker}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn secondary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => handleEdit(st)}>수정</button>
                      <button className="btn-icon danger" onClick={() => handleDelete(st.id, st.name)}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      { label: '보유수량', value: `${st.quantity}주` },
                      { label: '평균매입가', value: `${fmt(st.avg_price)}원` },
                      { label: '현재가', value: st.current_price ? `${fmt(Math.round(st.current_price))}원` : '조회 실패' },
                      { label: '평가금액', value: st.current_value ? `${fmt(Math.round(st.current_value))}원` : '-' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>평가손익</span>
                    <span style={{ fontWeight: 700, color: profitColor }}>
                      {st.profit == null ? '-' : `${st.profit >= 0 ? '+' : ''}${fmt(Math.round(st.profit))}원`}
                    </span>
                    <span style={{ fontWeight: 700, color: profitColor }}>{fmtRate(st.profit_rate)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 티커 입력 도움말 */}
      <div className="card card-section">
        <h2 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-secondary)' }}>티커 입력 방법</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          {[
            ['🇰🇷 KOSPI', '005930.KS (삼성전자)'],
            ['🇰🇷 KOSDAQ', '035720.KQ (카카오)'],
            ['🇺🇸 미국주식', 'AAPL (애플)'],
            ['🇺🇸 미국주식', 'TSLA (테슬라)'],
          ].map(([label, example]) => (
            <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 12px' }}>
              <span style={{ fontWeight: 600 }}>{label}</span><br />
              <span style={{ color: 'var(--text-muted)' }}>{example}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
