import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { getSavings, addSavings, deleteSavings } from '../api/client'

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

  const monthlyData = (() => {
    const map = {}
    savings.forEach((g) => {
      g.records.forEach((r) => {
        const month = dayjs(r.date).format('YYYY년 MM월')
        if (!map[month]) map[month] = { total: 0, breakdown: {} }
        map[month].total += r.amount
        map[month].breakdown[g.name] = (map[month].breakdown[g.name] || 0) + r.amount
      })
    })
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  })()

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
          <input
            type="text"
            placeholder="적금 이름 (예: 청년적금)"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            list="savings-names"
          />
          <datalist id="savings-names">
            {savings.map((g) => <option key={g.name} value={g.name} />)}
          </datalist>
          <input
            type="number"
            placeholder="금액"
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            min="0"
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
          />
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? '저장 중...' : '저장'}
          </button>
        </form>
      )}

      {savings.length === 0 && !showForm && (
        <p className="savings-empty">등록된 적금이 없습니다. 입금 버튼을 눌러 추가하세요.</p>
      )}

      {monthlyData.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>📅 월별 입금 현황</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {monthlyData.map(([month, data]) => (
              <div key={month} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: Object.keys(data.breakdown).length > 1 ? 6 : 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{month}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{fmt(data.total)}</span>
                </div>
                {Object.keys(data.breakdown).length > 1 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                    {Object.entries(data.breakdown).map(([name, amount]) => (
                      <span key={name} style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {name} {fmt(amount)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="savings-list">
        {savings.map((group) => (
          <div key={group.name} className="savings-group">
            <div
              className="savings-group-header"
              onClick={() => setExpandedNames((prev) => {
                const next = new Set(prev)
                next.has(group.name) ? next.delete(group.name) : next.add(group.name)
                return next
              })}
            >
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
