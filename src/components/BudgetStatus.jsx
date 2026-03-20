import { useState, useEffect } from 'react'
import { getBudgets } from '../api/client'

export default function BudgetStatus({ transactions }) {
  const [budgets, setBudgets] = useState([])

  useEffect(() => {
    getBudgets().then((res) => setBudgets(res.data))
  }, [])

  if (!budgets.length) return null

  const spentByCategory = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
      return acc
    }, {})

  const items = budgets.map((b) => {
    const budget = Number(b.amount)
    const spent = spentByCategory[b.category] || 0
    const remaining = budget - spent
    const ratio = budget > 0 ? Math.min(spent / budget, 1) : 0
    const pct = Math.round(ratio * 100)
    return { ...b, budget, spent, remaining, pct }
  })

  const barColor = (pct) => {
    if (pct >= 100) return '#ef4444'
    if (pct >= 80) return '#f97316'
    return '#22c55e'
  }

  return (
    <div className="card card-section">
      <h2 style={{ margin: '0 0 20px', fontSize: 16, color: 'var(--text-primary)' }}>예산 현황</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map((item) => (
          <div key={item.category}>
            <div className="budget-status-header">
              <span className="budget-status-name">{item.category}</span>
              <div className="budget-status-info">
                <span className="budget-status-amounts">
                  {item.spent.toLocaleString()}원
                  <span style={{ color: 'var(--text-muted)', margin: '0 3px' }}>/</span>
                  {item.budget.toLocaleString()}원
                </span>
                <span className={`budget-status-badge ${item.remaining < 0 ? 'over' : 'remain'}`}>
                  {item.remaining < 0
                    ? `초과 ${Math.abs(item.remaining).toLocaleString()}원`
                    : `잔여 ${item.remaining.toLocaleString()}원`}
                </span>
                <span style={{ color: barColor(item.pct), fontWeight: 700, minWidth: 32, textAlign: 'right', fontSize: 12 }}>
                  {item.pct}%
                </span>
              </div>
            </div>
            <div style={{ height: 7, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${item.pct}%`,
                background: barColor(item.pct),
                borderRadius: 99,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
