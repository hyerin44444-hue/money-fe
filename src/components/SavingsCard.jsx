import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { getSavings, addSavings, deleteSavings } from '../api/client'

const GOAL_KEY = 'savings-goal'
const EMPTY_GOAL = { startYear: '', startMonth: '', endYear: '', endMonth: '', target: '' }

function loadGoal() {
  try { return JSON.parse(localStorage.getItem(GOAL_KEY)) || null } catch { return null }
}

export default function SavingsCard() {
  const [savings, setSavings] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', amount: '', date: dayjs().format('YYYY-MM-DD') })
  const [submitting, setSubmitting] = useState(false)
  const [expandedNames, setExpandedNames] = useState(new Set())
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goal, setGoal] = useState(loadGoal)
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL)

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

  const handleSaveGoal = (e) => {
    e.preventDefault()
    const g = {
      startYear: parseInt(goalForm.startYear),
      startMonth: parseInt(goalForm.startMonth),
      endYear: parseInt(goalForm.endYear),
      endMonth: parseInt(goalForm.endMonth),
      target: parseFloat(goalForm.target),
    }
    localStorage.setItem(GOAL_KEY, JSON.stringify(g))
    setGoal(g)
    setShowGoalForm(false)
  }

  const handleEditGoal = () => {
    if (goal) setGoalForm({
      startYear: String(goal.startYear), startMonth: String(goal.startMonth),
      endYear: String(goal.endYear), endMonth: String(goal.endMonth),
      target: String(goal.target),
    })
    setShowGoalForm(true)
  }

  const handleDeleteGoal = () => {
    localStorage.removeItem(GOAL_KEY)
    setGoal(null)
    setShowGoalForm(false)
  }

  const grandTotal = savings.reduce((s, g) => s + g.total, 0)
  const fmt = (n) => Number(n).toLocaleString('ko-KR') + '원'

  // 월별 맵 (key: "YYYY년 MM월")
  const monthlyMap = {}
  savings.forEach((g) => {
    g.records.forEach((r) => {
      const key = dayjs(r.date).format('YYYY년 MM월')
      if (!monthlyMap[key]) monthlyMap[key] = { total: 0, breakdown: {} }
      monthlyMap[key].total += r.amount
      monthlyMap[key].breakdown[g.name] = (monthlyMap[key].breakdown[g.name] || 0) + r.amount
    })
  })
  const monthlyData = Object.entries(monthlyMap).sort((a, b) => b[0].localeCompare(a[0]))

  // 목표 달성 현황
  const goalMonths = (() => {
    if (!goal) return []
    const list = []
    let y = goal.startYear, m = goal.startMonth
    while (y < goal.endYear || (y === goal.endYear && m <= goal.endMonth)) {
      const key = `${y}년 ${String(m).padStart(2, '0')}월`
      const actual = monthlyMap[key]?.total || 0
      list.push({ key, actual, achieved: actual >= goal.target })
      if (m === 12) { y++; m = 1 } else m++
    }
    return list
  })()

  const achievedCount = goalMonths.filter((m) => m.achieved).length
  const totalMonths = goalMonths.length

  const years = Array.from({ length: 5 }, (_, i) => dayjs().year() - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="savings-card">
      <div className="savings-header">
        <div>
          <span className="savings-title">💰 적금 현황</span>
          <span className="savings-grand-total">{fmt(grandTotal)}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={handleEditGoal} style={{ fontSize: 13 }}>🎯 목표</button>
          <button className="btn primary" onClick={() => setShowForm((p) => !p)}>
            {showForm ? '닫기' : '+ 입금'}
          </button>
        </div>
      </div>

      {/* 목표 설정 폼 */}
      {showGoalForm && (
        <div style={{ marginBottom: 16, padding: 14, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>🎯 목표 설정</span>
            <button onClick={() => setShowGoalForm(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
          </div>
          <form onSubmit={handleSaveGoal} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>시작 연도</label>
                <select value={goalForm.startYear} onChange={(e) => setGoalForm((p) => ({ ...p, startYear: e.target.value }))} required style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                  <option value="">연도</option>
                  {years.map((y) => <option key={y} value={y}>{y}년</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>시작 월</label>
                <select value={goalForm.startMonth} onChange={(e) => setGoalForm((p) => ({ ...p, startMonth: e.target.value }))} required style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                  <option value="">월</option>
                  {months.map((m) => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>종료 연도</label>
                <select value={goalForm.endYear} onChange={(e) => setGoalForm((p) => ({ ...p, endYear: e.target.value }))} required style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                  <option value="">연도</option>
                  {years.map((y) => <option key={y} value={y}>{y}년</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>종료 월</label>
                <select value={goalForm.endMonth} onChange={(e) => setGoalForm((p) => ({ ...p, endMonth: e.target.value }))} required style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                  <option value="">월</option>
                  {months.map((m) => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>월 목표 금액 (원)</label>
              <input type="number" min="0" placeholder="예) 500000" value={goalForm.target} onChange={(e) => setGoalForm((p) => ({ ...p, target: e.target.value }))} required
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {goal && <button type="button" className="btn secondary" onClick={handleDeleteGoal} style={{ fontSize: 13, color: 'var(--red)' }}>목표 삭제</button>}
              <button type="submit" className="btn primary">저장</button>
            </div>
          </form>
        </div>
      )}

      {/* 목표 달성 현황 */}
      {goal && goalMonths.length > 0 && (
        <div style={{ marginBottom: 20, padding: 14, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>🎯 달성 현황</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              월 목표 <strong>{fmt(goal.target)}</strong>
            </span>
          </div>

          {/* 요약 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {[
              { label: '전체 기간', value: `${totalMonths}개월` },
              { label: '달성', value: `${achievedCount}개월`, color: '#16a34a' },
              { label: '미달성', value: `${totalMonths - achievedCount}개월`, color: achievedCount < totalMonths ? 'var(--red)' : 'var(--text-muted)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* 월별 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {goalMonths.map(({ key, actual, achieved }) => {
              const pct = Math.min((actual / goal.target) * 100, 100)
              return (
                <div key={key} style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: `1px solid ${achieved ? '#bbf7d0' : '#fecaca'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13 }}>{achieved ? '✅' : '❌'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{key}</span>
                    </div>
                    <span style={{ fontSize: 12, color: achieved ? '#16a34a' : 'var(--red)', fontWeight: 700 }}>
                      {fmt(actual)}
                      {!achieved && actual > 0 && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(-{fmt(goal.target - actual)})</span>}
                      {actual === 0 && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(미입금)</span>}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: achieved ? '#22c55e' : '#f87171', borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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

      {monthlyData.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>📅 월별 입금 현황</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {monthlyData.map(([month, data]) => (
              <div key={month} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{month}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{fmt(data.total)}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                  {Object.entries(data.breakdown).map(([name, amount]) => (
                    <span key={name} style={{ fontSize: 11, color: 'var(--text-muted)' }}>{name} {fmt(amount)}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
