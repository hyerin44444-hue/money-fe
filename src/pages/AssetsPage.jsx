import { useState, useEffect } from 'react'
import { getSavings, getStocks, getCash, createCash, updateCash, deleteCash, getGoldPrice, getGold, createGold, updateGold, deleteGold } from '../api/client'
import dayjs from 'dayjs'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const fmt = (n) => Number(n).toLocaleString('ko-KR') + '원'
const EMPTY_FORM = { category: '', amount: '', note: '', date: dayjs().format('YYYY-MM-DD') }
const EMPTY_GOLD_FORM = { grams: '', buy_price_per_gram: '', note: '', date: dayjs().format('YYYY-MM-DD') }

function buildTrend(savingsGroups, cashList, stocksTotal) {
  const months = Array.from({ length: 12 }, (_, i) =>
    dayjs().subtract(11 - i, 'month').format('YYYY-MM')
  )

  // 적금: 해당 월까지 누계
  const allSavingsRecords = savingsGroups.flatMap((g) => g.records)

  // 현금: 해당 월까지 누계
  return months.map((ym) => {
    const savAcc = allSavingsRecords
      .filter((r) => r.date.slice(0, 7) <= ym)
      .reduce((s, r) => s + Number(r.amount), 0)

    const cashAcc = cashList
      .filter((c) => (c.date || '').slice(0, 7) <= ym)
      .reduce((s, c) => s + Number(c.amount), 0)

    const isCurrentMonth = ym === dayjs().format('YYYY-MM')

    return {
      month: ym.slice(5) + '월',
      적금: Math.round(savAcc),
      현금: Math.round(cashAcc),
      주식: isCurrentMonth ? Math.round(stocksTotal) : null,
      total: Math.round(savAcc + cashAcc + (isCurrentMonth ? stocksTotal : 0)),
    }
  })
}

