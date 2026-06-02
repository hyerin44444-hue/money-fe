import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { getSavings, addSavings, deleteSavings } from '../api/client'

const GOAL_TARGET = 5_000_000
const THIS_YEAR = dayjs().year()

export default function SavingsCard() {
  const [savings, setSavings] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', amount: '', date: dayjs().format('YYYY-MM-DD') })
  const [submitting, setSubmitting] = useState(false)
  const [expandedNames, setExpandedNames] = useState(new Set())

  const fetchSavings = async () => {
    const res = await getSavings()
    setSavings(res.data)
  }

  useEffect(() => { fetchSavings() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.amount) return
    setSubmitting(true)
    try {
      await addSavings({ name: form.name.trim(), amount: parseFloat(form.amount), date: form.date })
      setForm({ name: '', amount: '', date: dayjs().format('YYYY-MM-DD') })
      setShowForm(false)
      await fetchSavings()
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`"${name}" 항목을 삭제하시겠습니까?`)) return
    await deleteSavings(id)
    await fetchSavings()
  }

  const grandTotal = savings.reduce((s, g) => s + g.total, 0)
  const fmt = (n) => Number(n).toLocaleString('ko-KR') + '원'

  const monthlyMap = {}
  savings.forEach((g) => {
    g.records.forEach((r) => {
      const key = dayjs(r.date).format('YYYY년 MM월')
      if (!monthlyMap[key]) monthlyMap[key] = { total: 0, breakdown: {} }
      monthlyMap[key].total += r.amount
      monthlyMap[key].breakdown[g.name] = (monthlyMap[key].breakdown[g.name] || 0) + r.amount
    })
  })
  const goalMonths = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const key = `${THIS_YEAR}년 ${String(m).padStart(2, '0')}월`
    const actual = monthlyMap[key]?.total || 0
    return { key, actual, achieved: actual >= GOAL_TARGET }
  })
  const achievedCount = goalMonths.filter((m) => m.achieved).length

  return (
    <div className="savings-card">
      <div className="savings-header">
        <div>
          <span className="savings-title">💰 적금 현황</span>
          <span className="savings-grand-total">{fmt(grandTotal)}</span>
        </div>
        <button className="btn primary" onClick={() => setShowForm((p) => !p)}>
          {showForm ? '닫기' : '+ 입금'}
        </button>
      </div>

      {showForm && (
        <form className="savings-form" onSubmit={handleSubmit}>
          <input type="text" placeholder="적금 이름 (예: 청년적금)" value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} list="savings-names" />
          <datalist id="savings-names">
            {savings.map((g) => <option key={g.name} value={g.name} />)}
          </datalist>
          <input type="number" placeholder="금액" value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} min="0" />
          <input type="date" value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? '저장 중...' : '저장'}
          </button>
        </form>
      )}

      {savings.length === 0 && !showForm && (
        <p className="savings-empty">등록된 적금이 없습니다. 입금 버튼을 눌러 추가하세요.</p>
      )}

      {/* 올해 달성 현황 */}
      <div style={{ marginBottom: 20, padding: 14, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>🎯 {THIS_YEAR}년 달성 현황</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            월 목표 <strong>{fmt(GOAL_TARGET)}</strong> · {achievedCount}/12개월
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {goalMonths.map(({ key, actual, achieved }) => {
            const pct = Math.min((actual / GOAL_TARGET) * 100, 100)
            const breakdown = monthlyMap[key]?.breakdown || {}
            return (
              <div key={key} style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: `1px solid ${achieved ? '#bbf7d0' : actual > 0 ? '#fecaca' : 'var(--border)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: actual > 0 ? 4 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13 }}>{achieved ? '✅' : actual > 0 ? '❌' : '–'}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{key}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: achieved ? '#16a34a' : actual > 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                    {actual > 0 ? fmt(actual) : '미입금'}
                    {!achieved && actual > 0 && (
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(-{fmt(GOAL_TARGET - actual)})</span>
                    )}
                  </span>
                </div>
                {actual > 0 && (
                  <>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: achieved ? '#22c55e' : '#f87171', borderRadius: 4 }} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                      {Object.entries(breakdown).map(([name, amount]) => (
                        <span key={name} style={{ fontSize: 11, color: 'var(--text-muted)' }}>{name} {fmt(amount)}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="savings-list">
        {savings.map((group) => (
          <div key={group.name} className="savings-group">
            <div className="savings-group-header" onClick={() => setExpandedNames((prev) => {
              const next = new Set(prev)
              next.has(group.name) ? next.delete(group.name) : next.add(group.name)
              return next
            })}>
              <div className="savings-group-info">
                <span className="savings-group-name">{group.name}</span>
                <span className="savings-group-count">{group.records.length}회 입금</span>
              </div>
              <div className="savings-group-right">
                <span className="savings-group-total">{fmt(group.total)}</span>
                <span className="savings-chevron">{expandedNames.has(group.name) ? '▲' : '▼'}</span>
              </div>
            </div>
            {expandedNames.has(group.name) && (
              <div className="savings-records">
                {group.records.map((r) => (
                  <div key={r.id} className="savings-record">
                    <span className="sr-date">{dayjs(r.date).format('YYYY.MM.DD')}</span>
                    <span className="sr-amount">+{fmt(r.amount)}</span>
                    <button className="btn-icon danger" onClick={() => handleDelete(r.id, r.name)}>🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
