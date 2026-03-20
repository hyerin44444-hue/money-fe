import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { getMonthlySummary, getSavings } from '../api/client'

const fmt = (n) => {
  if (!n) return '0'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만`
  return n.toLocaleString()
}

export default function MonthlyOverview({ year, currentMonth }) {
  const [rows, setRows] = useState([])
  const today = dayjs()

  useEffect(() => {
    Promise.all([getMonthlySummary(year), getSavings()]).then(([summaryRes, savingsRes]) => {
      // 월별 적금 합산
      const savingsByMonth = {}
      savingsRes.data.forEach((group) => {
        group.records.forEach((r) => {
          const m = parseInt(r.date.split('-')[1], 10)
          const y = parseInt(r.date.split('-')[0], 10)
          if (y === year) savingsByMonth[m] = (savingsByMonth[m] || 0) + Number(r.amount)
        })
      })

      setRows(
        summaryRes.data.map((item) => ({
          month: item.month,
          income: item.income,
          expense: item.expense,
          savings: savingsByMonth[item.month] || 0,
        }))
      )
    })
  }, [year])

  return (
    <div className="card card-section">
      <h2 style={{ margin: '0 0 16px', fontSize: 16, color: 'var(--text-primary)' }}>{year}년 월별 현황</h2>
      <div className="monthly-grid">
        {rows.map((r) => {
          const isCurrentMonth = r.month === currentMonth && year === today.year()
          const hasData = r.income > 0 || r.expense > 0 || r.savings > 0
          return (
            <div
              key={r.month}
              className={`monthly-cell${isCurrentMonth ? ' monthly-cell-current' : ''}`}
              style={{ background: isCurrentMonth ? '#fff5f2' : hasData ? '#fff' : '#fafafa' }}
            >
              <p className="monthly-cell-month">{r.month}월</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className="monthly-cell-row">
                  <span>수입</span>
                  <span style={{ color: r.income > 0 ? 'var(--green)' : 'var(--text-muted)' }}>{fmt(r.income)}</span>
                </div>
                <div className="monthly-cell-row">
                  <span>지출</span>
                  <span style={{ color: r.expense > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{fmt(r.expense)}</span>
                </div>
                <div className="monthly-cell-row">
                  <span>적금</span>
                  <span style={{ color: r.savings > 0 ? '#4f86f7' : 'var(--text-muted)' }}>{fmt(r.savings)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