export default function AssetsPage() {
  const [savingsTotal, setSavingsTotal] = useState(0)
  const [stocksTotal, setStocksTotal] = useState(0)
  const [cashList, setCashList] = useState([])
  const [goldList, setGoldList] = useState([])
  const [goldPrice, setGoldPrice] = useState(null)
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showGoldForm, setShowGoldForm] = useState(false)
  const [goldForm, setGoldForm] = useState(EMPTY_GOLD_FORM)
  const [goldEditId, setGoldEditId] = useState(null)
  const [goldSubmitting, setGoldSubmitting] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [savRes, stRes, cashRes, goldRes, goldPriceRes] = await Promise.all([
        getSavings(), getStocks(), getCash(), getGold(), getGoldPrice().catch(() => ({ data: null }))
      ])
      const stTotal = stRes.data.reduce((s, st) => s + (st.current_value || 0), 0)
      setSavingsTotal(savRes.data.reduce((s, g) => s + (g.non_stock_total ?? g.total), 0))
      setStocksTotal(stTotal)
      setCashList(cashRes.data)
      setGoldList(goldRes.data)
      setGoldPrice(goldPriceRes.data)
      setTrend(buildTrend(savRes.data, cashRes.data, stTotal))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const cashTotal = cashList.reduce((s, c) => s + Number(c.amount), 0)
  const goldTotal = goldPrice
    ? goldList.reduce((s, g) => s + g.grams * goldPrice.sell_per_gram, 0)
    : goldList.reduce((s, g) => s + g.grams * g.buy_price_per_gram, 0)
  const total = savingsTotal + stocksTotal + cashTotal + goldTotal

  const handleGoldSubmit = async (e) => {
    e.preventDefault()
    setGoldSubmitting(true)
    try {
      // 입력값은 원/돈 기준 → 저장은 원/g (÷3.75)
      const data = {
        ...goldForm,
        grams: parseFloat(goldForm.grams),
        buy_price_per_gram: parseFloat(goldForm.buy_price_per_gram) / 3.75,
      }
      if (goldEditId) await updateGold(goldEditId, data)
      else await createGold(data)
      setGoldForm(EMPTY_GOLD_FORM); setGoldEditId(null); setShowGoldForm(false)
      await fetchAll()
    } finally { setGoldSubmitting(false) }
  }

  const handleGoldEdit = (g) => {
    // DB는 원/g → 폼에는 원/돈으로 역변환 (×3.75)
    setGoldForm({ grams: String(g.grams), buy_price_per_gram: String(Math.round(g.buy_price_per_gram * 3.75)), note: g.note || '', date: g.date })
    setGoldEditId(g.id); setShowGoldForm(true)
  }

  const handleGoldDelete = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    await deleteGold(id); await fetchAll()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.category || !form.amount) return
    setSubmitting(true); setError('')
    try {
      const data = { ...form, amount: parseFloat(form.amount) }
      if (editId) await updateCash(editId, data)
      else await createCash(data)
      setForm(EMPTY_FORM); setEditId(null); setShowForm(false)
      await fetchAll()
    } catch (e) {
      setError(e.response?.data?.detail || '저장 실패')
    } finally { setSubmitting(false) }
  }

  const handleEdit = (c) => {
    setForm({ category: c.category, amount: String(c.amount), note: c.note || '', date: c.date || dayjs().format('YYYY-MM-DD') })
    setEditId(c.id); setShowForm(true)
  }

  const handleDelete = async (id, cat) => {
    if (!confirm(`"${cat}" 항목을 삭제하시겠습니까?`)) return
    await deleteCash(id); await fetchAll()
  }

  const handleCancel = () => {
    setForm(EMPTY_FORM); setEditId(null); setShowForm(false); setError('')
  }

  const assets = [
    { label: '적금', value: savingsTotal, color: '#4f86f7', icon: '🏦' },
    { label: '주식', value: stocksTotal,  color: '#22c55e', icon: '📈' },
    { label: '현금', value: cashTotal,    color: '#f59e0b', icon: '💵' },
    { label: '금',   value: goldTotal,    color: '#eab308', icon: '🪙' },
  ]

  return (
    <div className="page">

      {/* 총 자산 */}
      <div className="card card-section" style={{ textAlign: 'center', padding: '28px 24px' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px' }}>총 자산</p>
        <p style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: -1 }}>
          {loading ? '계산 중...' : fmt(Math.round(total))}
        </p>
      </div>

      {/* 순자산 추이 그래프 */}
      {!loading && trend.length > 0 && (
        <div className="card card-section">
          <h2 style={{ margin: '0 0 16px', fontSize: 15 }}>순자산 추이 (12개월)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gSav" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f86f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f86f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gStock" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v >= 100000000 ? `${(v / 100000000).toFixed(0)}억` : v >= 10000 ? `${Math.round(v / 10000)}만` : v}
                width={40}
              />
              <Tooltip
                formatter={(v, name) => [v != null ? fmt(v) : '-', name]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="적금" stroke="#4f86f7" fill="url(#gSav)" strokeWidth={2} connectNulls />
              <Area type="monotone" dataKey="현금" stroke="#f59e0b" fill="url(#gCash)" strokeWidth={2} connectNulls />
              <Area type="monotone" dataKey="주식" stroke="#22c55e" fill="url(#gStock)" strokeWidth={2} connectNulls dot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'right' }}>
            * 주식은 현재 시세 기준 (이번달만 표시)
          </p>
        </div>
      )}

      {/* 자산 항목별 */}
      {assets.map(({ label, value, color, icon }) => (
        <div key={label} className="card card-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{label}</span>
              {label === '금' && goldList.length > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
                  {(goldList.reduce((s, g) => s + g.grams, 0) / 3.75).toFixed(2)}돈
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color }}>
                {loading && label !== '현금' ? '...' : fmt(Math.round(value))}
              </span>
              {label === '현금' && (
                <button className="btn primary" style={{ padding: '4px 12px', fontSize: 13 }}
                  onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM) }}>
                  + 추가
                </button>
              )}
              {label === '금' && !goldPrice && !loading && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>시세 로딩 중...</span>
              )}
            </div>
          </div>

          {/* 비중 바 */}
          {!loading && total > 0 && (
            <div style={{ marginBottom: label === '현금' ? 12 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
                <span>비중</span>
                <span>{((value / total) * 100).toFixed(1)}%</span>
              </div>
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(value / total) * 100}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          )}

          {/* 현금 내역 목록 */}
          {label === '현금' && cashList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {cashList.map((c, idx) => (
                <div key={c.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', background: 'var(--bg)', borderRadius: 8,
                  borderBottom: idx < cashList.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{c.category}</span>
                    {c.note && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>{c.note}</span>}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{c.date}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#f59e0b' }}>{fmt(c.amount)}</span>
                    <button className="btn secondary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleEdit(c)}>수정</button>
                    <button className="btn-icon danger" onClick={() => handleDelete(c.id, c.category)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {label === '현금' && cashList.length === 0 && !loading && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: '8px 0 0' }}>
              현금 내역을 추가해주세요.
            </p>
          )}

          {/* 금 시세 및 내역 */}
          {label === '금' && (
            <>
              {goldPrice && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 100, background: 'var(--bg)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>살때 (1돈)</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#ef4444' }}>{Number(Math.round(goldPrice.buy_per_gram * 3.75)).toLocaleString('ko-KR')}원</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 100, background: 'var(--bg)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>팔때 (1돈)</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#2563eb' }}>{Number(Math.round(goldPrice.sell_per_gram * 3.75)).toLocaleString('ko-KR')}원</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 100, background: 'var(--bg)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>국제금가</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>${goldPrice.gold_usd_oz}</div>
                  </div>
                </div>
              )}
              {goldList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {goldList.map((g) => {
                    const currentVal = goldPrice ? g.grams * goldPrice.sell_per_gram : null
                    const buyVal = g.grams * g.buy_price_per_gram
                    const profit = currentVal != null ? currentVal - buyVal : null
                    const profitPct = profit != null ? (profit / buyVal) * 100 : null
                    return (
                      <div key={g.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 10px', background: 'var(--bg)', borderRadius: 8,
                      }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{g.grams}g ({(g.grams / 3.75).toFixed(2)}돈)</span>
                          {g.note && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>{g.note}</span>}
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                            매입 {Number(Math.round(g.buy_price_per_gram * 3.75)).toLocaleString('ko-KR')}원/돈 · {g.date}
                          </div>
                          {profit != null && (
                            <div style={{ fontSize: 11, marginTop: 1, color: profit >= 0 ? 'var(--stock-up)' : 'var(--stock-down)' }}>
                              {profit >= 0 ? '+' : ''}{fmt(Math.round(profit))} ({profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%)
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#eab308' }}>
                              {currentVal != null ? fmt(Math.round(currentVal)) : fmt(Math.round(buyVal))}
                            </div>
                          </div>
                          <button className="btn secondary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleGoldEdit(g)}>수정</button>
                          <button className="btn-icon danger" onClick={() => handleGoldDelete(g.id)}>🗑️</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {goldList.length === 0 && !loading && !goldPrice && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0 8px' }}>
                  금 보유량을 추가해주세요.
                </p>
              )}
              <button className="btn primary" style={{ width: '100%', fontSize: 13 }}
                onClick={() => { setGoldForm(EMPTY_GOLD_FORM); setGoldEditId(null); setShowGoldForm(true) }}>
                + 추가
              </button>
            </>
          )}
        </div>
      ))}

      {/* 금 추가/수정 팝업 */}
      {showGoldForm && (
        <div className="modal-overlay" onClick={() => { setShowGoldForm(false); setGoldEditId(null); setGoldForm(EMPTY_GOLD_FORM) }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>{goldEditId ? '금 수정' : '금 추가'}</h2>
              <button onClick={() => { setShowGoldForm(false); setGoldEditId(null); setGoldForm(EMPTY_GOLD_FORM) }}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleGoldSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-row">
                <label>보유량 (g)</label>
                <input type="number" placeholder="예) 3.75" step="0.001" min="0"
                  value={goldForm.grams}
                  onChange={(e) => setGoldForm(p => ({ ...p, grams: e.target.value }))} required />
              </div>
              <div className="form-row">
                <label>매입가 (원/돈)</label>
                <input type="number" placeholder="예) 200000" min="0"
                  value={goldForm.buy_price_per_gram}
                  onChange={(e) => setGoldForm(p => ({ ...p, buy_price_per_gram: e.target.value }))} required />
              </div>
              <div className="form-row">
                <label>날짜</label>
                <input type="date" value={goldForm.date}
                  onChange={(e) => setGoldForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>메모</label>
                <input placeholder="선택 입력" value={goldForm.note}
                  onChange={(e) => setGoldForm(p => ({ ...p, note: e.target.value }))} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn secondary"
                  onClick={() => { setShowGoldForm(false); setGoldEditId(null); setGoldForm(EMPTY_GOLD_FORM) }}>취소</button>
                <button type="submit" className="btn primary" disabled={goldSubmitting}>
                  {goldSubmitting ? '저장 중...' : goldEditId ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 현금 추가/수정 팝업 */}
      {showForm && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>{editId ? '현금 수정' : '현금 추가'}</h2>
              <button onClick={handleCancel} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-row">
                <label>카테고리</label>
                <input placeholder="예) 통장잔액, 지갑, 비상금" value={form.category}
                  onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} required />
              </div>
              <div className="form-row">
                <label>금액 (원)</label>
                <input type="number" placeholder="0" min="0" value={form.amount}
                  onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} required />
              </div>
              <div className="form-row">
                <label>날짜</label>
                <input type="date" value={form.date}
                  onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>메모</label>
                <input placeholder="선택 입력" value={form.note}
                  onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))} />
              </div>
              {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={handleCancel}>취소</button>
                <button type="submit" className="btn primary" disabled={submitting}>
                  {submitting ? '저장 중...' : editId ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
