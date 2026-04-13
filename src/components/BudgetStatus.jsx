import { useState, useEffect } from 'react'
import { getBudgets } from '../api/client'

export default function BudgetStatus({ transactions }) {
  const [budgets, setBudgets] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)

  useEffect(() => {
    getBudgets().then((res) => setBudgets(res.data))
  }, [])

  if (!budgets.length) return null

  const expenseTransactions = transactions.filter((t) => t.type === 'expense')

  const spentByCategory = expenseTransactions.reduce((acc, t) => {
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

  const selectedItem = selectedCategory
    ? items.find((i) => i.category === selectedCategory)
    : null

  const categoryTransactions = selectedCategory
    ? expenseTransactions
        .filter((t) => t.category === selectedCategory)
        .sort((a, b) => b.date.localeCompare(a.date))
    : []

  return (
    <div className="card card-section">
      <h2 style={{ margin: '0 0 20px', fontSize: 16, color: 'var(--text-primary)' }}>예산 현황</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map((item) => (
          <div
            key={item.category}
            onClick={() => setSelectedCategory(item.category)}
            style={{ cursor: 'pointer' }}
          >
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

      {selectedCategory && selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedCategory(null)}>
          <div
            className="modal"
            style={{ maxWidth: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{selectedCategory} 예산 내역</h2>
              <button
                onClick={() => setSelectedCategory(null)}
                style={{
                  background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
                  color: 'var(--text-muted)', padding: '0 4px', lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10, marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>예산 </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedItem.budget.toLocaleString()}원</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>사용 </span>
                <span style={{ fontWeight: 700, color: barColor(selectedItem.pct) }}>{selectedItem.spent.toLocaleString()}원</span>
              </div>
              <div style={{ fontSize: 13 }}>
                <span className={`budget-status-badge ${selectedItem.remaining < 0 ? 'over' : 'remain'}`}>
                  {selectedItem.remaining < 0
                    ? `초과 ${Math.abs(selectedItem.remaining).toLocaleString()}원`
                    : `잔여 ${selectedItem.remaining.toLocaleString()}원`}
                </span>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {categoryTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  이번 달 지출 내역이 없습니다.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {categoryTransactions.map((t, idx) => (
                    <div
                      key={t.id || idx}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 4px',
                        borderBottom: idx < categoryTransactions.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {t.note || '-'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {t.date}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#ef4444', whiteSpace: 'nowrap' }}>
                        -{Number(t.amount).toLocaleString()}원
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
