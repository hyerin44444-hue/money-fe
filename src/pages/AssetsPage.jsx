import { useState, useEffect } from 'react'
import { getSavings, getStocks, getCash, createCash, updateCash, deleteCash } from '../api/client'
import dayjs from 'dayjs'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const fmt = (n) => Number(n).toLocaleString('ko-KR') + '원'
const EMPTY_FORM = { category: '', amount: '', note: '', date: dayjs().format('YYYY-MM-DD') }

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
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [savRes, stRes, cashRes] = await Promise.all([getSavings(), getStocks(), getCash()])
      const stTotal = stRes.data.reduce((s, st) => s + (st.current_value || 0), 0)
      setSavingsTotal(savRes.data.reduce((s, g) => s + g.total, 0))
      setStocksTotal(stTotal)
      setCashList(cashRes.data)
      setTrend(buildTrend(savRes.data, cashRes.data, stTotal))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const cashTotal = cashList.reduce((s, c) => s + Number(c.amount), 0)
  const total = savingsTotal + stocksTotal + cashTotal

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
        </div>
      ))}

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
